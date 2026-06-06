import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Cast session user for shell compatibility
  const user = {
    firstName: session.user.firstName || "User",
    lastName: session.user.lastName || "",
    role: session.user.role,
    email: session.user.email || "",
    profileImage: session.user.profileImage || null,
  }

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  )
}
