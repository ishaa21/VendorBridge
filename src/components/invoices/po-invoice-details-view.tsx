"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Role } from "@prisma/client"
import { toast } from "sonner"
import * as Lucide from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatDate } from "@/lib/utils"
import { markInvoiceAsPaid, emailInvoiceAction, downloadInvoicePDFAction } from "@/actions/orders-invoices"

interface POInvoiceDetailsViewProps {
  details: {
    id: string
    invoiceNumber: string
    poId: string
    poNumber: string
    poDate: Date | string
    invoiceDate: Date | string
    dueDate: Date | string
    paymentStatus: string
    vendorName: string
    vendorAddress: string
    vendorGstin: string
    organizationName: string
    orgAddress: string
    orgGstin: string
    items: Array<{
      id: string
      itemName: string
      quantity: number
      unitPrice: number
      total: number
    }>
    subtotal: number
    cgst: number
    sgst: number
    grandTotal: number
  }
  currentUser: {
    id: string
    role: Role
  }
}

export default function POInvoiceDetailsView({ details, currentUser }: POInvoiceDetailsViewProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionType, setActionType] = useState<"pay" | "email" | "pdf" | null>(null)

  const isFinanceOrAdmin = currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER
  const isVendor = currentUser.role === Role.VENDOR

  // --- Mark Invoice as Paid ---
  const handleMarkAsPaid = async () => {
    setIsSubmitting(true)
    setActionType("pay")
    try {
      const response = await markInvoiceAsPaid(details.id)
      if (response.success) {
        toast.success(response.message)
        router.refresh()
      } else {
        toast.error(response.message)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to mark invoice as paid.")
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // --- Email Invoice to Vendor ---
  const handleEmailInvoice = async () => {
    setIsSubmitting(true)
    setActionType("email")
    try {
      const response = await emailInvoiceAction(details.id)
      if (response.success) {
        toast.success(response.message)
      } else {
        toast.error(response.message)
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred during email delivery.")
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // --- Download PDF Action ---
  const handleDownloadPDF = async () => {
    setIsSubmitting(true)
    setActionType("pdf")
    try {
      const response = await downloadInvoicePDFAction(details.id)
      if (response.success && response.pdfBase64) {
        const linkSource = `data:application/pdf;base64,${response.pdfBase64}`
        const downloadLink = document.createElement("a")
        downloadLink.href = linkSource
        downloadLink.download = `${response.poNumber}_${response.invoiceNumber}.pdf`
        downloadLink.click()
        toast.success("PDF generated and downloaded successfully.")
      } else {
        toast.error(response.message || "Failed to download PDF.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while building the PDF file.")
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // --- Print Document ---
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Native Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: #0f172a !important;
          }
          aside, header, nav, button, .no-print {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .print-dark-text {
            color: #0f172a !important;
          }
          .print-emerald-text {
            color: #059669 !important;
          }
          .print-border {
            border: 1px solid #cbd5e1 !important;
          }
          .print-badge {
            background: #f1f5f9 !important;
            border: 1px solid #94a3b8 !important;
            color: #334155 !important;
          }
        }
      `}</style>

      {/* Top Action Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border/40 pb-4 no-print">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Purchase Order & Invoice</h1>
          <p className="text-xs text-muted-foreground">
            PO Number: <span className="font-mono font-bold text-emerald-500">{details.poNumber}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isFinanceOrAdmin && details.paymentStatus !== "PAID" && (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleMarkAsPaid}
              className="bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold text-xs h-9 cursor-pointer"
            >
              {isSubmitting && actionType === "pay" ? (
                <Lucide.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lucide.CheckSquare className="mr-1.5 h-3.5 w-3.5" />
              )}
              Mark As Paid
            </Button>
          )}

          {!isVendor && (
            <Button
              variant="outline"
              type="button"
              disabled={isSubmitting}
              onClick={handleEmailInvoice}
              className="border-border/60 hover:bg-secondary text-xs h-9 cursor-pointer"
            >
              {isSubmitting && actionType === "email" ? (
                <Lucide.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lucide.Mail className="mr-1.5 h-3.5 w-3.5" />
              )}
              Email Invoice
            </Button>
          )}

          <Button
            variant="outline"
            type="button"
            onClick={handlePrint}
            className="border-border/60 hover:bg-secondary text-xs h-9 cursor-pointer"
          >
            <Lucide.Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>

          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={handleDownloadPDF}
            className="border-border/60 hover:bg-secondary text-xs h-9 cursor-pointer"
          >
            {isSubmitting && actionType === "pdf" ? (
              <Lucide.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lucide.Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Document Body (Printable Area) */}
      <Card className="print-area glass-card border-border/50 shadow-lg p-6 sm:p-8 space-y-8 max-w-4xl mx-auto rounded-xl">
        {/* Document Header Branding */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border/40">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="h-10 w-3 rounded bg-emerald-500 block" />
              <h2 className="text-2xl font-black tracking-tight text-foreground print-dark-text">VendorBridge Corp</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Enterprise Procurement & Supplier Network System
            </p>
          </div>

          <div className="flex flex-col md:items-end gap-2 text-left md:text-right">
            <h3 className="text-lg font-black tracking-wider text-muted-foreground uppercase print-dark-text">PO & Invoice Report</h3>
            
            {/* Payment Status Badge */}
            <span
              className={cn(
                "print-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border w-fit md:ml-auto",
                details.paymentStatus === "PAID"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : details.paymentStatus === "PENDING_PAYMENT"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : details.paymentStatus === "PARTIALLY_PAID"
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  : "bg-red-500/10 text-red-500 border-red-500/20"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
              {details.paymentStatus.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Company Addresses Split Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-border/20 pb-6">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Bill To (Organization)</h4>
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-foreground print-dark-text">{details.organizationName}</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">{details.orgAddress}</p>
              <p className="text-xs font-bold text-foreground print-dark-text mt-1">GSTIN: {details.orgGstin}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Vendor (Supplier)</h4>
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-foreground print-dark-text">{details.vendorName}</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">{details.vendorAddress}</p>
              <p className="text-xs font-bold text-foreground print-dark-text mt-1">GSTIN: {details.vendorGstin}</p>
            </div>
          </div>
        </div>

        {/* Document Timestamps Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-muted/40 border border-border/20 rounded-xl p-4 sm:p-5">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">PO Number</span>
            <span className="text-xs font-mono font-bold text-foreground print-dark-text">{details.poNumber}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Invoice Number</span>
            <span className="text-xs font-mono font-bold text-foreground print-dark-text">{details.invoiceNumber}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Invoice Date</span>
            <span className="text-xs font-semibold text-foreground print-dark-text">{formatDate(details.invoiceDate)}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Due Date</span>
            <span className="text-xs font-semibold text-destructive">{formatDate(details.dueDate)}</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Approved Line Items</h4>
          <div className="border border-border/40 rounded-xl overflow-hidden print-border">
            <table className="w-full text-sm border-collapse text-left">
              <thead className="bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="p-3">Item Name / Description</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {details.items.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/10 transition-colors">
                    <td className="p-3 text-foreground print-dark-text font-medium">{item.itemName}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{item.quantity}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">${item.unitPrice.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-semibold text-foreground print-dark-text">${item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculations and Breakdown Section */}
        <div className="flex justify-end pt-4">
          <div className="w-full sm:w-80 space-y-3 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-mono">${details.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground border-t border-border/20 pt-2">
              <span>CGST (9.0%):</span>
              <span className="font-mono">${details.cgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>SGST (9.0%):</span>
              <span className="font-mono">${details.sgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-foreground print-dark-text border-t border-border/40 pt-3">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-500 print-emerald-text">${details.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Vector Signature block (printed clean) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-16 border-t border-border/20 text-center">
          <div className="space-y-1.5 max-w-xs mx-auto">
            <div className="h-px bg-muted-foreground/30 w-full" />
            <p className="text-[10px] text-muted-foreground">Vendor Signatory Authority</p>
          </div>
          <div className="space-y-1.5 max-w-xs mx-auto">
            <div className="h-px bg-muted-foreground/30 w-full" />
            <p className="text-[10px] text-muted-foreground">Authorized Procurement Representative</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
