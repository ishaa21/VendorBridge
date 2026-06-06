import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    const role = session.user.role

    switch (role) {
      case "ADMIN":
        redirect("/dashboard")
      case "PROCUREMENT_OFFICER":
        redirect("/dashboard")
      case "VENDOR":
        redirect("/dashboard/vendor-portal")
      case "MANAGER":
        redirect("/dashboard/approvals")
      default:
        redirect("/dashboard")
    }
  }

  redirect("/login")
}
