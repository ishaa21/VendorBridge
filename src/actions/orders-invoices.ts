"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Role, POStatus, InvoiceStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { sendInvoiceEmailWithAttachment } from "@/lib/email"
import { recordActivityLog } from "@/lib/audit-logger"
import { dbErrorMessage } from "@/lib/errors"

export async function getInvoicesList() {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const { role, id: userId } = session.user
    let vendorId: string | null = null

    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      if (!vendor) return { success: true, invoices: [] }
      vendorId = vendor.id
    }

    const invoices = await prisma.invoice.findMany({
      where: vendorId ? { vendorId } : undefined,
      include: { vendor: true, purchaseOrder: true },
      orderBy: { createdAt: "desc" },
    })

    const formattedInvoices = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      poNumber: inv.purchaseOrder.poNumber,
      vendorName: inv.vendor.vendorName,
      grandTotal: Number(inv.grandTotal ?? inv.amount),
      paymentStatus: inv.paymentStatus || "PENDING_PAYMENT",
      dueDate: inv.dueDate,
      createdAt: inv.createdAt,
    }))

    return { success: true, invoices: formattedInvoices }
  } catch (error) {
    console.error("getInvoicesList error:", error)
    return { success: false, message: dbErrorMessage(error), invoices: [] }
  }
}

export async function getPurchaseOrdersList() {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const { role, id: userId } = session.user
    let vendorId: string | null = null

    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      if (!vendor) return { success: true, purchaseOrders: [] }
      vendorId = vendor.id
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: vendorId ? { vendorId } : undefined,
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
    })

    const formattedPOs = pos.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      vendorName: po.vendor.vendorName,
      totalAmount: Number(po.amount ?? po.totalAmount),
      status: po.status,
      createdAt: po.createdAt,
    }))

    return { success: true, purchaseOrders: formattedPOs }
  } catch (error) {
    console.error("getPurchaseOrdersList error:", error)
    return { success: false, message: dbErrorMessage(error), purchaseOrders: [] }
  }
}

export async function getPOAndInvoiceDetails(invoiceId: string) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const { role, id: userId } = session.user

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        vendor: true,
        purchaseOrder: {
          include: {
            rfq: true,
            quotation: { include: { items: true } },
          },
        },
      },
    })

    if (!invoice) throw new Error("Invoice not found.")

    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      if (!vendor || invoice.vendorId !== vendor.id) {
        throw new Error("Access Denied: Vendors can only view their own invoices.")
      }
    }

    const details = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      poId: invoice.poId,
      poNumber: invoice.purchaseOrder.poNumber,
      poDate: invoice.purchaseOrder.createdAt,
      invoiceDate: invoice.generatedAt || invoice.createdAt,
      dueDate: invoice.dueDate,
      paymentStatus: invoice.paymentStatus || "PENDING_PAYMENT",
      vendorName: invoice.vendor.vendorName,
      vendorAddress: invoice.vendor.address,
      vendorGstin: invoice.vendor.gstNumber,
      vendorEmail: invoice.vendor.email,
      organizationName: "VendorBridge ERP Org",
      orgAddress: "Building 5, Cyber City Phase 2, Sector 24, Gurugram, Haryana 122002",
      orgGstin: "06AAACV1111A1Z0",
      items: invoice.purchaseOrder.quotation.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
      subtotal: Number(invoice.subtotal ?? invoice.amount),
      cgst: Number(invoice.cgst ?? 0),
      sgst: Number(invoice.sgst ?? 0),
      grandTotal: Number(invoice.grandTotal ?? invoice.amount),
    }

    return { success: true, details }
  } catch (error) {
    console.error("getPOAndInvoiceDetails error:", error)
    return { success: false, message: dbErrorMessage(error), details: null }
  }
}

