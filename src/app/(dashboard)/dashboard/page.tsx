import { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { ROLE_LABELS } from "@/lib/constants"
import { Role } from "@prisma/client"

export const metadata: Metadata = {
  title: "Dashboard Overview",
  description: "View key procurement metrics, spending trends, and recent purchase orders.",
}

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  // Sanitize user info to pass to client component
  const user = {
    firstName: session.user.firstName || "User",
    lastName: session.user.lastName || "",
    role: session.user.role,
    email: session.user.email || "",
  }

  const roleLabel = ROLE_LABELS[user.role as Role] || user.role

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, {roleLabel} — Today&apos;s Overview
        </p>
      </div>

      <DashboardClient user={user} />
    </div>
  )
}
