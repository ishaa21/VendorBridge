import { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { requireRole } from "@/lib/auth-guard"
import { Role } from "@prisma/client"
import { getVendorsList } from "@/actions/vendors"
import { VendorsList } from "@/components/vendors/vendors-list"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Vendors",
  description: "Manage supplier profiles and registrations.",
}

export default async function VendorsPage() {
  await requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER])
  const result = await getVendorsList()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground text-sm">
            Manage supplier profiles and registrations
          </p>
        </div>
        <Link href="/dashboard/vendors/new">
          <Button className="bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold shadow-md shadow-emerald-500/25 cursor-pointer">
            <Plus className="mr-2 h-4 w-4" /> Add Vendor
          </Button>
        </Link>
      </div>

      <VendorsList
        initialVendors={result.vendors || []}
        initialStatusCounts={result.statusCounts || { all: 0, active: 0, pending: 0, blocked: 0 }}
      />
    </div>
  )
}
