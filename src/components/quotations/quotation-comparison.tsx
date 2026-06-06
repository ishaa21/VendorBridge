"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Role } from "@prisma/client"
import { toast } from "sonner"
import * as Lucide from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { makeComparisonDecision } from "@/actions/comparisons"

interface QuotationItem {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  total: number
  deliveryDays: number
}

interface Quotation {
  id: string
  quotationNumber: string
  subtotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  notes: string | null
  submittedAt: Date | string | null
  vendor: {
    id: string
    vendorName: string
    contactPerson: string
    phone: string
    email: string
    rating: number
    paymentTerms: string
    deliveryDays: number
  }
  items: QuotationItem[]
}

interface RFQ {
  id: string
  rfqNumber: string
  title: string
  category: string
  description: string
}

interface QuotationComparisonProps {
  rfq: any
  quotations: any[]
  userRole: Role
}

export default function QuotationComparison({ rfq, quotations, userRole }: QuotationComparisonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null)
  const [overrideReason, setOverrideReason] = useState("")

  const isStaff = userRole === Role.ADMIN || userRole === Role.PROCUREMENT_OFFICER
  const isReadOnly = userRole === Role.MANAGER

  // --- Multi-factor Scoring Engine Calculations ---
  const minPrice = Math.min(...quotations.map((q) => q.grandTotal))
  const minDelivery = Math.min(...quotations.map((q) => q.vendor.deliveryDays))
  const maxRating = Math.max(...quotations.map((q) => q.vendor.rating))

  const scoredQuotations = quotations.map((q) => {
    // 1. Price Score (50% Weight) - higher score for lower price
    const priceScore = (minPrice / q.grandTotal) * 100 * 0.50

    // 2. Delivery Score (20% Weight) - higher score for fewer days
    const deliveryScore = (minDelivery / q.vendor.deliveryDays) * 100 * 0.20

    // 3. Vendor Rating Score (20% Weight) - normalized out of 5 stars
    const ratingScore = (q.vendor.rating / 5.0) * 100 * 0.20

    // 4. Payment Terms Score (10% Weight)
    // net 60 = 100, net 30 = 70, net 15 = 40, cod/other = 20
    let termsBase = 20
    const termsStr = q.vendor.paymentTerms.toLowerCase()
    if (termsStr.includes("60")) termsBase = 100
    else if (termsStr.includes("30")) termsBase = 70
    else if (termsStr.includes("15")) termsBase = 40

    const termsScore = termsBase * 0.10
    const totalScore = parseFloat((priceScore + deliveryScore + ratingScore + termsScore).toFixed(2))

    return {
      ...q,
      scores: {
        priceScore,
        deliveryScore,
        ratingScore,
        termsScore,
        totalScore,
      },
    }
  })

  // Find overall recommended (highest total score)
  const maxScore = Math.max(...scoredQuotations.map((sq) => sq.scores.totalScore))
  const recommendedQuoteId = scoredQuotations.find((sq) => sq.scores.totalScore === maxScore)?.id

  // Trigger print view
  const handlePrint = () => {
    window.print()
  }

  // Handle Select click
  const handleSelectVendorClick = (quote: any) => {
    setSelectedQuotation(quote)
    const isLowest = quote.grandTotal === minPrice

    if (isLowest) {
      setConfirmModalOpen(true)
    } else {
      setOverrideReason("")
      setOverrideModalOpen(true)
    }
  }

  // Execute decision
  const handleConfirmSelection = async (reasonToSubmit?: string) => {
    if (!selectedQuotation) return
    setIsSubmitting(true)

    try {
      const payload = {
        rfqId: rfq.id,
        selectedVendorId: selectedQuotation.vendor.id,
        selectedQuotationId: selectedQuotation.id,
        recommendationScore: scoredQuotations.find((sq) => sq.id === selectedQuotation.id)?.scores.totalScore || 0,
        manualOverrideReason: reasonToSubmit,
      }

      const response = await makeComparisonDecision(payload)
      if (response.success) {
        toast.success(response.message)
        router.push("/dashboard/rfqs")
      } else {
        toast.error(response.message)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to complete selection action.")
    } finally {
      setIsSubmitting(false)
      setConfirmModalOpen(false)
      setOverrideModalOpen(false)
    }
  }

  return (
    <div className="space-y-6 print-full-width">
      {/* Dynamic style sheet for printing reports */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          aside, header, nav, button, .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .glass-card {
            border: 1px solid #e2e8f0 !important;
            background: none !important;
            box-shadow: none !important;
          }
          .highlight-green {
            background-color: #f0fdf4 !important;
            border-color: #86efac !important;
            color: #166534 !important;
          }
        }
      `}</style>

      {/* Auto Analysis Recommendation Engine */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        {/* Recommended Panel */}
        <Card className="border-amber-500/20 bg-amber-500/5 text-amber-500 rounded-xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-10 group-hover:scale-110 transition-transform">
            <Lucide.Award className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">SMART CHOICE</span>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
              <Lucide.Sparkles className="h-4 w-4" /> Recommended Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const best = scoredQuotations.find((q) => q.id === recommendedQuoteId)
              return best ? (
                <div>
                  <p className="text-base font-bold text-foreground leading-tight truncate">{best.vendor.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommendation Score: <span className="font-semibold text-amber-500">{best.scores.totalScore} pts</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs">Calculating...</p>
              )
            })()}
          </CardContent>
        </Card>

        {/* Lowest Price Card */}
        <Card className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 rounded-xl hover:scale-[1.02] transition-transform">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">PRICE LEADER</span>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
              <Lucide.DollarSign className="h-4 w-4" /> Lowest Bid Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const best = quotations.find((q) => q.grandTotal === minPrice)
              return best ? (
                <div>
                  <p className="text-base font-bold text-foreground leading-tight truncate">{best.vendor.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grand Total: <span className="font-semibold text-emerald-500">${best.grandTotal.toLocaleString()}</span>
                  </p>
                </div>
              ) : null
            })()}
          </CardContent>
        </Card>

        {/* Fastest Delivery Card */}
        <Card className="border-blue-500/20 bg-blue-500/5 text-blue-500 rounded-xl hover:scale-[1.02] transition-transform">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">VELOCITY LEADER</span>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
              <Lucide.Clock className="h-4 w-4" /> Fastest Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const best = quotations.find((q) => q.vendor.deliveryDays === minDelivery)
              return best ? (
                <div>
                  <p className="text-base font-bold text-foreground leading-tight truncate">{best.vendor.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Delivery Days: <span className="font-semibold text-blue-500">{best.vendor.deliveryDays} Days</span>
                  </p>
                </div>
              ) : null
            })()}
          </CardContent>
        </Card>

        {/* Highest Rated Vendor Card */}
        <Card className="border-purple-500/20 bg-purple-500/5 text-purple-500 rounded-xl hover:scale-[1.02] transition-transform">
          <CardHeader className="pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">QUALITY LEADER</span>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
              <Lucide.Star className="h-4 w-4" /> Highest Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const best = quotations.find((q) => q.vendor.rating === maxRating)
              return best ? (
                <div>
                  <p className="text-base font-bold text-foreground leading-tight truncate">{best.vendor.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supplier Rating: <span className="font-semibold text-purple-500">{best.vendor.rating} ★</span>
                  </p>
                </div>
              ) : null
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Main Matrix and Table Block */}
      <Card className="glass-card border-border/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lucide.Scale className="h-5 w-5 text-emerald-500" />
              Quotation Comparison Grid
            </CardTitle>
            <CardDescription className="text-xs">
              Compare bid values side-by-side. Weightings: Price (50%), Delivery (20%), Rating (20%), Terms (10%).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-border/60 hover:bg-secondary cursor-pointer"
            >
              <Lucide.Printer className="mr-1.5 h-4 w-4" /> Print / Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-4 min-w-[200px] border-r border-border/20">Comparison Metrics</th>
                  {scoredQuotations.map((q) => (
                    <th
                      key={q.id}
                      className={cn(
                        "p-4 text-center min-w-[250px]",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : "border-r border-border/20"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-foreground text-sm truncate">{q.vendor.vendorName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{q.quotationNumber}</div>
                        <div className="flex justify-center gap-1 mt-1 flex-wrap">
                          {q.grandTotal === minPrice && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                              Lowest Cost
                            </span>
                          )}
                          {q.vendor.deliveryDays === minDelivery && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500">
                              Fastest
                            </span>
                          )}
                          {q.id === recommendedQuoteId && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                              Recommended
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {/* Grand Total */}
                <tr className="hover:bg-accent/10 transition-colors font-semibold">
                  <td className="p-4 border-r border-border/20 text-foreground font-semibold flex items-center gap-1.5">
                    <Lucide.Banknote className="h-4 w-4 text-emerald-500" /> Bid Grand Total
                  </td>
                  {scoredQuotations.map((q) => (
                    <td
                      key={q.id}
                      className={cn(
                        "p-4 text-center text-lg font-mono font-bold",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 text-emerald-500 highlight-green border-x border-emerald-500/20" : "text-foreground"
                      )}
                    >
                      ${q.grandTotal.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Subtotal */}
                <tr className="hover:bg-accent/10 transition-colors text-xs">
                  <td className="p-4 border-r border-border/20 text-muted-foreground pl-8">Subtotal</td>
                  {scoredQuotations.map((q) => (
                    <td
                      key={q.id}
                      className={cn(
                        "p-4 text-center font-mono text-muted-foreground",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : ""
                      )}
                    >
                      ${q.subtotal.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* GST Tax % */}
                <tr className="hover:bg-accent/10 transition-colors text-xs">
                  <td className="p-4 border-r border-border/20 text-muted-foreground pl-8">GST / Tax %</td>
                  {scoredQuotations.map((q) => (
                    <td
                      key={q.id}
                      className={cn(
                        "p-4 text-center font-mono text-muted-foreground",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : ""
                      )}
                    >
                      {q.taxRate}%
                    </td>
                  ))}
                </tr>

                {/* Delivery Time (Days) */}
                <tr className="hover:bg-accent/10 transition-colors">
                  <td className="p-4 border-r border-border/20 text-foreground font-medium flex items-center gap-1.5">
                    <Lucide.Clock className="h-4 w-4 text-blue-500" /> Delivery Days
                  </td>
                  {scoredQuotations.map((q) => (
                    <td
                      key={q.id}
                      className={cn(
                        "p-4 text-center font-semibold font-mono",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : "",
                        q.vendor.deliveryDays === minDelivery ? "text-blue-500" : "text-foreground"
                      )}
                    >
                      {q.vendor.deliveryDays} Days
                    </td>
                  ))}
                </tr>

                {/* Vendor Rating */}
                <tr className="hover:bg-accent/10 transition-colors">
                  <td className="p-4 border-r border-border/20 text-foreground font-medium flex items-center gap-1.5">
                    <Lucide.Star className="h-4 w-4 text-purple-500" /> Supplier Rating
                  </td>
                  {scoredQuotations.map((q) => (
                    <td
                      key={q.id}
                      className={cn(
                        "p-4 text-center font-semibold text-purple-500",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : ""
                      )}
                    >
                      {q.vendor.rating} ★
                    </td>
                  ))}
                </tr>

                {/* Payment Terms */}
                <tr className="hover:bg-accent/10 transition-colors">
                  <td className="p-4 border-r border-border/20 text-foreground font-medium flex items-center gap-1.5">
                    <Lucide.CreditCard className="h-4 w-4 text-amber-500" /> Payment Terms
                  </td>
                  {scoredQuotations.map((q) => (
                    <td
                      key={q.id}
                      className={cn(
                        "p-4 text-center text-foreground font-semibold",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : ""
                      )}
                    >
                      {q.vendor.paymentTerms}
                    </td>
                  ))}
                </tr>

                {/* Recommendation Score breakdown */}
                <tr className="hover:bg-accent/10 transition-colors bg-secondary/20">
                  <td className="p-4 border-r border-border/20 text-foreground font-bold flex items-center gap-1.5">
                    <Lucide.Award className="h-4 w-4 text-amber-500 animate-pulse-soft" /> Match Score
                  </td>
                  {scoredQuotations.map((q) => (
                    <td
                      key={q.id}
                      className={cn(
                        "p-4 text-center font-bold text-base font-mono",
                        q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : "",
                        q.id === recommendedQuoteId ? "text-amber-500" : "text-foreground"
                      )}
                    >
                      {q.scores.totalScore} pts
                    </td>
                  ))}
                </tr>

                {/* Selection Actions row */}
                <tr className="no-print">
                  <td className="p-4 border-r border-border/20 text-xs text-muted-foreground uppercase font-semibold">
                    Selection Actions
                  </td>
                  {scoredQuotations.map((q) => {
                    const isLowest = q.grandTotal === minPrice
                    
                    return (
                      <td
                        key={q.id}
                        className={cn(
                          "p-4 text-center",
                          q.grandTotal === minPrice ? "bg-emerald-500/5 highlight-green border-x border-emerald-500/20" : ""
                        )}
                      >
                        {!isStaff || isReadOnly ? (
                          <span className="text-xs text-muted-foreground italic">View-only mode</span>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => handleSelectVendorClick(q)}
                            className={cn(
                              "text-xs font-semibold cursor-pointer py-1 px-4 h-8 rounded-lg shadow-sm border",
                              isLowest
                                ? "bg-emerald-500 text-white hover:bg-emerald-500/90 border-emerald-500"
                                : "bg-background text-foreground hover:bg-secondary border-border"
                            )}
                          >
                            {isLowest ? "Select & Approve" : "Select (Override)"}
                          </Button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CONFIRMATION DIALOG MODAL (For Lowest Cost Selection) */}
      {confirmModalOpen && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setConfirmModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border/80 rounded-xl shadow-2xl p-6 text-center animate-scale-in">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <Lucide.Check className="h-6 w-6 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold mb-2">Approve {selectedQuotation.vendor.vendorName}?</h3>
            <p className="text-xs text-muted-foreground mb-6">
              You selected the lowest price vendor bid of <strong>${selectedQuotation.grandTotal.toLocaleString()}</strong>. This will submit the choice to managers for final approval.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => setConfirmModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={() => handleConfirmSelection()}
                className="bg-emerald-500 text-white hover:bg-emerald-500/90 font-semibold cursor-pointer"
              >
                {isSubmitting ? <Lucide.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL OVERRIDE JUSTIFICATION MODAL */}
      {overrideModalOpen && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setOverrideModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border/80 rounded-xl shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-4">
              <Lucide.AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-bold">Manual Override Justification</h3>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              You selected <strong>{selectedQuotation.vendor.vendorName}</strong> (${selectedQuotation.grandTotal.toLocaleString()}), which is higher than the lowest bid of <strong>${minPrice.toLocaleString()}</strong>.
              <br />
              <strong className="text-destructive mt-1 block">A justification is required for compliance audits.</strong>
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="override-reason" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Justification / Comments (min 10 characters)
                </Label>
                <Textarea
                  id="override-reason"
                  placeholder="e.g. Recommended vendor selected due to 3-day faster delivery time and Net-60 terms matching our standard cash flow cycles."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={4}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-border/40 pt-4">
              <Button
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => setOverrideModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                disabled={isSubmitting || overrideReason.trim().length < 10}
                onClick={() => handleConfirmSelection(overrideReason.trim())}
                className="bg-amber-500 text-white hover:bg-amber-500/90 font-semibold cursor-pointer"
              >
                {isSubmitting ? <Lucide.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Approve Override Selection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
