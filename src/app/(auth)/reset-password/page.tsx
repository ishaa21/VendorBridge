import { Metadata } from "next"
import { Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Reset Password | VendorBridge ERP",
  description: "Set a new password for your VendorBridge account.",
}

interface PageProps {
  searchParams: Promise<{
    token?: string
    email?: string
  }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = params.token
  const email = params.email

  if (!token || !email) {
    redirect("/login")
  }

  return (
    <Card className="w-full max-w-md glass-card border-border/40 shadow-2xl shadow-black/20 animate-scale-in">
      <CardHeader className="text-center space-y-4 pb-2">
        {/* Logo */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            New Password
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Set a new secure password for your account
          </CardDescription>
        </div>
      </CardHeader>

      <div className="px-6">
        <Separator className="bg-border/50" />
      </div>

      <CardContent className="pt-6 pb-8 px-6 sm:px-8">
        <ResetPasswordForm token={token} email={email} />
      </CardContent>
    </Card>
  )
}