export async function markInvoiceAsPaid(invoiceId: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, message: "Unauthorized: Sign in required." }
    }

    const { id: userId, role } = session.user

    if (role !== Role.ADMIN && role !== Role.MANAGER) {
      return { success: false, message: "Access Denied: Only Finance Department & Admins can mark invoices as paid." }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { purchaseOrder: true },
    })

    if (!invoice) return { success: false, message: "Invoice not found." }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: "PAID", status: InvoiceStatus.PAID },
      })

      await tx.purchaseOrder.update({
        where: { id: invoice.poId },
        data: { status: POStatus.DELIVERED },
      })

      const vendorUser = await tx.vendor.findUnique({
        where: { id: invoice.vendorId },
        select: { userId: true },
      })

      if (vendorUser?.userId) {
        await tx.notification.create({
          data: {
            userId: vendorUser.userId,
            title: "Payment Received: Invoice Settled",
            message: `Payment for Invoice ${invoice.invoiceNumber} has been marked as Paid.`,
            type: "SUCCESS",
            link: `/dashboard/invoices`,
          },
        })
      }
    })

    await recordActivityLog({
      userId,
      action: "INVOICE_PAYMENT_MARKED_PAID",
      actionType: "Paid",
      module: "Invoices",
      entityId: invoiceId,
      description: `Invoice ${invoice.invoiceNumber} has been successfully settled and marked as Paid.`,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        poNumber: invoice.purchaseOrder.poNumber,
        vendorId: invoice.vendorId,
      },
    })

    revalidatePath("/dashboard/invoices")
    revalidatePath(`/dashboard/invoices/${invoiceId}`)
    revalidatePath("/dashboard/activity-logs")

    return { success: true, message: "Invoice successfully updated to Paid." }
  } catch (error) {
    console.error("markInvoiceAsPaid error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function emailInvoiceAction(invoiceId: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Unauthorized." }

    const result = await getPOAndInvoiceDetails(invoiceId)
    if (!result.success || !result.details) {
      return { success: false, message: result.message || "Failed to load invoice for emailing." }
    }

    const { details } = result

    const pdfBuffer = await generateInvoicePDF({
      poNumber: details.poNumber,
      invoiceNumber: details.invoiceNumber,
      poDate: new Date(details.poDate).toLocaleDateString(),
      invoiceDate: new Date(details.invoiceDate).toLocaleDateString(),
      dueDate: new Date(details.dueDate).toLocaleDateString(),
      paymentStatus: details.paymentStatus,
      organizationName: details.organizationName,
      orgAddress: details.orgAddress,
      orgGstin: details.orgGstin,
      vendorName: details.vendorName,
      vendorAddress: details.vendorAddress,
      vendorGstin: details.vendorGstin,
      items: details.items,
      subtotal: details.subtotal,
      cgst: details.cgst,
      sgst: details.sgst,
      grandTotal: details.grandTotal,
    })

    const emailRecipient = details.vendorEmail
    const emailResult = await sendInvoiceEmailWithAttachment({
      to: emailRecipient,
      vendorName: details.vendorName,
      invoiceNumber: details.invoiceNumber,
      poNumber: details.poNumber,
      grandTotal: details.grandTotal,
      pdfBuffer,
    })

    if (!emailResult.success) {
      return { success: false, message: `Email delivery failed: ${emailResult.error}` }
    }

    await recordActivityLog({
      userId: session.user.id,
      action: "INVOICE_PDF_EMAILED_TO_VENDOR",
      actionType: "Emailed",
      module: "Invoices",
      entityId: invoiceId,
      description: `Invoice ${details.invoiceNumber} emailed to ${details.vendorName} (${emailRecipient}).`,
      metadata: { invoiceNumber: details.invoiceNumber, recipient: emailRecipient },
    })

    return { success: true, message: "Invoice PDF successfully generated and emailed to vendor." }
  } catch (error) {
    console.error("emailInvoiceAction error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function downloadInvoicePDFAction(invoiceId: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, message: "Unauthorized: Please sign in." }

    const result = await getPOAndInvoiceDetails(invoiceId)
    if (!result.success || !result.details) {
      return { success: false, message: result.message || "Failed to load invoice." }
    }

    const { details } = result
    const pdfBuffer = await generateInvoicePDF({
      poNumber: details.poNumber,
      invoiceNumber: details.invoiceNumber,
      poDate: new Date(details.poDate).toLocaleDateString(),
      invoiceDate: new Date(details.invoiceDate).toLocaleDateString(),
      dueDate: new Date(details.dueDate).toLocaleDateString(),
      paymentStatus: details.paymentStatus,
      organizationName: details.organizationName,
      orgAddress: details.orgAddress,
      orgGstin: details.orgGstin,
      vendorName: details.vendorName,
      vendorAddress: details.vendorAddress,
      vendorGstin: details.vendorGstin,
      items: details.items,
      subtotal: details.subtotal,
      cgst: details.cgst,
      sgst: details.sgst,
      grandTotal: details.grandTotal,
    })

    return {
      success: true,
      pdfBase64: pdfBuffer.toString("base64"),
      poNumber: details.poNumber,
      invoiceNumber: details.invoiceNumber,
    }
  } catch (error) {
    console.error("downloadInvoicePDFAction error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}
