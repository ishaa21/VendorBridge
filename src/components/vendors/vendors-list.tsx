"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { VendorStatus } from "@prisma/client"
import { Search, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getVendorsList } from "@/actions/vendors"

interface Vendor {
  id: string
  vendorName: string
  category: string
  gstNumber: string
  phone: string
  status: VendorStatus
}

interface VendorsListProps {
  initialVendors: Vendor[]
  initialStatusCounts: {
    all: number
    active: number
    pending: number
    blocked: number
  }
}

const STATUS_TABS = [
  { key: "ALL", label: "All", countKey: "all" as const },
  { key: VendorStatus.ACTIVE, label: "Active", countKey: "active" as const },
  { key: VendorStatus.PENDING, label: "Pending", countKey: "pending" as const },
  { key: VendorStatus.BLOCKED, label: "Blocked", countKey: "blocked" as const },
]

function statusBadge(status: VendorStatus) {
  const styles: Record<VendorStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    BLOCKED: "bg-red-500/10 text-red-500 border-red-500/20",
    SUSPENDED: "bg-muted text-muted-foreground border-border",
  }
  return styles[status] || styles.PENDING
}

export function VendorsList({
  initialVendors,
  initialStatusCounts,
}: VendorsListProps) {
  const [vendors, setVendors] = useState(initialVendors)
  const [statusCounts, setStatusCounts] = useState(initialStatusCounts)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("ALL")
  const [isPending, startTransition] = useTransition()

  function refresh(searchVal: string, status: string) {
    startTransition(async () => {
      const result = await getVendorsList({ search: searchVal || undefined, status })
      if (result.success) {
        setVendors(result.vendors as Vendor[])
        setStatusCounts(result.statusCounts)
      }
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    refresh(search, activeTab)
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    refresh(search, tab)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, GST number, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-secondary/50 border-border/50"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
              activeTab === tab.key
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/60"
            )}
          >
            {tab.label} ({statusCounts[tab.countKey]})
          </button>
        ))}
      </div>

      <Card className="glass-card border-border/50 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">GST No.</th>
                  <th className="p-4">Contact No.</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y divide-border/20", isPending && "opacity-60")}>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      No vendors found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-accent/20 transition-colors">
                      <td className="p-4 font-semibold">{vendor.vendorName}</td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-muted/80 border font-medium">
                          {vendor.category}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">{vendor.gstNumber}</td>
                      <td className="p-4 text-muted-foreground">{vendor.phone}</td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize",
                          statusBadge(vendor.status)
                        )}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {vendor.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Link href={`/dashboard/vendors/${vendor.id}`}>
                          <Button variant="outline" size="sm" className="text-xs cursor-pointer">
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
