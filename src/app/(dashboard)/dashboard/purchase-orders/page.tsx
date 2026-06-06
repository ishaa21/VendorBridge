import { Metadata } from "next"
import Link from "next/link"
import { getPurchaseOrdersList, getInvoicesList } from "@/actions/orders-invoices"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import * as Lucide from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Purchase Orders Overview",
  description: "Track procurement purchase orders generated from approved tenders.",
}

export default async function PurchaseOrdersListPage() {
  const result = await getPurchaseOrdersList()
  const invoicesResult = await getInvoicesList()
  
  const pos = result.purchaseOrders || []
  const invoices = invoicesResult.invoices || []

  // Helper function to map a PO to its Invoice ID for details navigation
  const getInvoiceIdForPo = (poNumber: string, poId: string) => {
    const matchedInvoice = invoices.find((inv) => inv.poNumber === poNumber)
    return matchedInvoice?.id || poId // Fallback to PO ID if invoice not found
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders (PO)</h1>
          <p className="text-muted-foreground text-sm">
            Monitor spend aggregate, issued contracts, and shipment delivery statuses.
          </p>
        </div>
      </div>

      {/* Main Table */}
      <Card className="glass-card border-border/50 shadow-md">
        <CardContent className="p-0">
          {pos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lucide.ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">No purchase orders found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                There are no purchase orders recorded in the system. POs are auto-generated when RFQs complete L2 approval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="p-4">PO Number</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {pos.map((po) => {
                    const invoiceId = getInvoiceIdForPo(po.poNumber, po.id)
                    return (
                      <tr key={po.id} className="hover:bg-accent/20 transition-colors">
                        <td className="p-4 font-mono font-semibold text-emerald-500">
                          {po.poNumber}
                        </td>
                        <td className="p-4 font-semibold truncate max-w-[200px]">
                          {po.vendorName}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {formatDate(po.createdAt)}
                        </td>
                        <td className="p-4 font-mono font-bold text-foreground">
                          ${po.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                              po.status === "DELIVERED"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : po.status === "ISSUED" || po.status === "ACKNOWLEDGED"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : po.status === "DRAFT"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {po.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Link href={`/dashboard/invoices/${invoiceId}`}>
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs font-semibold cursor-pointer"
                            >
                              <Lucide.Eye className="mr-1 h-3.5 w-3.5" /> View Documents
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
