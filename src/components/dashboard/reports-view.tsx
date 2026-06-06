"use client"

import { useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Download, AlertCircle, TrendingUp, Building2, FileText, Receipt } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { exportReportAction } from "@/actions/reports"
import { toast } from "sonner"

interface ReportsViewProps {
  data: {
    summary: {
      totalSpend: number
      activeVendors: number
      totalRfqs: number
      submittedQuotations: number
      totalPurchaseOrders: number
      paidInvoices: number
      pendingInvoices: number
    }
    monthlyTrend: Array<{ name: string; spend: number; orders: number }>
    vendorPerformance: Array<{
      name: string
      totalSpend: number
      orderCount: number
      rating: number
    }>
  }
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"]

export function ReportsView({ data }: ReportsViewProps) {
  const [exporting, setExporting] = useState(false)
  const { summary, monthlyTrend, vendorPerformance } = data

  async function handleExport(format: "csv" | "pdf") {
    setExporting(true)
    const result = await exportReportAction(format)
    if (result.success && result.base64Data && result.filename) {
      const link = document.createElement("a")
      link.href = `data:application/octet-stream;base64,${result.base64Data}`
      link.download = result.filename
      link.click()
      toast.success("Report exported successfully")
    } else {
      toast.error(result.message || "Export failed")
    }
    setExporting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">Procurement insights, spending trends, and vendor performance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exporting}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Spend</p>
              <p className="text-xl font-bold">${summary.totalSpend.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Active Vendors</p>
              <p className="text-xl font-bold">{summary.activeVendors}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Active RFQs</p>
              <p className="text-xl font-bold">{summary.totalRfqs}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Pending Invoices</p>
              <p className="text-xl font-bold">{summary.pendingInvoices}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/40">
          <CardHeader>
            <CardTitle className="text-sm">Monthly Procurement Trends</CardTitle>
            <CardDescription className="text-xs">Spending over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="spend" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/40">
          <CardHeader>
            <CardTitle className="text-sm">Vendor Spend Distribution</CardTitle>
            <CardDescription className="text-xs">Spend distribution among key vendors</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={vendorPerformance}
                  dataKey="totalSpend"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${(name as string).split(" ")[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {vendorPerformance.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="text-sm">Vendor Performance Analytics</CardTitle>
          <CardDescription className="text-xs">Exportable vendor performance report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Vendor</th>
                  <th className="p-3 text-right">Total Spend</th>
                  <th className="p-3 text-center">Orders</th>
                  <th className="p-3 text-center">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {vendorPerformance.map((vendor) => (
                  <tr key={vendor.name} className="hover:bg-accent/20">
                    <td className="p-3 font-medium">{vendor.name}</td>
                    <td className="p-3 text-right font-mono">${vendor.totalSpend.toLocaleString()}</td>
                    <td className="p-3 text-center">{vendor.orderCount}</td>
                    <td className="p-3 text-center">
                      <span className="text-emerald-500 font-semibold">{vendor.rating}/5</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={vendorPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="totalSpend" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
