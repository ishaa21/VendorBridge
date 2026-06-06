import { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getQuotationsOverview } from "@/actions/quotations"
import { getPurchaseOrdersList, getInvoicesList } from "@/actions/orders-invoices"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Receipt, ShoppingCart, ArrowRight } from "lucide-react"
import { ROLE_LABELS } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Vendor Portal",
  description: "Track RFQs, submit quotations, and view purchase orders.",
}

export default async function VendorPortalPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [quotationsResult, posResult, invoicesResult] = await Promise.all([
    getQuotationsOverview(),
    getPurchaseOrdersList(),
    getInvoicesList(),
  ])

  const openRfqs = quotationsResult.items?.length ?? 0
  const purchaseOrders = posResult.purchaseOrders?.length ?? 0
  const invoices = invoicesResult.invoices?.length ?? 0

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Vendor Portal</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, {session.user.firstName} — {ROLE_LABELS.VENDOR} Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card border-border/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Open RFQs</p>
              <p className="text-2xl font-bold">{openRfqs}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Purchase Orders</p>
              <p className="text-2xl font-bold">{purchaseOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Invoices</p>
              <p className="text-2xl font-bold">{invoices}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/quotations">
            <Button variant="outline" className="w-full justify-between cursor-pointer">
              Submit Quotations <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/rfqs">
            <Button variant="outline" className="w-full justify-between cursor-pointer">
              Track RFQ Status <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/purchase-orders">
            <Button variant="outline" className="w-full justify-between cursor-pointer">
              View Purchase Orders <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
