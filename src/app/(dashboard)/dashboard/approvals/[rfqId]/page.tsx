import { Metadata } from "next"
import { Role } from "@prisma/client"
import { requireRole } from "@/lib/auth-guard"
import { getApprovalWorkflowDetails } from "@/actions/approvals"
import ApprovalWorkflowPanel from "@/components/approvals/approval-workflow-panel"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Approval Workflow",
  description: "Monitor and sign off on Request for Quotation vendor selections.",
}

interface ApprovalPageProps {
  params: Promise<{ rfqId: string }>
}

export default async function ApprovalPage({ params }: ApprovalPageProps) {
  const { rfqId } = await params

  // Enforce access control: Admins, Managers (including Finance), and Procurement Officers
  const user = await requireRole([Role.ADMIN, Role.MANAGER, Role.PROCUREMENT_OFFICER])

  // Fetch approval workflow details
  const result = await getApprovalWorkflowDetails(rfqId)

  // Format current user structure for client compatibility
  const currentUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Approval Workflow</h1>
          <p className="text-muted-foreground text-sm">
            RFQ: <span className="font-semibold text-foreground">{result.workflow?.rfq?.title || "Office Furniture Procurement Q2"}</span>
          </p>
        </div>
        
        {result.workflow?.quotation && (
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse-soft" />
              Workflow Status: {result.workflow.status}
            </span>
          </div>
        )}
      </div>

      {/* Progress tracker and chain grid */}
      {result.workflow ? (
        <ApprovalWorkflowPanel
          workflow={result.workflow}
          currentUser={currentUser}
        />
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mb-2" />
            <h3 className="text-base font-semibold">No Active Workflow</h3>
            <p className="text-xs max-w-xs mt-1">
              There is no active approval workflow initiated for this RFQ yet. Workflows begin once a vendor selection decision is submitted.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
