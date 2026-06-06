import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, Building2, Receipt, Plus } from "lucide-react"

export function QuickActions() {
  const actions = [
    {
      title: "New RFQ",
      description: "Create request for quotation",
      href: "/dashboard/rfqs/new",
      icon: FileText,
      color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
    },
    {
      title: "Add Vendor",
      description: "Onboard supplier partners",
      href: "/dashboard/vendors/new",
      icon: Building2,
      color: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
    },
    {
      title: "View Invoices",
      description: "Track payments & approvals",
      href: "/dashboard/invoices",
      icon: Receipt,
      color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
    },
  ]

  return (
    <Card className="border-border/40 glass-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        <CardDescription className="text-xs">Shortcuts to common procurement tasks</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((act) => (
          <Link
            key={act.title}
            href={act.href}
            className="flex items-center gap-4 p-4 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-secondary/40 transition-all duration-200 group text-left cursor-pointer"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${act.color}`}>
              <act.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                <span>{act.title}</span>
                <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{act.description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
