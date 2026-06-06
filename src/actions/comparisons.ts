"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Role, RFQStatus, ApprovalStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { recordActivityLog } from "@/lib/audit-logger"
import { dbErrorMessage } from "@/lib/errors"

export interface ComparisonDecisionInput {
  rfqId: string
  selectedVendorId: string
  selectedQuotationId: string
  recommendationScore: number
  manualOverrideReason?: string
}

function parseRating(notes?: string | null): number {
  const match = notes?.match(/Rating:\s*([\d.]+)/i)
  return match ? parseFloat(match[1]) : 4.0
}

export async function getRFQQuotationsForComparison(rfqId: string) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    if (session.user.role === Role.VENDOR) {
      throw new Error("Access Denied: Vendors are not permitted to view quotation comparisons.")
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { items: true },
    })

    if (!rfq) throw new Error("RFQ not found")

    const quotations = await prisma.quotation.findMany({
      where: {
        rfqId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "APPROVED", "REJECTED"] },
      },
      include: { vendor: true, items: true },
      orderBy: { grandTotal: "asc" },
    })

    const normalizedQuotations = quotations.map((q) => {
      const deliveryDays = q.items.length > 0 ? Math.max(...q.items.map((i) => i.deliveryDays)) : 14

      let paymentTerms = "Net 30"
      const notes = q.notes?.toLowerCase() || ""
      if (notes.includes("net 60") || notes.includes("net-60")) paymentTerms = "Net 60"
      else if (notes.includes("net 15") || notes.includes("net-15")) paymentTerms = "Net 15"

      return {
        ...q,
        grandTotal: Number(q.grandTotal),
        subtotal: Number(q.subtotal),
        taxRate: Number(q.taxRate),
        taxAmount: Number(q.taxAmount),
        vendor: {
          ...q.vendor,
          rating: parseRating(q.vendor.notes),
          paymentTerms,
          deliveryDays,
        },
      }
    })

    return { success: true, rfq, quotations: normalizedQuotations }
  } catch (error) {
    console.error("getRFQQuotationsForComparison error:", error)
    return {
      success: false,
      message: dbErrorMessage(error),
      rfq: null,
      quotations: [],
    }
  }
}

export async function makeComparisonDecision(data: ComparisonDecisionInput) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, message: "Unauthorized: Please sign in." }
    }

    const { id: userId, role } = session.user
    if (role !== Role.ADMIN && role !== Role.PROCUREMENT_OFFICER) {
      return { success: false, message: "Access Denied: Only Admins and Procurement Officers can make comparison decisions." }
    }

    const { rfqId, selectedVendorId, selectedQuotationId, recommendationScore, manualOverrideReason } = data

    const quotations = await prisma.quotation.findMany({
      where: { rfqId, status: "SUBMITTED" },
      orderBy: { grandTotal: "asc" },
    })

    if (quotations.length === 0) {
      return { success: false, message: "No submitted quotations found for this RFQ." }
    }

    const lowestPrice = Number(quotations[0].grandTotal)
    const selectedQuote = quotations.find((q) => q.id === selectedQuotationId)

    if (!selectedQuote) {
      return { success: false, message: "Selected quotation not found." }
    }

    const selectedPrice = Number(selectedQuote.grandTotal)

    if (selectedPrice > lowestPrice && (!manualOverrideReason || manualOverrideReason.trim().length < 10)) {
      return {
        success: false,
        message: "Justification Required: You selected a vendor that is not the lowest cost. Please provide a detailed justification (min 10 characters).",
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.comparisonDecision.create({
        data: {
          rfqId,
          selectedVendorId,
          selectedQuotationId,
          recommendationScore,
          manualOverrideReason: selectedPrice > lowestPrice ? manualOverrideReason : null,
          selectedById: userId,
        },
      })

      await tx.rFQ.update({
        where: { id: rfqId },
        data: { status: RFQStatus.UNDER_REVIEW },
      })

      await tx.quotation.update({
        where: { id: selectedQuotationId },
        data: { status: "SHORTLISTED" },
      })

      const managerUsers = await tx.user.findMany({ where: { role: Role.MANAGER } })
      const approverId = managerUsers.length > 0 ? managerUsers[0].id : userId

      await tx.approval.create({
        data: {
          entityType: "QuotationComparison",
          entityId: rfqId,
          approverId,
          status: ApprovalStatus.PENDING,
          comments:
            selectedPrice > lowestPrice
              ? `Manual override selection. Justification: ${manualOverrideReason}`
              : "Recommendation auto-selection (Lowest Cost).",
        },
      })

      if (managerUsers.length > 0) {
        await tx.notification.createMany({
          data: managerUsers.map((manager) => ({
            userId: manager.id,
            title: "Approval Required: Vendor Selection Decision",
            message: `A vendor has been selected for RFQ ${rfqId}. Grand Total: $${selectedPrice.toLocaleString()}. Please review and sign off.`,
            type: "INFO",
            link: `/dashboard/approvals`,
          })),
        })
      }

      // Create multi-stage approval workflow immediately so managers see it in the list.
      const existingWorkflow = await tx.approvalWorkflow.findUnique({ where: { rfqId } })
      if (!existingWorkflow) {
        await tx.approvalWorkflow.create({
          data: {
            rfqId,
            quotationId: selectedQuotationId,
            status: "PENDING",
            currentStage: "L1_REVIEW",
            initiatedById: userId,
            steps: {
              create: [
                {
                  approverId: managerUsers[0]?.id || userId,
                  stage: "L1_REVIEW",
                  decision: "PENDING",
                },
                {
                  approverId: managerUsers[1]?.id || managerUsers[0]?.id || userId,
                  stage: "L2_APPROVAL",
                  decision: "PENDING",
                },
              ],
            },
          },
        })
      }
    })

    await recordActivityLog({
      userId,
      action: "RFQ_VENDOR_SELECTED",
      actionType: "Selected",
      module: "Quotations",
      entityId: rfqId,
      description: `Vendor selected for RFQ ${rfqId}. Grand Total: $${selectedPrice.toLocaleString()}.`,
      metadata: {
        selectedQuotationId,
        selectedVendorId,
        grandTotal: selectedPrice,
        manualOverride: selectedPrice > lowestPrice,
      },
    })

    revalidatePath("/dashboard/rfqs")
    revalidatePath("/dashboard/quotations")
    revalidatePath("/dashboard/approvals")
    revalidatePath("/dashboard/activity-logs")

    return { success: true, message: "Vendor selection saved and approval request has been triggered successfully." }
  } catch (error) {
    console.error("makeComparisonDecision error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}
