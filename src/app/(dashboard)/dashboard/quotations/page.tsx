import { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getQuotationsOverview } from "@/actions/quotations"
import { QuotationsList } from "@/components/quotations/quotations-list"
import { Role } from "@prisma/client"

export const metadata: Metadata = {
  title: "Quotations",
  description: "Submit vendor quotations or compare received bids.",
}

export default async function QuotationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const result = await getQuotationsOverview()
  const isVendor = session.user.role === Role.VENDOR

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {isVendor ? "Submit Quotations" : "Quotations"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isVendor
            ? "Review invited RFQs and submit your pricing bids"
            : "Compare received vendor quotations and select suppliers"}
        </p>
      </div>

      <QuotationsList
        items={result.items || []}
        role={session.user.role as Role}
      />
    </div>
  )
}
