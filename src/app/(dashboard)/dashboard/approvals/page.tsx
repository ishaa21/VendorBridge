import { Metadata } from "next"
import Link from "next/link"
import { requireAuth } from "@/lib/auth-guard"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import * as Lucide from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Approvals Dashboard",
  description: "View and sign off on pending procurement approval requests.",
}

export default async function ApprovalsListPage() {
  const user = await requireAuth()

  const isManager = user.role === Role.MANAGER || user.role === Role.ADMIN

  const dbWorkflows = await prisma.approvalWorkflow.findMany({
    include: {
      rfq: true,
      quotation: { include: { vendor: true } },
      initiatedBy: true,
      steps: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const workflows = dbWorkflows.map((wf) => ({
    id: wf.id,
    rfqId: wf.rfqId,
    rfqNumber: wf.rfq.rfqNumber,
    title: wf.rfq.title,
    vendorName: wf.quotation.vendor.vendorName,
    grandTotal: Number(wf.quotation.grandTotal),
    currentStage: wf.currentStage,
    status: wf.status,
    initiatedBy: `${wf.initiatedBy.firstName} ${wf.initiatedBy.lastName}`,
    createdAt: wf.createdAt,
  }))

  const filteredWorkflows = isManager
    ? workflows.filter((wf) => wf.status === "PENDING")
    : workflows

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Approvals Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {isManager
            ? "Review and sign off on pending vendor selections and quotations."
            : "Monitor the progression of approval chains across active tender submissions."}
        </p>
      </div>

      <Card className="glass-card border-border/50 shadow-md">
        <CardContent className="p-0">
          {filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lucide.CheckSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No pending approvals</h3>
              <p className="text-sm max-w-sm mt-1">
                Approval workflows appear here after procurement selects a vendor quotation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="p-4">RFQ</th>
                    <th className="p-4">Vendor</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Stage</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredWorkflows.map((wf) => (
                    <tr key={wf.id} className="hover:bg-accent/20 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-emerald-500 font-semibold">{wf.rfqNumber}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{wf.title}</div>
                      </td>
                      <td className="p-4 font-medium">{wf.vendorName}</td>
                      <td className="p-4 font-mono">${wf.grandTotal.toLocaleString()}</td>
                      <td className="p-4">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded border">{wf.currentStage}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                            wf.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : wf.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}
                        >
                          {wf.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Link href={`/dashboard/approvals/${wf.rfqId}`}>
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-500/90 text-white text-xs font-semibold cursor-pointer"
                          >
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
