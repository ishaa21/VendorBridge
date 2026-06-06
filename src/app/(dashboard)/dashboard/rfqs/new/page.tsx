import { Metadata } from "next"
import { Role } from "@prisma/client"
import { requireRole } from "@/lib/auth-guard"
import { getActiveVendors, getRFQById } from "@/actions/rfqs"
import CreateRFQForm from "@/components/rfqs/create-rfq-form"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Create RFQ",
  description: "Create and publish a new Request For Quotation to invited vendors.",
}

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function NewRFQPage({ searchParams }: PageProps) {
  const { id } = await searchParams

  // Enforce access control: Admin or Procurement Officer
  await requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER])

  // Fetch active vendors to populate search selection
  const result = await getActiveVendors()

  // If id is provided, fetch RFQ details to pre-populate form for editing
  let initialRFQ = undefined
  if (id) {
    const rfqResult = await getRFQById(id)
    if (rfqResult.success) {
      initialRFQ = rfqResult.rfq
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {initialRFQ ? `Edit RFQ (${initialRFQ.rfqNumber})` : "Create RFQs"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {initialRFQ ? "Update draft request for quotation details" : "New request for quotation"}
        </p>
      </div>

      {/* Multi-step form client component */}
      <CreateRFQForm initialVendors={result.vendors || []} initialRFQ={initialRFQ} />
    </div>
  )
}
