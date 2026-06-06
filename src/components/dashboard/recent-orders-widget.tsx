import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

interface OrderRow {
  id: string
  poNumber: string
  vendorName: string
  amount: number
  status: string
}

interface RecentOrdersWidgetProps {
  orders: OrderRow[]
}

export function RecentOrdersWidget({ orders }: RecentOrdersWidgetProps) {
  return (
    <Card className="border-border/40 glass-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Recent Purchase Orders</CardTitle>
        <CardDescription className="text-xs">Latest 5 purchase orders issued</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold bg-secondary/30">
                <th className="px-6 py-3">PO Number</th>
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-xs text-muted-foreground">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  let badgeColor = "bg-secondary text-secondary-foreground"
                  switch (order.status) {
                    case "DRAFT":
                      badgeColor = "bg-slate-500/10 text-slate-500 border-slate-500/20"
                      break
                    case "ISSUED":
                      badgeColor = "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      break
                    case "ACKNOWLEDGED":
                      badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      break
                    case "DELIVERED":
                      badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      break
                    case "CANCELLED":
                      badgeColor = "bg-red-500/10 text-red-500 border-red-500/20"
                      break
                  }

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border/30 hover:bg-secondary/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3.5 font-medium text-foreground group-hover:text-primary transition-colors">
                        <Link href={`/dashboard/purchase-orders/${order.id}`}>
                          {order.poNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground truncate max-w-[180px]">
                        {order.vendorName}
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold">
                        ${order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${badgeColor}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
