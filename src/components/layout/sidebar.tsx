"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type Role } from "@prisma/client"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/lib/constants"

interface SidebarProps {
  userRole: Role
  collapsed?: boolean
  onCloseMobile?: () => void
}

export function Sidebar({ userRole, collapsed, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()

  // Filter items by role
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border/40 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Scrollable menu area */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filteredItems.map((item) => {
          // Check if active
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          // Resolve dynamic lucide icon
          const Icon = (LucideIcons as any)[item.icon] || LucideIcons.HelpCircle

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "text-emerald-500 bg-emerald-500/5 border-l-4 border-emerald-500 rounded-l-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-emerald-500" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              
              {!collapsed && (
                <span className="truncate">{item.title}</span>
              )}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                  {item.title}
                </div>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
