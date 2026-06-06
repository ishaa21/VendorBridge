"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { rfqSchema, rfqDraftSchema, type RFQFormValues } from "@/lib/validators/rfq"
import { RFQStatus, Role } from "@prisma/client"
import { sendRFQInvitationEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"
import { recordActivityLog } from "@/lib/audit-logger"
import { dbErrorMessage } from "@/lib/errors"

export type RFQActionResult = {
  success: boolean
  message: string
  rfqId?: string
  rfqNumber?: string
  errors?: Record<string, string[]>
}

export async function getActiveVendors() {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const vendors = await prisma.vendor.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        vendorName: true,
        email: true,
        category: true,
        contactPerson: true,
        status: true,
      },
      orderBy: { vendorName: "asc" },
    })
    return { success: true, vendors }
  } catch (error) {
    console.error("getActiveVendors error:", error)
    return { success: false, message: dbErrorMessage(error), vendors: [] }
  }
}

export async function createRFQ(
  data: any,
  submitNow: boolean
): Promise<RFQActionResult> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, message: "Unauthorized: Please sign in." }
    }

    const { id: userId, role } = session.user
    if (role !== Role.ADMIN && role !== Role.PROCUREMENT_OFFICER) {
      return { success: false, message: "Access Denied: Only Admins and Procurement Officers can create RFQs." }
    }

    // Validate using appropriate Zod schema
    const schema = submitNow ? rfqSchema : rfqDraftSchema
    const validated = schema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        message: "Form validation failed.",
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    const { title, category, deadline, description, items = [], vendorIds = [], attachments = [] } = validated.data
    const status = submitNow ? RFQStatus.OPEN : RFQStatus.DRAFT

    // Set fallback values for draft database insert (respecting DB non-null constraints)
    const actualDeadline = deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const actualDescription = description || "Draft Request for Quotation"

    const result = await prisma.$transaction(async (tx) => {
        // Calculate dynamic RFQ Number
        const count = await tx.rFQ.count()
        const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`

        const rfq = await tx.rFQ.create({
          data: {
            rfqNumber,
            title,
            category,
            description: actualDescription,
            deadline: actualDeadline,
            status,
            createdById: userId,
            items: {
              create: items.map((item: any) => ({
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
                estimatedPrice: item.estimatedPrice || null,
                specifications: item.specifications || null,
              })),
            },
            invited: {
              create: vendorIds.map((vId: string) => ({
                vendorId: vId,
              })),
            },
            attachments: {
              create: attachments.map((att: any) => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileType: att.fileType,
              })),
            },
          },
        })

        // Audit Logging
        await tx.activityLog.create({
          data: {
            userId,
            action: submitNow ? "RFQ_CREATED_AND_PUBLISHED" : "RFQ_DRAFT_CREATED",
            entityType: "RFQ",
            entityId: rfq.id,
            metadata: {
              rfqNumber,
              title,
              invitedVendorsCount: vendorIds.length,
              status,
            },
          },
        })

        // Notifications
        if (submitNow) {
          // Notify Procurement Officers / Manager
          const staffUsers = await tx.user.findMany({
            where: { role: { in: [Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.MANAGER] } },
          })

          for (const staff of staffUsers) {
            await tx.notification.create({
              data: {
                userId: staff.id,
                title: `New RFQ Published: ${rfqNumber}`,
                message: `RFQ "${title}" has been published by ${session.user.firstName} with deadline ${actualDeadline.toLocaleDateString()}.`,
                type: "INFO",
                link: `/dashboard/rfqs`,
              },
            })
          }

          // Notify Invited Vendors who have a user account
          const invitedVendors = await tx.vendor.findMany({
            where: { id: { in: vendorIds } },
            include: { user: true },
          })

          for (const vendor of invitedVendors) {
            if (vendor.user) {
              await tx.notification.create({
                data: {
                  userId: vendor.user.id,
                  title: `New RFQ Invitation: ${rfqNumber}`,
                  message: `You have been invited to submit a quotation for "${title}". Deadline: ${actualDeadline.toLocaleDateString()}.`,
                  type: "WARNING",
                  link: `/dashboard/quotations`,
                },
              })
            }
          }
        }

        return { rfqId: rfq.id, rfqNumber }
      })

      // Send Email Invitations (outside transaction to avoid blocking DB lock)
      if (submitNow && vendorIds.length > 0) {
        const invitedVendors = await prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
        })

        for (const vendor of invitedVendors) {
          await sendRFQInvitationEmail({
            to: vendor.email,
            vendorName: vendor.vendorName,
            rfqNumber: result.rfqNumber,
            rfqTitle: title,
            deadline: actualDeadline.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            vendorPortalLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/quotations`,
          })
        }
      }

      await recordActivityLog({
        userId,
        action: submitNow ? "RFQ_CREATED_AND_PUBLISHED" : "RFQ_DRAFT_CREATED",
        actionType: "Created",
        module: "RFQ",
        entityId: result.rfqId,
        description: submitNow 
          ? `RFQ "${title}" (${result.rfqNumber}) was created and published.` 
          : `RFQ "${title}" (${result.rfqNumber}) was saved as draft.`,
        metadata: { rfqNumber: result.rfqNumber, title }
      })

    revalidatePath("/dashboard/rfqs")
    revalidatePath("/dashboard/activity-logs")
    return {
      success: true,
      message: submitNow
        ? `RFQ ${result.rfqNumber} successfully created and sent to vendors.`
        : `RFQ ${result.rfqNumber} saved as draft.`,
      rfqId: result.rfqId,
      rfqNumber: result.rfqNumber,
    }
  } catch (error) {
    console.error("createRFQ error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function getRFQById(id: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new Error("Unauthorized")
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        items: true,
        invited: { include: { vendor: true } },
        attachments: true,
      },
    })
    if (!rfq) return { success: false, message: "RFQ not found" }
    return { success: true, rfq }
  } catch (error) {
    console.error("getRFQById error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function updateRFQ(
  id: string,
  data: any,
  submitNow: boolean
): Promise<RFQActionResult> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, message: "Unauthorized: Please sign in." }
    }

    const { id: userId, role } = session.user
    if (role !== Role.ADMIN && role !== Role.PROCUREMENT_OFFICER) {
      return { success: false, message: "Access Denied: Only Admins and Procurement Officers can modify RFQs." }
    }

    // Validate using appropriate Zod schema
    const schema = submitNow ? rfqSchema : rfqDraftSchema
    const validated = schema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        message: "Form validation failed.",
        errors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    const { title, category, deadline, description, items = [], vendorIds = [], attachments = [] } = validated.data
    const status = submitNow ? RFQStatus.OPEN : RFQStatus.DRAFT

    // Database defaults for drafts to respect DB non-null columns
    const actualDeadline = deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const actualDescription = description || "Draft Request for Quotation"

    const result = await prisma.$transaction(async (tx) => {
        // Check if the RFQ exists
        const existingRfq = await tx.rFQ.findUnique({
          where: { id }
        })

        if (!existingRfq) {
          throw new Error("RFQ not found")
        }

        if (existingRfq.status !== "DRAFT" && role !== Role.ADMIN) {
          throw new Error("Only Draft RFQs can be edited.")
        }

        // Delete existing items, invited vendors, attachments
        await tx.rFQItem.deleteMany({ where: { rfqId: id } })
        await tx.rFQVendor.deleteMany({ where: { rfqId: id } })
        await tx.rFQAttachment.deleteMany({ where: { rfqId: id } })

        // Update RFQ fields and recreate relations
        const updatedRfq = await tx.rFQ.update({
          where: { id },
          data: {
            title,
            category,
            description: actualDescription,
            deadline: actualDeadline,
            status,
            items: {
              create: items.map((item: any) => ({
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
                estimatedPrice: item.estimatedPrice || null,
                specifications: item.specifications || null,
              })),
            },
            invited: {
              create: vendorIds.map((vId: string) => ({
                vendorId: vId,
              })),
            },
            attachments: {
              create: attachments.map((att: any) => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileType: att.fileType,
              })),
            },
          },
        })

        // Audit Logging
        await tx.activityLog.create({
          data: {
            userId,
            action: submitNow ? "RFQ_CREATED_AND_PUBLISHED" : "RFQ_DRAFT_UPDATED",
            entityType: "RFQ",
            entityId: id,
            metadata: {
              rfqNumber: existingRfq.rfqNumber,
              title,
              invitedVendorsCount: vendorIds.length,
              status,
            },
          },
        })

        // Notifications
        if (submitNow) {
          // Notify Procurement Officers / Manager
          const staffUsers = await tx.user.findMany({
            where: { role: { in: [Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.MANAGER] } },
          })

          for (const staff of staffUsers) {
            await tx.notification.create({
              data: {
                userId: staff.id,
                title: `New RFQ Published: ${existingRfq.rfqNumber}`,
                message: `RFQ "${title}" has been published by ${session.user.firstName} with deadline ${actualDeadline.toLocaleDateString()}.`,
                type: "INFO",
                link: `/dashboard/rfqs`,
              },
            })
          }

          // Notify Invited Vendors who have a user account
          const invitedVendors = await tx.vendor.findMany({
            where: { id: { in: vendorIds } },
            include: { user: true },
          })

          for (const vendor of invitedVendors) {
            if (vendor.user) {
              await tx.notification.create({
                data: {
                  userId: vendor.user.id,
                  title: `New RFQ Invitation: ${existingRfq.rfqNumber}`,
                  message: `You have been invited to submit a quotation for "${title}". Deadline: ${actualDeadline.toLocaleDateString()}.`,
                  type: "WARNING",
                  link: `/dashboard/quotations`,
                },
              })
            }
          }
        }

        return { rfqId: id, rfqNumber: existingRfq.rfqNumber }
      })

      // Send Emails outside transaction if publishing
      if (submitNow && vendorIds.length > 0) {
        const invitedVendors = await prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
        })

        for (const vendor of invitedVendors) {
          await sendRFQInvitationEmail({
            to: vendor.email,
            vendorName: vendor.vendorName,
            rfqNumber: result.rfqNumber,
            rfqTitle: title,
            deadline: actualDeadline.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            vendorPortalLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/quotations`,
          })
        }
      }

      await recordActivityLog({
        userId,
        action: submitNow ? "RFQ_CREATED_AND_PUBLISHED" : "RFQ_DRAFT_UPDATED",
        actionType: submitNow ? "Created" : "Edited",
        module: "RFQ",
        entityId: id,
        description: submitNow 
          ? `RFQ "${title}" (${result.rfqNumber}) was published.` 
          : `RFQ "${title}" (${result.rfqNumber}) draft details were updated.`,
        metadata: { rfqNumber: result.rfqNumber, title }
      })

    revalidatePath("/dashboard/rfqs")
    revalidatePath("/dashboard/activity-logs")
    return {
      success: true,
      message: submitNow
        ? `RFQ ${result.rfqNumber} successfully published and sent to vendors.`
        : `RFQ draft updated successfully.`,
      rfqId: id,
      rfqNumber: result.rfqNumber,
    }
  } catch (error) {
    console.error("updateRFQ error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function getRFQsList() {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new Error("Unauthorized")
    }

    const { id: userId, role } = session.user

    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      if (!vendor) return { success: true, rfqs: [] }

      const rfqs = await prisma.rFQ.findMany({
        where: {
          invited: { some: { vendorId: vendor.id } },
          status: { in: ["OPEN", "VENDOR_RESPONSES_PENDING", "CLOSED"] },
        },
        include: {
          items: true,
          attachments: true,
          quotations: { where: { vendorId: vendor.id } },
        },
        orderBy: { deadline: "asc" },
      })
      return { success: true, rfqs }
    }

    const rfqs = await prisma.rFQ.findMany({
      include: {
        items: true,
        invited: { include: { vendor: true } },
        quotations: true,
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, rfqs }
  } catch (error) {
    console.error("getRFQsList error:", error)
    return { success: false, message: dbErrorMessage(error), rfqs: [] }
  }
}
