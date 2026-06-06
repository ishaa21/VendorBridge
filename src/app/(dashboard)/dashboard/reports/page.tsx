import { Metadata } from "next"
import { requireRole } from "@/lib/auth-guard"
import { Role } from "@prisma/client"
import { getReportsData } from "@/actions/reports"
import { ReportsView } from "@/components/dashboard/reports-view"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Reports & Analytics",
  description: "Procurement insights, spending summaries, and vendor performance analytics.",
}

export default async function ReportsPage() {
  await requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.MANAGER])
  const result = await getReportsData()

  if (!result.success || !result.data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-destructive text-sm">
          {result.message || "Failed to load reports data."}
        </CardContent>
      </Card>
    )
  }

  return <ReportsView data={result.data} />
}
