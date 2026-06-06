import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getActivityLogs } from "@/actions/activity-logs"
import { ActivityLogsView } from "@/components/dashboard/activity-logs-view"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Activity Logs & Audit Trail | VendorBridge ERP",
  description: "Browse and audit the chronological trail of procurement and administrative events.",
}

export default async function ActivityLogsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  // Fetch first page of logs initially
  const result = await getActivityLogs({ page: 1, limit: 10 })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground" id="page-title">Activity &amp; Logs</h1>
        <p className="text-muted-foreground text-sm">
          Procurement audit trail
        </p>
      </div>

      <ActivityLogsView 
        initialLogs={result.success ? result.logs : []} 
        initialTotal={result.success ? result.total : 0}
        initialTotalPages={result.success ? result.totalPages : 0}
        user={session.user}
      />
    </div>
  )
}
