import { Metadata } from "next"
import { requireRole } from "@/lib/auth-guard"
import { Role } from "@prisma/client"
import { VendorForm } from "@/components/vendors/vendor-form"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Add Vendor",
  description: "Register a new supplier partner.",
}

export default async function NewVendorPage() {
  await requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER])

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Add Vendor</h1>
        <p className="text-muted-foreground text-sm">
          Register a new supplier partner with GST and contact details
        </p>
      </div>

      <Card className="glass-card border-border/50">
        <CardContent className="p-6">
          <VendorForm />
        </CardContent>
      </Card>
    </div>
  )
}
