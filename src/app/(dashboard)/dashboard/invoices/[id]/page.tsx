import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Role } from "@prisma/client"
import { requireRole } from "@/lib/auth-guard"
import { getPOAndInvoiceDetails } from "@/actions/orders-invoices"
import POInvoiceDetailsView from "@/components/invoices/po-invoice-details-view"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Purchase Order & Invoice Details",
  description: "View legal purchase orders, tax invoices, and payment tracking status.",
}

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params

  // Enforce Role Access check: Admins, Managers, Procurement Officers, and Vendors (who only see their own)
  const user = await requireRole([Role.ADMIN, Role.MANAGER, Role.PROCUREMENT_OFFICER, Role.VENDOR])

  // Fetch details
  const result = await getPOAndInvoiceDetails(id)

  if (!result.success || !result.details) {
    return notFound()
  }

  // Format current user structure for client compatibility
  const currentUser = {
    id: user.id,
    role: user.role,
  }

  return (
    <div className="space-y-6">
      {/* Render the details visual document */}
      <POInvoiceDetailsView
        details={result.details}
        currentUser={currentUser}
      />
    </div>
  )
}
