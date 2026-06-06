"use client"

import Link from "next/link"
import { Role } from "@prisma/client"
import { FileText, ArrowRight, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QuotationsListProps {
  items: any[]
  role: Role
}

export function QuotationsList({ items, role }: QuotationsListProps) {
  const isVendor = role === Role.VENDOR

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card className="glass-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No quotations yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {isVendor
                ? "You have no open RFQs to quote on. Check back when invited."
                : "No submitted quotations available for comparison."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.rfqId} className="glass-card border-border/50 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-emerald-500 font-semibold">{item.rfqNumber}</span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-muted/80 border font-medium">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Deadline: {new Date(item.deadline).toLocaleDateString()}
                    {!isVendor && item.quotationsCount != null && (
                      <> · {item.quotationsCount} quotation{item.quotationsCount !== 1 ? "s" : ""} received</>
                    )}
                    {isVendor && item.quotation && (
                      <> · Status: <span className="capitalize">{item.quotation.status?.toLowerCase()}</span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!isVendor && item.lowestBid != null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Lowest Bid</p>
                      <p className="font-mono font-bold text-emerald-500">${item.lowestBid.toLocaleString()}</p>
                    </div>
                  )}
                  {isVendor ? (
                    <Link href={`/dashboard/quotations/submit/${item.rfqId}`}>
                      <Button className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs font-semibold cursor-pointer">
                        {item.quotation?.status === "SUBMITTED" ? "Edit Quote" : "Submit Quote"}
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/quotations/compare/${item.rfqId}`}>
                      <Button className={cn(
                        "text-xs font-semibold cursor-pointer",
                        "bg-emerald-500 hover:bg-emerald-500/90 text-white"
                      )}>
                        Compare Bids
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
