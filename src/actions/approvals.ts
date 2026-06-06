"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Role, RFQStatus, ApprovalStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { recordActivityLog } from "@/lib/audit-logger"
import { dbErrorMessage } from "@/lib/errors"

export interface ApprovalStepInput {
  workflowId: string
  stepId: string
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"
  remarks?: string
}

export async function getApprovalWorkflowDetails(rfqId: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new Error("Unauthorized")
    }

    const { role } = session.user
    if (role === Role.VENDOR) {
      throw new Error("Access Denied: Vendors are not permitted to view approval workflows.")
    }

    let workflow = await prisma.approvalWorkflow.findUnique({
        where: { rfqId },
        include: {
          rfq: true,
          quotation: {
            include: {
              vendor: true,
            },
          },
          steps: {
            include: {
              approver: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })

      // If no workflow exists but a comparison decision has been made, we auto-create it
      if (!workflow) {
        const decision = await prisma.comparisonDecision.findUnique({
          where: { rfqId },
          include: {
            rfq: true,
            selectedQuotation: {
              include: { vendor: true },
            },
          },
        })

        if (decision) {
          // Auto initialize workflow in database
          const managerUsers = await prisma.user.findMany({
            where: { role: Role.MANAGER },
          })

          workflow = await prisma.approvalWorkflow.create({
            data: {
              rfqId,
              quotationId: decision.selectedQuotationId,
              status: "PENDING",
              currentStage: "L1_REVIEW",
              initiatedById: decision.selectedById,
              steps: {
                create: [
                  {
                    approverId: managerUsers[0]?.id || decision.selectedById,
                    stage: "L1_REVIEW",
                    decision: "PENDING",
                  },
                  {
                    approverId: managerUsers[1]?.id || managerUsers[0]?.id || decision.selectedById,
                    stage: "L2_APPROVAL",
                    decision: "PENDING",
                  },
                ],
              },
            },
            include: {
              rfq: true,
              quotation: {
                include: { vendor: true },
              },
              steps: {
                include: { approver: true },
                orderBy: { createdAt: "asc" },
              },
            },
          })
        }
      }

    if (!workflow) {
      return { success: true, workflow: null }
    }

    const formattedWorkflow = {
      ...workflow,
      quotation: {
        ...workflow.quotation,
        grandTotal: Number(workflow.quotation.grandTotal),
        subtotal: Number(workflow.quotation.subtotal),
        taxRate: Number(workflow.quotation.taxRate),
        vendor: {
          ...workflow.quotation.vendor,
          rating: workflow.quotation.vendor.notes?.match(/Rating:\s*([\d.]+)/i)?.[1]
            ? parseFloat(workflow.quotation.vendor.notes.match(/Rating:\s*([\d.]+)/i)![1])
            : 4.0,
          paymentTerms: workflow.quotation.notes?.toLowerCase().includes("net 60") ? "Net 60" : "Net 30",
          deliveryDays: 10,
        },
      },
      steps: workflow.steps.map((step) => ({
        ...step,
        approver: {
          ...step.approver,
          designation: step.stage === "L1_REVIEW" ? "L1 Manager" : "Finance Approver",
        },
      })),
    }

    return { success: true, workflow: formattedWorkflow }
  } catch (error) {
    console.error("getApprovalWorkflowDetails error:", error)
    return { success: false, message: dbErrorMessage(error), workflow: null }
  }
}

export async function processApprovalStep(
  data: ApprovalStepInput
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, message: "Unauthorized: Please sign in." }
    }

    const { id: userId, role } = session.user
    if (role !== Role.ADMIN && role !== Role.MANAGER) {
      return { success: false, message: "Access Denied: Only Managers and Admins can process approval requests." }
    }

    const { workflowId, stepId, decision, remarks } = data

    // Remarks is mandatory for rejection or change requests
    if ((decision === "REJECTED" || decision === "CHANGES_REQUESTED") && (!remarks || remarks.trim().length < 10)) {
      return {
        success: false,
        message: "Remarks Required: Please provide comments detailing the rejection or change request reason (min 10 characters).",
      }
    }

    const step = await prisma.approvalStep.findUnique({
        where: { id: stepId },
        include: { workflow: true },
      })

      if (!step) {
        return { success: false, message: "Approval step not found." }
      }

      if (step.workflow.status !== "PENDING" && step.workflow.status !== "CHANGES_REQUESTED") {
        return { success: false, message: "Workflow is already closed." }
      }

      let isFinalApproval = false
      let nextStageName = ""
      const rfqIdForLog = step.workflow.rfqId

      // Execute transaction
      await prisma.$transaction(async (tx) => {
        // 1. Update active step
        await tx.approvalStep.update({
          where: { id: stepId },
          data: {
            decision,
            remarks: remarks || null,
            approvedAt: decision === "APPROVED" ? new Date() : null,
          },
        })

        if (decision === "APPROVED") {
          // Check if there are subsequent pending steps in the workflow
          const pendingSteps = await tx.approvalStep.findMany({
            where: {
              workflowId,
              decision: "PENDING",
              id: { not: stepId },
            },
            orderBy: { createdAt: "asc" },
          })

          if (pendingSteps.length > 0) {
            // Move to next stage (e.g. L2_APPROVAL)
            const nextStep = pendingSteps[0]
            const nextStage = nextStep.stage
            nextStageName = nextStage

            await tx.approvalWorkflow.update({
              where: { id: workflowId },
              data: { currentStage: nextStage },
            })

            // Notify next approver
            await tx.notification.create({
              data: {
                userId: nextStep.approverId,
                title: "Action Required: Procurement Approval",
                message: `Approval request for RFQ ${step.workflow.rfqId} has passed L1 review. Please perform L2 finance review.`,
                type: "WARNING",
                link: `/dashboard/approvals`,
              },
            })

            // Log activity
            await tx.activityLog.create({
              data: {
                userId,
                action: "RFQ_APPROVAL_STAGE_ADVANCED",
                entityType: "ApprovalWorkflow",
                entityId: workflowId,
                metadata: {
                  stage: nextStage,
                  approvedBy: userId,
                },
              },
            })
          } else {
            isFinalApproval = true
            // Final step approved -> Complete workflow, update RFQ to APPROVED, generate PO & Invoice
            await tx.approvalWorkflow.update({
              where: { id: workflowId },
              data: {
                currentStage: "COMPLETED",
                status: "APPROVED",
              },
            })

            await tx.rFQ.update({
              where: { id: step.workflow.rfqId },
              data: { status: RFQStatus.APPROVED },
            })

            // --- AUTO GENERATION OF PO & INVOICE ---
            const now = new Date()
            const year = now.getFullYear()
            
            const poCount = await tx.purchaseOrder.count()
            const invCount = await tx.invoice.count()
            
            const poNumber = `PO-${year}-${String(poCount + 1).padStart(4, "0")}`
            const invoiceNumber = `INV-${year}-${String(invCount + 1).padStart(4, "0")}`
            
            const quotation = await tx.quotation.findUnique({
              where: { id: step.workflow.quotationId },
            })
            
            if (quotation) {
              const subtotalAmt = quotation.subtotal
              const taxRatePct = quotation.taxRate
              const halfTaxRate = Number(taxRatePct) / 2
              const subtotalNum = Number(subtotalAmt)
              const cgstAmt = (subtotalNum * halfTaxRate) / 100
              const sgstAmt = (subtotalNum * halfTaxRate) / 100
              const grandTotalAmt = quotation.grandTotal
              
              // Create Purchase Order
              const purchaseOrder = await tx.purchaseOrder.create({
                data: {
                  poNumber,
                  rfqId: step.workflow.rfqId,
                  quotationId: step.workflow.quotationId,
                  vendorId: quotation.vendorId,
                  totalAmount: grandTotalAmt,
                  amount: grandTotalAmt,
                  status: "ISSUED",
                  deliveryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // Default 10 days
                }
              })
              
              // Create Invoice
              await tx.invoice.create({
                data: {
                  invoiceNumber,
                  poId: purchaseOrder.id,
                  vendorId: quotation.vendorId,
                  amount: grandTotalAmt,
                  subtotal: subtotalAmt,
                  cgst: cgstAmt,
                  sgst: sgstAmt,
                  grandTotal: grandTotalAmt,
                  status: "SUBMITTED",
                  paymentStatus: "PENDING_PAYMENT",
                  dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days due date
                  generatedAt: now,
                }
              })
            }
            // --- END AUTO GENERATION ---

            // Notify procurement officers
            const staff = await tx.user.findMany({
              where: { role: Role.PROCUREMENT_OFFICER },
            })

            for (const officer of staff) {
              await tx.notification.create({
                data: {
                  userId: officer.id,
                  title: "Approval Completed: RFQ Approved",
                  message: `All stages of approval for RFQ ${step.workflow.rfqId} are complete. You can now issue the Purchase Order.`,
                  type: "SUCCESS",
                  link: `/dashboard/rfqs`,
                },
              })
            }

            // Log activity
            await tx.activityLog.create({
              data: {
                userId,
                action: "RFQ_APPROVAL_WORKFLOW_COMPLETED",
                entityType: "ApprovalWorkflow",
                entityId: workflowId,
                metadata: {
                  rfqId: step.workflow.rfqId,
                  status: "APPROVED",
                },
              },
            })
          }
        } else if (decision === "REJECTED") {
          // Reject -> Update workflow to REJECTED, RFQ status to REJECTED, notify staff, stop workflow
          await tx.approvalWorkflow.update({
            where: { id: workflowId },
            data: {
              currentStage: "REJECTED",
              status: "REJECTED",
            },
          })

          await tx.rFQ.update({
            where: { id: step.workflow.rfqId },
            data: { status: RFQStatus.REJECTED },
          })

          // Notify procurement officers
          const staff = await tx.user.findMany({
            where: { role: Role.PROCUREMENT_OFFICER },
          })

          for (const officer of staff) {
            await tx.notification.create({
              data: {
                userId: officer.id,
                title: "RFQ Rejected: Approval Disapproved",
                message: `Approval request for RFQ ${step.workflow.rfqId} was rejected. Reason: ${remarks}`,
                type: "ERROR",
                link: `/dashboard/rfqs`,
              },
            })
          }

          // Log activity
          await tx.activityLog.create({
            data: {
              userId,
              action: "RFQ_APPROVAL_WORKFLOW_REJECTED",
              entityType: "ApprovalWorkflow",
              entityId: workflowId,
              metadata: {
                rfqId: step.workflow.rfqId,
                remarks,
              },
            },
          })
        }
      })

      if (decision === "APPROVED") {
        if (isFinalApproval) {
          await recordActivityLog({
            userId,
            action: "RFQ_APPROVAL_WORKFLOW_COMPLETED",
            actionType: "Approved",
            module: "Approvals",
            entityId: workflowId,
            description: `All stages of approval for RFQ ${rfqIdForLog} are complete.`,
            metadata: { rfqId: rfqIdForLog }
          })
          
          await recordActivityLog({
            userId,
            action: "INVOICE_GENERATED",
            actionType: "Generated",
            module: "Invoices",
            description: `Purchase Order & Invoice generated automatically for RFQ ${rfqIdForLog}.`,
            metadata: { rfqId: rfqIdForLog }
          })
        } else {
          await recordActivityLog({
            userId,
            action: "RFQ_APPROVAL_STAGE_ADVANCED",
            actionType: "Approved",
            module: "Approvals",
            entityId: workflowId,
            description: `Approval stage review approved. Advanced to ${nextStageName} for RFQ ${rfqIdForLog}.`,
            metadata: { stage: nextStageName }
          })
        }
      } else if (decision === "REJECTED") {
        await recordActivityLog({
          userId,
          action: "RFQ_APPROVAL_WORKFLOW_REJECTED",
          actionType: "Rejected",
          module: "Approvals",
          entityId: workflowId,
          description: `Approval request for RFQ ${rfqIdForLog} was rejected. Reason: ${remarks}`,
          metadata: { rfqId: rfqIdForLog, remarks }
        })
      }

    revalidatePath("/dashboard/rfqs")
    revalidatePath("/dashboard/approvals")
    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/purchase-orders")
    revalidatePath("/dashboard/activity-logs")
    return { success: true, message: `Workflow step successfully updated to ${decision}.` }
  } catch (error) {
    console.error("processApprovalStep error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}
