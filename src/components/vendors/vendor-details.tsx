"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { VendorStatus, Role } from "@prisma/client"
import { toast } from "sonner"
import { Building2, Mail, Phone, MapPin, FileText, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { cn, formatDate } from "@/lib/utils"
import { updateVendorStatus } from "@/actions/vendors"

interface VendorDetailsProps {
  vendor: {
    id: string
    vendorName: string
    companyName: string
    category: string
    gstNumber: string
    panNumber: string
    contactPerson: string
    phone: string
    email: string
    address: string
    country: string
    status: VendorStatus
    notes?: string | null
    createdAt: Date | string
    statusHistory?: Array<{
      id: string
      fromStatus: VendorStatus
      toStatus: VendorStatus
      reason?: string | null
      createdAt: Date | string
      changedBy: { firstName: string; lastName: string }
    }>
    user?: { firstName: string; lastName: string; email: string } | null
  }
  userRole: Role
}

function statusBadge(status: VendorStatus) {
  const styles: Record<VendorStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    BLOCKED: "bg-red-500/10 text-red-500 border-red-500/20",
    SUSPENDED: "bg-muted text-muted-foreground border-border",
  }
  return styles[status]
}

export function VendorDetails({ vendor, userRole }: VendorDetailsProps) {
  const router = useRouter()
  const [newStatus, setNewStatus] = useState<VendorStatus>(vendor.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const isAdmin = userRole === Role.ADMIN

  async function handleStatusUpdate() {
    if (newStatus === vendor.status) return
    setIsUpdating(true)
    const result = await updateVendorStatus(vendor.id, newStatus)
    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
    setIsUpdating(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">{vendor.vendorName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{vendor.companyName}</p>
                </div>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border capitalize",
                statusBadge(vendor.status)
              )}>
                {vendor.status.toLowerCase()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Category</p>
                <p className="font-medium">{vendor.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Contact Person</p>
                <p className="font-medium">{vendor.contactPerson}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">GST Number</p>
                <p className="font-mono font-medium">{vendor.gstNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">PAN Number</p>
                <p className="font-mono font-medium">{vendor.panNumber}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{vendor.address}, {vendor.country}</span>
              </div>
            </div>

            {vendor.notes && (
              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">
                  <FileText className="h-3.5 w-3.5" /> Notes
                </div>
                <p className="text-sm text-muted-foreground">{vendor.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {vendor.statusHistory && vendor.statusHistory.length > 0 && (
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> Status History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendor.statusHistory.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm border-b border-border/20 pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium capitalize">
                      {entry.fromStatus.toLowerCase()} → {entry.toStatus.toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {entry.changedBy.firstName} {entry.changedBy.lastName} · {formatDate(entry.createdAt)}
                    </p>
                    {entry.reason && <p className="text-xs text-muted-foreground mt-1">{entry.reason}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Vendor Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Registered</p>
              <p className="font-medium">{formatDate(vendor.createdAt)}</p>
            </div>
            {vendor.user && (
              <div>
                <p className="text-xs text-muted-foreground">Linked User Account</p>
                <p className="font-medium">{vendor.user.firstName} {vendor.user.lastName}</p>
                <p className="text-xs text-muted-foreground">{vendor.user.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as VendorStatus)}
              >
                <option value={VendorStatus.ACTIVE}>Active</option>
                <option value={VendorStatus.PENDING}>Pending</option>
                <option value={VendorStatus.BLOCKED}>Blocked</option>
                <option value={VendorStatus.SUSPENDED}>Suspended</option>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                disabled={isUpdating || newStatus === vendor.status}
                className="w-full bg-emerald-500 hover:bg-emerald-500/90 text-white cursor-pointer"
              >
                {isUpdating ? "Updating..." : "Update Status"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
