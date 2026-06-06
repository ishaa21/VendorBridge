import { Metadata } from "next"
import { Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password | VendorBridge ERP",
  description: "Reset your VendorBridge account password.",
}

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-md glass-card border-border/40 shadow-2xl shadow-black/20 animate-scale-in">
      <CardHeader className="text-center space-y-4 pb-2">
        {/* Logo */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Reset Password
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Recover access to your VendorBridge account
          </CardDescription>
        </div>
      </CardHeader>

      <div className="px-6">
        <Separator className="bg-border/50" />
      </div>

      <CardContent className="pt-6 pb-8 px-6 sm:px-8">
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  )
}
