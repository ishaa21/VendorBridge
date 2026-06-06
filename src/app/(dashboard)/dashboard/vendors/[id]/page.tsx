import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireRole } from "@/lib/auth-guard"
import { Role } from "@prisma/client"
import { getVendorById } from "@/actions/vendors"
import { VendorDetails } from "@/components/vendors/vendor-details"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Vendor Details",
  description: "View supplier profile and status history.",
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER])
  const { id } = await params
  const result = await getVendorById(id)

  if (!result.success || !result.vendor) {
    notFound()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/vendors">
          <Button variant="ghost" size="sm" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Vendors
          </Button>
        </Link>
      </div>

      <VendorDetails vendor={result.vendor} userRole={user.role as Role} />
    </div>
  )
}
