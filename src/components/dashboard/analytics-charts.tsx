"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts"

interface AnalyticsChartsProps {
  trendData: { name: string; spend: number }[]
  distributionData: { name: string; value: number }[]
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280"]

export function AnalyticsCharts({ trendData, distributionData }: AnalyticsChartsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/40 h-[380px] animate-pulse bg-card/40" />
        <Card className="border-border/40 h-[380px] animate-pulse bg-card/40" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 6 Months Spend Trend Area Chart */}
      <Card className="lg:col-span-2 border-border/40 glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Spending Trends</CardTitle>
          <CardDescription className="text-xs">Last 6 months procurement spend (paid invoices)</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: string | number) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                labelStyle={{ fontSize: "12px", fontWeight: "600" }}
                itemStyle={{ fontSize: "12px", color: "hsl(var(--foreground))" }}
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Spend"]}
              />
              <Area type="monotone" dataKey="spend" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vendor Contribution Pie Chart */}
      <Card className="border-border/40 glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Vendor Contribution</CardTitle>
          <CardDescription className="text-xs">Spend distribution among key vendors</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col justify-between">
          {distributionData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              No data available
            </div>
          ) : (
            <>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      itemStyle={{ fontSize: "12px", color: "hsl(var(--foreground))" }}
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Share"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend list */}
              <div className="space-y-1">
                {distributionData.slice(0, 3).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold shrink-0">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
