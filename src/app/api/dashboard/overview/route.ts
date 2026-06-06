import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { dbErrorMessage } from "@/lib/errors"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: userId, role } = session.user
    let overviewData: Record<string, unknown> = {}

    let vendorId: string | null = null
    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      vendorId = vendor?.id || null
    }

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    if (role === Role.ADMIN) {
      const [activeRfqs, pendingApprovals, poAmountObj, overdueInvoices, totalUsers, totalVendors] =
        await Promise.all([
          prisma.rFQ.count({ where: { status: { in: ["OPEN", "VENDOR_RESPONSES_PENDING"] } } }),
          prisma.approval.count({ where: { status: "PENDING" } }),
          prisma.purchaseOrder.aggregate({
            _sum: { totalAmount: true },
            where: { createdAt: { gte: firstDayOfMonth } },
          }),
          prisma.invoice.count({
            where: {
              status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] },
              dueDate: { lt: now },
            },
          }),
          prisma.user.count(),
          prisma.vendor.count(),
        ])

      overviewData = {
        kpi: [
          { title: "Active RFQs", value: activeRfqs, label: "Open invitations" },
          { title: "Pending Approvals", value: pendingApprovals, label: "Awaiting action" },
          {
            title: "PO Value This Month",
            value: `$${Number(poAmountObj._sum.totalAmount || 0).toLocaleString()}`,
            label: "Spend aggregate",
          },
          { title: "Overdue Invoices", value: overdueInvoices, label: "Action required" },
        ],
        roleStats: { totalUsers, totalVendors },
      }
    } else if (role === Role.PROCUREMENT_OFFICER) {
      const [activeRfqs, pendingQuotes, totalPOs, overdueInvoices] = await Promise.all([
        prisma.rFQ.count({ where: { status: { in: ["OPEN", "VENDOR_RESPONSES_PENDING"] } } }),
        prisma.quotation.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
        prisma.purchaseOrder.count(),
        prisma.invoice.count({
          where: {
            status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] },
            dueDate: { lt: now },
          },
        }),
      ])

      overviewData = {
        kpi: [
          { title: "Active RFQs", value: activeRfqs, label: "Live tenders" },
          { title: "Pending Quotations", value: pendingQuotes, label: "Needs evaluation" },
          { title: "Total Purchase Orders", value: totalPOs, label: "Issued count" },
          { title: "Overdue Invoices", value: overdueInvoices, label: "Awaiting payment" },
        ],
      }
    } else if (role === Role.MANAGER) {
      const [pendingApprovals, totalPOsPending, escalatedApprovals, overdueInvoices] =
        await Promise.all([
          prisma.approval.count({ where: { status: "PENDING", approverId: userId } }),
          prisma.purchaseOrder.count({ where: { status: "DRAFT" } }),
          prisma.approval.count({
            where: { status: "PENDING", comments: { contains: "escalat" } },
          }),
          prisma.invoice.count({
            where: {
              status: { in: ["DRAFT", "SUBMITTED", "APPROVED"] },
              dueDate: { lt: now },
            },
          }),
        ])

      overviewData = {
        kpi: [
          { title: "My Pending Approvals", value: pendingApprovals, label: "Awaiting approval" },
          { title: "Draft POs", value: totalPOsPending, label: "Pending issuance" },
          { title: "Escalated Requests", value: escalatedApprovals, label: "High priority" },
          { title: "Overdue Invoices", value: overdueInvoices, label: "Pending audit" },
        ],
      }
    } else if (role === Role.VENDOR) {
      if (!vendorId) {
        overviewData = {
          kpi: [
            { title: "Assigned RFQs", value: 0, label: "Needs bid" },
            { title: "Submitted Bids", value: 0, label: "Active offers" },
            { title: "POs Received", value: 0, label: "Orders in process" },
            { title: "Paid Invoices", value: 0, label: "Settled payments" },
          ],
          noVendorProfile: true,
        }
      } else {
        const [assignedRfqs, submittedQuotes, posReceived, paidInvoices] = await Promise.all([
          prisma.rFQVendor.count({ where: { vendorId } }),
          prisma.quotation.count({
            where: { vendorId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
          }),
          prisma.purchaseOrder.count({ where: { vendorId } }),
          prisma.invoice.count({ where: { vendorId, status: "PAID" } }),
        ])

        overviewData = {
          kpi: [
            { title: "Assigned RFQs", value: assignedRfqs, label: "Open invitations" },
            { title: "Submitted Bids", value: submittedQuotes, label: "Awaiting decision" },
            { title: "POs Received", value: posReceived, label: "Active contracts" },
            { title: "Paid Invoices", value: paidInvoices, label: "Total paid" },
          ],
        }
      }
    }

    return NextResponse.json({ data: overviewData })
  } catch (error) {
    console.error("Dashboard overview API error:", error)
    return NextResponse.json({ error: dbErrorMessage(error) }, { status: 503 })
  }
}
