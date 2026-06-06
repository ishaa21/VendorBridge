import { Metadata } from "next"
import { Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Create Account | VendorBridge ERP",
  description: "Create a new VendorBridge account to get started with procurement and vendor management.",
}

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-2xl glass-card border-border/40 shadow-2xl shadow-black/20 animate-scale-in my-8">
      <CardHeader className="text-center space-y-4 pb-2">
        {/* Logo / Avatar */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Join VendorBridge — Procurement & Vendor Management ERP
          </CardDescription>
        </div>
      </CardHeader>

      <div className="px-6">
        <Separator className="bg-border/50" />
      </div>

      <CardContent className="pt-6 pb-8 px-6 sm:px-8">
        <RegisterForm />
      </CardContent>
    </Card>
  )
}
