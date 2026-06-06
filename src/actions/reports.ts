"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Role } from "@prisma/client"
import { dbErrorMessage } from "@/lib/errors"

export async function getReportsData() {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const role = session.user.role
    if (role === Role.VENDOR) throw new Error("Forbidden")

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const [invoices, purchaseOrders, rfqs, vendors, quotations] = await Promise.all([
      prisma.invoice.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        include: { vendor: { select: { vendorName: true } } },
      }),
      prisma.purchaseOrder.findMany({ where: { createdAt: { gte: sixMonthsAgo } } }),
      prisma.rFQ.count(),
      prisma.vendor.count({ where: { status: "ACTIVE" } }),
      prisma.quotation.count({ where: { status: "SUBMITTED" } }),
    ])

    const monthlyTrend: { name: string; spend: number; orders: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
      monthlyTrend.push({ name: label, spend: 0, orders: 0 })
    }

    invoices.forEach((inv) => {
      const label = `${monthNames[inv.createdAt.getMonth()]} ${inv.createdAt.getFullYear().toString().slice(-2)}`
      const entry = monthlyTrend.find((m) => m.name === label)
      if (entry) entry.spend += Number(inv.grandTotal || inv.amount)
    })

    purchaseOrders.forEach((po) => {
      const label = `${monthNames[po.createdAt.getMonth()]} ${po.createdAt.getFullYear().toString().slice(-2)}`
      const entry = monthlyTrend.find((m) => m.name === label)
      if (entry) entry.orders += 1
    })

    const vendorSpend = new Map<string, { total: number; orders: number; rating: number }>()
    invoices.forEach((inv) => {
      const name = inv.vendor.vendorName
      const existing = vendorSpend.get(name) || { total: 0, orders: 0, rating: 4.0 }
      existing.total += Number(inv.grandTotal || inv.amount)
      existing.orders += 1
      vendorSpend.set(name, existing)
    })

    const vendorPerformance = Array.from(vendorSpend.entries())
      .map(([name, data]) => ({
        name,
        totalSpend: Math.round(data.total),
        orderCount: data.orders,
        rating: data.rating,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)

    const totalSpend = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal || inv.amount), 0)
    const paidInvoices = invoices.filter((inv) => inv.status === "PAID").length
    const pendingInvoices = invoices.filter((inv) => inv.paymentStatus === "PENDING_PAYMENT").length

    return {
      success: true,
      data: {
        summary: {
          totalSpend: Math.round(totalSpend),
          activeVendors: vendors,
          totalRfqs: rfqs,
          submittedQuotations: quotations,
          totalPurchaseOrders: purchaseOrders.length,
          paidInvoices,
          pendingInvoices,
        },
        monthlyTrend,
        vendorPerformance,
      },
    }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error), data: null }
  }
}

export async function exportReportAction(format: "csv" | "pdf") {
  try {
    const result = await getReportsData()
    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to fetch report data")
    }

    const { summary, vendorPerformance, monthlyTrend } = result.data
    const filename = `Procurement_Report_${new Date().toISOString().split("T")[0]}`

    if (format === "csv") {
      const headers = ["Vendor", "Total Spend", "Orders", "Rating"]
      const rows = vendorPerformance.map((v) => [v.name, v.totalSpend, v.orderCount, v.rating])
      const trendHeaders = ["Month", "Spend", "PO Count"]
      const trendRows = monthlyTrend.map((m) => [m.name, m.spend, m.orders])

      const csv = [
        "Procurement Summary Report",
        `Total Spend,${summary.totalSpend}`,
        `Active Vendors,${summary.activeVendors}`,
        `Total RFQs,${summary.totalRfqs}`,
        "",
        "Vendor Performance",
        headers.join(","),
        ...rows.map((r) => r.join(",")),
        "",
        "Monthly Trends",
        trendHeaders.join(","),
        ...trendRows.map((r) => r.join(",")),
      ].join("\n")

      return { success: true, base64Data: Buffer.from(csv).toString("base64"), filename: `${filename}.csv` }
    }

    const textContent = [
      "VendorBridge Procurement Report",
      `Generated: ${new Date().toLocaleString()}`,
      `Total Spend: $${summary.totalSpend.toLocaleString()}`,
      ...vendorPerformance.map((v) => `- ${v.name}: $${v.totalSpend.toLocaleString()}`),
    ].join("\n")

    return {
      success: true,
      base64Data: Buffer.from(textContent).toString("base64"),
      filename: `${filename}.txt`,
    }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error) }
  }
}
