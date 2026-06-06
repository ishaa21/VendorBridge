import prisma from "@/lib/prisma"

interface LogParams {
  userId?: string | null
  action: string
  actionType: string
  module: string
  entityId?: string | null
  entityType?: string | null
  description: string
  metadata?: unknown
  ipAddress?: string | null
}

export async function recordActivityLog(params: LogParams): Promise<void> {
  const {
    userId,
    action,
    actionType,
    module,
    entityId,
    entityType,
    description,
    metadata,
    ipAddress,
  } = params

  await prisma.activityLog.create({
    data: {
      userId: userId || null,
      action,
      actionType,
      module,
      entityId: entityId || null,
      entityType: entityType || module || null,
      description,
      metadata: metadata ? (metadata as object) : undefined,
      ipAddress: ipAddress || null,
    },
  })

  await autoGenerateNotification(params)
}

async function autoGenerateNotification(params: LogParams) {
  const { actionType, module, description, metadata } = params

  if (module === "Approvals" && actionType === "Approved") {
    const procurementUsers = await prisma.user.findMany({
      where: { role: "PROCUREMENT_OFFICER" },
    })

    for (const p of procurementUsers) {
      await prisma.notification.create({
        data: {
          userId: p.id,
          title: "Approval Workflow Advanced",
          message: description,
          type: "SUCCESS",
          link: "/dashboard/approvals",
        },
      })
    }
  } else if (module === "Invoices" && actionType === "Paid") {
    const meta = metadata as { vendorId?: string } | undefined
    if (meta?.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: meta.vendorId } })
      if (vendor?.userId) {
        await prisma.notification.create({
          data: {
            userId: vendor.userId,
            title: "Invoice Settlement Received",
            message: description,
            type: "SUCCESS",
            link: "/dashboard/invoices",
          },
        })
      }
    }
  } else if (module === "RFQ" && actionType === "Created") {
    const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" } })
    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New RFQ Published",
          message: description,
          type: "INFO",
          link: "/dashboard/rfqs",
        },
      })
    }
  }
}
