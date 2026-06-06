"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type Role } from "@prisma/client"
import { KPICard } from "./kpi-card"
import { QuickActions } from "./quick-actions"
import { RecentOrdersWidget } from "./recent-orders-widget"
import { AnalyticsCharts } from "./analytics-charts"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import DashboardLoading from "@/app/(dashboard)/dashboard/loading"
import { useRealtimeEvent } from "@/contexts/realtime-context"

interface User {
  firstName: string
  lastName: string
  role: Role
  email: string
}

interface DashboardClientProps {
  user: User
}

export function DashboardClient({ user }: DashboardClientProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchDashboardData = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true)
      setError(null)

      const [overviewRes, ordersRes, analyticsRes] = await Promise.all([
        fetch("/api/dashboard/overview"),
        fetch("/api/dashboard/recent-orders"),
        fetch("/api/dashboard/analytics"),
      ])

      if (!overviewRes.ok || !ordersRes.ok || !analyticsRes.ok) {
        const errBody = await overviewRes.json().catch(() => ({}))
        throw new Error(errBody.error || "Failed to fetch dashboard data. Check database connection.")
      }

      const overviewData = await overviewRes.json()
      const ordersData = await ordersRes.json()
      const analyticsData = await analyticsRes.json()

      setOverview(overviewData)
      setRecentOrders(ordersData.data || [])
      setAnalytics(analyticsData.data || null)
    } catch (err: unknown) {
      console.error("Dashboard data fetching error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData(true)
  }, [fetchDashboardData])

  useRealtimeEvent((event) => {
    if (event.type !== "notifications" && event.type !== "activity") return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchDashboardData(false), 600)
  })

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (loading) {
    return <DashboardLoading />
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-destructive rounded-xl">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="font-bold text-sm">Error Loading Dashboard</h3>
            <p className="text-xs opacity-90 mt-0.5">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const kpis = overview?.data?.kpi || []
  const roleStats = overview?.data?.roleStats

  const getIconForTitle = (title: string) => {
    const t = title.toLowerCase()
    if (t.includes("rfq") || t.includes("quotation") || t.includes("bid")) return "FileText"
    if (t.includes("approval") || t.includes("escalated")) return "ShieldCheck"
    if (t.includes("po") || t.includes("purchase order")) return "TrendingUp"
    if (t.includes("invoice")) return "Receipt"
    if (t.includes("vendor") || t.includes("user")) return "Building2"
    return "TrendingUp"
  }

  const showCharts = user.role !== "VENDOR"

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi: any) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            label={kpi.label}
            iconName={getIconForTitle(kpi.title)}
          />
        ))}
      </div>

      {user.role === "ADMIN" && roleStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-border/40 glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Registered Users</p>
              <h4 className="text-2xl font-bold mt-1">{roleStats.totalUsers}</h4>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <span className="text-sm font-semibold">User</span>
            </div>
          </Card>
          <Card className="border-border/40 glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Onboarded Vendors</p>
              <h4 className="text-2xl font-bold mt-1">{roleStats.totalVendors}</h4>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <span className="text-sm font-semibold">Vend</span>
            </div>
          </Card>
        </div>
      )}

      {(user.role === "ADMIN" || user.role === "PROCUREMENT_OFFICER") && (
        <QuickActions />
      )}

      <div className="space-y-6">
        {showCharts && analytics && (
          <AnalyticsCharts
            trendData={analytics.trend || []}
            distributionData={analytics.distribution || []}
          />
        )}

        <RecentOrdersWidget orders={recentOrders} />
      </div>
    </div>
  )
}
