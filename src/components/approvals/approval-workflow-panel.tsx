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
import { cn } from "@/lib/utils"
import { processApprovalStep } from "@/actions/approvals"

interface Approver {
  id: string
  firstName: string
  lastName: string
  role: Role
  designation: string
}

interface ApprovalStep {
  id: string
  workflowId: string
  approverId: string
  stage: string
  remarks: string | null
  decision: string
  approvedAt: Date | string | null
  approver: Approver
}

interface ApprovalWorkflow {
  id: string
  rfqId: string
  quotationId: string
  currentStage: string
  status: string
  createdAt: Date | string
  rfq: {
    rfqNumber: string
    title: string
    category: string
    description: string
  }
  quotation: {
    quotationNumber: string
    grandTotal: number
    subtotal: number
    taxRate: number
    notes?: string | null
    vendor: {
      vendorName: string
      contactPerson: string
      rating: number
      deliveryDays: number
      paymentTerms: string
    }
  }
  steps: ApprovalStep[]
}

interface ApprovalWorkflowPanelProps {
  workflow: ApprovalWorkflow
  currentUser: {
    id: string
    firstName: string
    lastName: string
    role: Role
  }
}

export default function ApprovalWorkflowPanel({ workflow, currentUser }: ApprovalWorkflowPanelProps) {
  const router = useRouter()
  const [remarksText, setRemarksText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<"approve" | "reject" | "changes" | null>(null)

  const isStaff = currentUser.role === Role.ADMIN || currentUser.role === Role.MANAGER
  const isProcurement = currentUser.role === Role.PROCUREMENT_OFFICER

  // Find the active step in the workflow where the user is assigned
  // Active step is the first PENDING step in the workflow steps array
  const activeStep = workflow.steps.find((step) => step.decision === "PENDING")
  const isUserActiveApprover = activeStep && activeStep.approverId === currentUser.id
  const hasUserOverridePermissions = currentUser.role === Role.ADMIN

  // Users can only submit actions if they are the assigned approver, or an Admin overriding
  const canUserApprove = (isUserActiveApprover || hasUserOverridePermissions) && workflow.status === "PENDING"

  // --- Horizontal pipeline tracker calculations ---
  const stages = [
    { key: "SUBMITTED", label: "Submitted", desc: "RFQ published & bid locked" },
    { key: "L1_REVIEW", label: "L1 Review", desc: "Manager technical evaluate" },
    { key: "L2_APPROVAL", label: "L2 Approval", desc: "Finance audit & sign-off" },
    { key: "COMPLETED", label: "Generate PO", desc: "RFQ approved, PO pending" },
  ]

  const getStageIndex = (stageKey: string) => {
    if (stageKey === "L1_REVIEW") return 1
    if (stageKey === "L2_APPROVAL") return 2
    if (stageKey === "GENERATE_PO" || stageKey === "COMPLETED") return 3
    if (stageKey === "REJECTED") return -1
    return 0
  }

  const currentStageIndex = getStageIndex(workflow.currentStage)
  const isWorkflowRejected = workflow.status === "REJECTED"

  // Process approval action
  const handleActionClick = async (action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") => {
    if (!activeStep) return
    setIsSubmitting(true)
    setSubmittingAction(action === "APPROVED" ? "approve" : action === "REJECTED" ? "reject" : "changes")

    // Mandatory comments validation for Reject/Changes
    if ((action === "REJECTED" || action === "CHANGES_REQUESTED") && remarksText.trim().length < 10) {
      toast.error("Please provide comments explaining the rejection or change request (min 10 characters).")
      setIsSubmitting(false)
      setSubmittingAction(null)
      return
    }

    try {
      const payload = {
        workflowId: workflow.id,
        stepId: activeStep.id,
        decision: action,
        remarks: remarksText.trim() || undefined,
      }

      const response = await processApprovalStep(payload)
      if (response.success) {
        toast.success(response.message)
        setRemarksText("")
        router.refresh()
      } else {
        toast.error(response.message)
      }
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
      setSubmittingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Dynamic Progress Tracker */}
      <Card className="glass-card border-border/50 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
            {stages.map((stage, idx) => {
              const isCompleted = isWorkflowRejected 
                ? idx < getStageIndex(workflow.currentStage)
                : idx <= currentStageIndex

              const isActive = !isWorkflowRejected && idx === currentStageIndex
              const isFailed = isWorkflowRejected && idx === getStageIndex(workflow.currentStage)
              
              // Get step timestamps
              let timestamp: string | null = null
              if (idx === 0) {
                timestamp = new Date(workflow.createdAt).toLocaleDateString()
              } else {
                const matchedStep = workflow.steps[idx - 1]
                if (matchedStep && matchedStep.decision === "APPROVED" && matchedStep.approvedAt) {
                  timestamp = new Date(matchedStep.approvedAt).toLocaleDateString()
                }
              }

              return (
                <div key={stage.key} className="flex items-center w-full md:w-auto relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300",
                        isFailed
                          ? "bg-destructive border-destructive text-white shadow-md shadow-destructive/20"
                          : isActive
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105"
                          : isCompleted
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                          : "border-border text-muted-foreground bg-card"
                      )}
                    >
                      {isFailed ? (
                        <Lucide.X className="h-4.5 w-4.5 stroke-[3]" />
                      ) : isCompleted && idx > 0 ? (
                        <Lucide.Check className="h-4.5 w-4.5 stroke-[3]" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="text-left">
                      <p
                        className={cn(
                          "text-sm font-semibold leading-none",
                          isActive ? "text-foreground font-bold" : "text-muted-foreground",
                          isFailed && "text-destructive"
                        )}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{stage.desc}</p>
                      {timestamp && (
                        <p className="text-[9px] text-emerald-500/80 font-mono mt-1 font-semibold">{timestamp}</p>
                      )}
                    </div>
                  </div>
                  {idx < 3 && (
                    <div
                      className={cn(
                        "hidden md:block h-[2px] w-12 xl:w-20 mx-6",
                        isCompleted ? "bg-emerald-500/40" : "bg-border/60"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Left and Right Panel Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Section: Approval Chain Timeline & Action Box */}
        <div className="lg:col-span-2 space-y-6">
          {/* Approval Chain Timeline */}
          <Card className="glass-card border-border/50 shadow-md">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Lucide.Network className="h-5 w-5 text-emerald-500" />
                Approval Hierarchy Chain
              </CardTitle>
              <CardDescription className="text-xs">
                Audit trail and workflow steps for this RFQ selection.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Timeline Wrapper */}
              <div className="relative border-l border-border/60 ml-4 pl-6 space-y-8">
                {/* Step 0: Initiated Step */}
                <div className="relative">
                  {/* Icon Badge */}
                  <span className="absolute -left-[37px] top-0.5 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                    <Lucide.Send className="h-3 w-3" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">RFQ Decision Submitted</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold uppercase">
                        Initiated
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">RFQ selection completed and pushed to L1 manager review.</p>
                    <p className="text-[10px] font-mono mt-1 text-muted-foreground">{new Date(workflow.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Steps Timeline */}
                {workflow.steps.map((step) => (
                  <div key={step.id} className="relative">
                    {/* Icon Badge based on decision status */}
                    <span
                      className={cn(
                        "absolute -left-[37px] top-0.5 flex items-center justify-center h-6 w-6 rounded-full border bg-card",
                        step.decision === "APPROVED"
                          ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                          : step.decision === "REJECTED"
                          ? "border-destructive/40 text-destructive bg-destructive/5"
                          : step.decision === "CHANGES_REQUESTED"
                          ? "border-amber-500/40 text-amber-500 bg-amber-500/5"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {step.decision === "APPROVED" ? (
                        <Lucide.Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : step.decision === "REJECTED" ? (
                        <Lucide.X className="h-3.5 w-3.5 stroke-[3]" />
                      ) : step.decision === "CHANGES_REQUESTED" ? (
                        <Lucide.AlertCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Lucide.Clock className="h-3 w-3 animate-pulse-soft" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">
                            {step.approver.firstName} {step.approver.lastName}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted border font-semibold text-muted-foreground">
                            {step.approver.designation}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border",
                            step.decision === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : step.decision === "REJECTED"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : step.decision === "CHANGES_REQUESTED"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {step.decision.replace("_", " ")}
                        </span>
                      </div>
                      
                      {step.remarks && (
                        <div className="mt-1.5 text-xs p-2.5 rounded bg-muted/40 border text-muted-foreground max-w-xl italic">
                          &ldquo;{step.remarks}&rdquo;
                        </div>
                      )}
                      
                      {step.approvedAt && (
                        <p className="text-[10px] font-mono mt-1 text-muted-foreground">
                          Signed off on: {new Date(step.approvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Box: Comments and Approvals Trigger */}
          {canUserApprove ? (
            <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Lucide.Signature className="h-5 w-5 text-emerald-500" />
                  Approval Action Panel
                </CardTitle>
                <CardDescription className="text-xs">
                  Review the details, add conditional comments, and sign off or reject this request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Add Comments / Conditions / Justification
                  </Label>
                  <Textarea
                    id="remarks"
                    placeholder="Provide additional details. (Mandatory for rejection or requesting changes, min 10 characters)."
                    value={remarksText}
                    onChange={(e) => setRemarksText(e.target.value)}
                    rows={4}
                    className="bg-card/80 border-border/80 focus-visible:ring-emerald-500 placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleActionClick("CHANGES_REQUESTED")}
                    className="border-amber-500/30 text-amber-500 hover:bg-amber-500/5 cursor-pointer w-full sm:w-auto h-9 text-xs"
                  >
                    {isSubmitting && submittingAction === "changes" ? (
                      <Lucide.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Lucide.AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Request Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleActionClick("REJECTED")}
                    className="border-destructive/30 text-destructive hover:bg-destructive/5 cursor-pointer w-full sm:w-auto h-9 text-xs"
                  >
                    {isSubmitting && submittingAction === "reject" ? (
                      <Lucide.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Lucide.X className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Reject Request
                  </Button>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleActionClick("APPROVED")}
                    className="bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold cursor-pointer w-full sm:w-auto h-9 text-xs shadow-md shadow-emerald-500/10"
                  >
                    {isSubmitting && submittingAction === "approve" ? (
                      <Lucide.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Lucide.Check className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Approve Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 bg-card/20 rounded-xl">
              <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Lucide.Lock className="h-8 w-8 stroke-1 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold">Workflow Actions Locked</p>
                <p className="text-xs max-w-md mt-1">
                  {isProcurement
                    ? "Procurement Officers have view-only access to this approval hierarchy check."
                    : workflow.status !== "PENDING"
                    ? `This approval workflow has been finalized. Status: ${workflow.status}`
                    : `You are not the assigned approver for the active stage (${activeStep?.stage.replace("_", " ")}). Waiting for ${activeStep?.approver.firstName} ${activeStep?.approver.lastName}.`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Section: Quotation Summary Card */}
        <div className="space-y-6">
          <Card className="glass-card border-border/50 shadow-md">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Lucide.FileCheck className="h-5 w-5 text-emerald-500" />
                Quotation Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Selected bid details undergoing review.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Vendor Name</span>
                <span className="text-sm font-bold text-foreground">{workflow.quotation.vendor.vendorName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Quotation Value</span>
                  <span className="text-sm font-bold text-emerald-500 font-mono">
                    ${workflow.quotation.grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Delivery Days</span>
                  <span className="text-sm font-semibold text-foreground font-mono">
                    {workflow.quotation.vendor.deliveryDays} Days
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Payment Terms</span>
                  <span className="text-sm font-semibold text-foreground">
                    {workflow.quotation.vendor.paymentTerms}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Vendor Rating</span>
                  <span className="text-sm font-semibold text-purple-500 font-mono">
                    {workflow.quotation.vendor.rating} ★
                  </span>
                </div>
              </div>

              <div className="space-y-1 border-t border-border/20 pt-3">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">RFQ Reference</span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {workflow.rfq.rfqNumber}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px] block mt-0.5">
                  {workflow.rfq.title}
                </span>
              </div>

              {workflow.quotation.notes && (
                <div className="space-y-1.5 border-t border-border/20 pt-3">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block">Vendor Terms & Notes</span>
                  <p className="text-[11px] leading-relaxed text-muted-foreground italic bg-muted/30 p-2 border border-border/40 rounded-lg">
                    {workflow.quotation.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
