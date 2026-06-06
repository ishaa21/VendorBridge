"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Role } from "@prisma/client"
import { generateActivityReportPDF } from "@/lib/pdf-generator"
import { dbErrorMessage } from "@/lib/errors"

export async function getActivityLogs(filters: {
  search?: string
  module?: string
  dateFrom?: string
  dateTo?: string
  actionType?: string
  page?: number
  limit?: number
}) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const { role, id: userId } = session.user
    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    const roleFilter: Record<string, unknown> = {}
    if (role === Role.MANAGER) {
      roleFilter.module = "Approvals"
    } else if (role === Role.PROCUREMENT_OFFICER) {
      roleFilter.module = { in: ["RFQ", "Quotations", "Vendors"] }
    } else if (role === Role.VENDOR) {
      roleFilter.userId = userId
    }

    const whereClause: Record<string, unknown> = { ...roleFilter }

    if (filters.module && filters.module !== "All") {
      whereClause.module = filters.module
    }

    if (filters.actionType) {
      whereClause.actionType = filters.actionType
    }

    if (filters.search) {
      whereClause.OR = [
        { description: { contains: filters.search } },
        { action: { contains: filters.search } },
      ]
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.createdAt = {}
      if (filters.dateFrom) {
        (whereClause.createdAt as Record<string, Date>).gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        (whereClause.createdAt as Record<string, Date>).lte = new Date(filters.dateTo)
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: whereClause }),
    ])

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      actionType: log.actionType || "Info",
      module: log.module || log.entityType || "System",
      description: log.description || `Performed action ${log.action}`,
      createdAt: log.createdAt,
      user: log.user
        ? {
            firstName: log.user.firstName,
            lastName: log.user.lastName,
            role: log.user.role,
          }
        : {
            firstName: "System",
            lastName: "Engine",
            role: "ADMIN",
          },
    }))

    return {
      success: true,
      logs: formattedLogs,
      total,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error("getActivityLogs error:", error)
    return {
      success: false,
      message: dbErrorMessage(error),
      logs: [],
      total: 0,
      totalPages: 0,
    }
  }
}

export async function exportLogsAction(
  format: "csv" | "excel" | "pdf",
  filters: {
    search?: string
    module?: string
    dateFrom?: string
    dateTo?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const result = await getActivityLogs({ ...filters, page: 1, limit: 1000 })

    if (!result.success || !result.logs) {
      throw new Error(result.message || "Failed to fetch logs for export.")
    }

    const { logs } = result
    let base64Data = ""
    let filename = `Audit_Logs_${new Date().toISOString().split("T")[0]}`

    if (format === "csv") {
      const headers = ["Timestamp", "Module", "Event Type", "Description", "User", "Role"]
      const rows = logs.map((log) => [
        new Date(log.createdAt).toLocaleString(),
        log.module,
        log.actionType,
        `"${log.description.replace(/"/g, '""')}"`,
        `${log.user.firstName} ${log.user.lastName}`,
        log.user.role,
      ])
      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
      base64Data = Buffer.from(csvContent).toString("base64")
      filename += ".csv"
    } else if (format === "excel") {
      const headers = ["Timestamp", "Module", "Event Type", "Description", "User", "Role"]
      const rows = logs.map((log) => [
        new Date(log.createdAt).toLocaleString(),
        log.module,
        log.actionType,
        log.description,
        `${log.user.firstName} ${log.user.lastName}`,
        log.user.role,
      ])
      const tsvContent = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n")
      base64Data = Buffer.from(tsvContent).toString("base64")
      filename += ".xls"
    } else if (format === "pdf") {
      const pdfBuffer = await generateActivityReportPDF(logs)
      base64Data = pdfBuffer.toString("base64")
      filename += ".pdf"
    }

    return { success: true, base64Data, filename }
  } catch (error) {
    console.error("exportLogsAction error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}
