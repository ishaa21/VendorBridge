"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Role, QuotationStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { recordActivityLog } from "@/lib/audit-logger"
import { dbErrorMessage } from "@/lib/errors"
import { z } from "zod"

const quotationItemSchema = z.object({
  itemName: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  deliveryDays: z.number().int().min(1),
})

const quotationSubmitSchema = z.object({
  rfqId: z.string(),
  items: z.array(quotationItemSchema).min(1),
  taxRate: z.number().min(0).max(100),
  notes: z.string().optional(),
  submitNow: z.boolean().default(false),
})

export async function getQuotationsOverview() {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const { id: userId, role } = session.user

    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      if (!vendor) return { success: true, items: [], role }

      const rfqs = await prisma.rFQ.findMany({
        where: {
          invited: { some: { vendorId: vendor.id } },
          status: { in: ["OPEN", "VENDOR_RESPONSES_PENDING"] },
        },
        include: {
          items: true,
          quotations: { where: { vendorId: vendor.id } },
        },
        orderBy: { deadline: "asc" },
      })

      const items = rfqs.map((rfq) => ({
        rfqId: rfq.id,
        rfqNumber: rfq.rfqNumber,
        title: rfq.title,
        category: rfq.category,
        deadline: rfq.deadline,
        status: rfq.status,
        itemsCount: rfq.items.length,
        quotation: rfq.quotations[0] || null,
      }))

      return { success: true, items, role }
    }

    const rfqs = await prisma.rFQ.findMany({
      where: {
        status: { in: ["OPEN", "VENDOR_RESPONSES_PENDING", "UNDER_REVIEW"] },
        quotations: { some: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"] } } },
      },
      include: {
        quotations: {
          where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "APPROVED"] } },
          include: { vendor: { select: { vendorName: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const items = rfqs.map((rfq) => ({
      rfqId: rfq.id,
      rfqNumber: rfq.rfqNumber,
      title: rfq.title,
      category: rfq.category,
      deadline: rfq.deadline,
      status: rfq.status,
      quotationsCount: rfq.quotations.length,
      lowestBid: rfq.quotations.length
        ? Math.min(...rfq.quotations.map((q) => Number(q.grandTotal)))
        : null,
    }))

    return { success: true, items, role }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error), items: [], role: null }
  }
}

export async function getQuotationContext(rfqId: string) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const { id: userId, role } = session.user

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { items: true, invited: { include: { vendor: true } } },
    })

    if (!rfq) return { success: false, message: "RFQ not found", rfq: null, quotation: null }

    let vendorId: string | null = null
    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      if (!vendor) {
        return {
          success: false,
          message: "Complete your vendor profile first. Ask procurement to register your company email.",
          rfq: null,
          quotation: null,
        }
      }

      const invited = rfq.invited.some((inv) => inv.vendorId === vendor.id)
      if (!invited) {
        return { success: false, message: "You are not invited to this RFQ", rfq: null, quotation: null }
      }

      vendorId = vendor.id
    }

    const quotation = vendorId
      ? await prisma.quotation.findUnique({
          where: { rfqId_vendorId: { rfqId, vendorId } },
          include: { items: true },
        })
      : null

    return { success: true, rfq, quotation, vendorId }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error), rfq: null, quotation: null }
  }
}

function generateQuotationNumber(): string {
  const year = new Date().getFullYear()
  const seq = Math.floor(Math.random() * 9000) + 1000
  return `QT-${year}-${seq}`
}

export async function saveQuotation(data: z.infer<typeof quotationSubmitSchema>) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    if (session.user.role !== Role.VENDOR) {
      throw new Error("Only vendors can submit quotations")
    }

    const validated = quotationSubmitSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, message: validated.error.errors[0]?.message || "Validation failed" }
    }

    const { rfqId, items, taxRate, notes, submitNow } = validated.data

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxAmount = (subtotal * taxRate) / 100
    const grandTotal = subtotal + taxAmount

    const vendor = await prisma.vendor.findUnique({ where: { userId: session.user.id } })
    if (!vendor) return { success: false, message: "Vendor profile not found" }

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { invited: true },
    })

    if (!rfq) return { success: false, message: "RFQ not found" }

    const isInvited = rfq.invited.some((inv) => inv.vendorId === vendor.id)
    if (!isInvited) return { success: false, message: "You are not invited to this RFQ" }

    if (new Date(rfq.deadline) < new Date()) {
      return { success: false, message: "RFQ deadline has passed" }
    }

    const status = submitNow ? QuotationStatus.SUBMITTED : QuotationStatus.DRAFT

    const quotation = await prisma.quotation.upsert({
      where: { rfqId_vendorId: { rfqId, vendorId: vendor.id } },
      create: {
        quotationNumber: generateQuotationNumber(),
        rfqId,
        vendorId: vendor.id,
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        notes: notes || null,
        status,
        submittedAt: submitNow ? new Date() : null,
        items: {
          create: items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            deliveryDays: item.deliveryDays,
          })),
        },
      },
      update: {
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        notes: notes || null,
        status,
        submittedAt: submitNow ? new Date() : null,
        items: {
          deleteMany: {},
          create: items.map((item) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            deliveryDays: item.deliveryDays,
          })),
        },
      },
      include: { items: true },
    })

    if (submitNow) {
      await prisma.rFQ.update({
        where: { id: rfqId },
        data: { status: "VENDOR_RESPONSES_PENDING" },
      })

      const officers = await prisma.user.findMany({ where: { role: Role.PROCUREMENT_OFFICER } })
      for (const officer of officers) {
        await prisma.notification.create({
          data: {
            userId: officer.id,
            title: "New quotation received",
            message: `${vendor.vendorName} submitted a quotation for ${rfq.title}`,
            type: "INFO",
            link: `/dashboard/quotations/compare/${rfqId}`,
          },
        })
      }

      await recordActivityLog({
        userId: session.user.id,
        action: "QUOTATION_SUBMITTED",
        actionType: "Submitted",
        module: "Quotations",
        entityId: quotation.id,
        entityType: "Quotation",
        description: `Quotation submitted by ${vendor.vendorName} for ${rfq.title} ($${grandTotal.toLocaleString()})`,
        metadata: { quotationNumber: quotation.quotationNumber, grandTotal },
      })
    }

    revalidatePath("/dashboard/quotations")
    revalidatePath(`/dashboard/quotations/submit/${rfqId}`)
    revalidatePath(`/dashboard/quotations/compare/${rfqId}`)
    revalidatePath("/dashboard/rfqs")
    revalidatePath("/dashboard/activity-logs")

    return {
      success: true,
      message: submitNow ? "Quotation submitted successfully" : "Quotation saved as draft",
      quotationId: quotation.id,
    }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error) }
  }
}
