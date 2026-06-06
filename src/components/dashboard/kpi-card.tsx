import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import * as LucideIcons from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  label: string
  iconName?: string
}

export function KPICard({ title, value, label, iconName }: KPICardProps) {
  const Icon = iconName ? ((LucideIcons as any)[iconName] || LucideIcons.TrendingUp) : LucideIcons.TrendingUp

  return (
    <Card className="interactive-hover border-border/40 glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-extrabold tracking-tight mt-1">
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 truncate">
          {label}
        </p>
      </CardContent>
    </Card>
  )
}
