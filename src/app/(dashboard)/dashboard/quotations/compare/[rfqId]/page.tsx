import { Metadata } from "next"
import { Role } from "@prisma/client"
import { requireRole } from "@/lib/auth-guard"
import { getRFQQuotationsForComparison } from "@/actions/comparisons"
import QuotationComparison from "@/components/quotations/quotation-comparison"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Quotation Comparison",
  description: "Compare vendor quotations side-by-side and select a supplier for approval.",
}

interface ComparePageProps {
  params: Promise<{ rfqId: string }>
}

export default async function QuotationComparePage({ params }: ComparePageProps) {
  const { rfqId } = await params

  // Enforce access control: Admins, Procurement Officers, and Managers
  const user = await requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.MANAGER])

  // Fetch submitted quotation details for comparison
  const result = await getRFQQuotationsForComparison(rfqId)

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4 no-print">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Quotation Comparison</h1>
          <p className="text-muted-foreground text-sm">
            RFQ: <span className="font-semibold text-foreground">{result.rfq?.title || "Office Furniture Procurement Q2"}</span> ({result.rfq?.rfqNumber || "RFQ-2026-0001"})
          </p>
        </div>
        
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            {result.quotations?.length || 0} Quotations Received
          </span>
        </div>
      </div>

      {/* Comparison Grid and analysis engine */}
      {result.quotations && result.quotations.length > 0 ? (
        <QuotationComparison
          rfq={result.rfq}
          quotations={result.quotations}
          userRole={user.role}
        />
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-2" />
            <h3 className="text-base font-semibold">No Submitted Quotations</h3>
            <p className="text-xs max-w-xs mt-1">
              There are no quotations submitted for this RFQ yet. Comparisons will become available once vendors submit bids.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
