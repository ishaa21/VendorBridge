import { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/auth"
import { requireAuth } from "@/lib/auth-guard"
import { getRFQsList } from "@/actions/rfqs"
import { Role } from "@prisma/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import * as Lucide from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "RFQs Overview",
  description: "View and manage Request for Quotations.",
}

export default async function RFQsPage() {
  const user = await requireAuth()
  const result = await getRFQsList()

  const isStaff = user.role === Role.ADMIN || user.role === Role.PROCUREMENT_OFFICER
  const isVendor = user.role === Role.VENDOR

  const rfqs = result.rfqs || []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Request For Quotations (RFQs)</h1>
          <p className="text-muted-foreground text-sm">
            {isStaff
              ? "Publish RFQs, manage invitations, and monitor vendor response activity."
              : "Review RFQs you have been invited to and submit your bidding rates."}
          </p>
        </div>
        
        {isStaff && (
          <Link href="/dashboard/rfqs/new">
            <Button className="bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold shadow-md shadow-emerald-500/25 cursor-pointer">
              <Lucide.Plus className="mr-2 h-4 w-4" /> Create RFQ
            </Button>
          </Link>
        )}
      </div>

      {/* Main Content card */}
      <Card className="glass-card border-border/50 shadow-md">
        <CardContent className="p-0">
          {rfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lucide.FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No RFQs found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {isStaff
                  ? "Get started by creating your first Request for Quotation using the button above."
                  : "You haven't been invited to any open RFQs yet. Please check back later."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="p-4">RFQ Number</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Line Items</th>
                    <th className="p-4">Deadline</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {rfqs.map((rfq: any) => {
                    const isClosed = new Date(rfq.deadline) < new Date()
                    const itemsCount = rfq.items?.length || 0
                    
                    return (
                      <tr key={rfq.id} className="hover:bg-accent/20 transition-colors">
                        <td className="p-4 font-mono font-semibold text-emerald-500">
                          {rfq.rfqNumber}
                        </td>
                        <td className="p-4 max-w-[240px]">
                          <div className="font-semibold truncate">{rfq.title}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {rfq.description}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-muted/80 border font-medium">
                            {rfq.category}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-medium">
                          {itemsCount}
                        </td>
                        <td className="p-4">
                          <div className={cn(
                            "flex items-center gap-1.5 font-medium",
                            isClosed ? "text-destructive" : "text-foreground"
                          )}>
                            <Lucide.Calendar className="h-3.5 w-3.5" />
                            {new Date(rfq.deadline).toLocaleDateString()}
                            {isClosed && <span className="text-[10px] uppercase font-bold text-destructive ml-1">Expired</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                            rfq.status === "OPEN" || rfq.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : rfq.status === "DRAFT"
                              ? "bg-muted text-muted-foreground border-border"
                              : rfq.status === "CLOSED"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {rfq.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isVendor ? (
                            rfq.status === "CLOSED" || isClosed ? (
                              <Button variant="ghost" size="sm" disabled className="text-xs">
                                Closed
                              </Button>
                            ) : (
                              <Link href={`/dashboard/quotations/submit/${rfq.id}`}>
                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs font-semibold cursor-pointer">
                                  Submit Quote
                                </Button>
                              </Link>
                            )
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              {rfq.status === "DRAFT" ? (
                                <Link href={`/dashboard/rfqs/new?id=${rfq.id}`}>
                                  <Button size="sm" className="bg-amber-500 hover:bg-amber-500/90 text-white text-xs font-semibold cursor-pointer">
                                    Edit Draft
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/dashboard/quotations/compare/${rfq.id}`}>
                                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs font-semibold cursor-pointer">
                                    Compare Bids
                                  </Button>
                                </Link>
                              )}
                              <Link href={`/dashboard/rfqs`}>
                                <Button variant="outline" size="sm" className="text-xs cursor-pointer">
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          )}
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
