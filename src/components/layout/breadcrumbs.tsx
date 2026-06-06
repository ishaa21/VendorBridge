"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
  const pathname = usePathname()
  
  if (pathname === "/" || pathname === "/dashboard") return null

  const segments = pathname.split("/").filter(Boolean)

  return (
    <nav className="flex items-center gap-2 text-xs text-muted-foreground py-2" aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>
      
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        // Skip ID parameters from breadcrumb naming
        if (segment.length > 20 && !isNaN(Number(segment.charAt(0))) || segment.startsWith("cui")) {
          return null;
        }

        const href = `/${segments.slice(0, index + 1).join("/")}`
        const label = segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())

        return (
          <div key={href} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
            {isLast ? (
              <span className="font-medium text-foreground truncate">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors truncate"
              >
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
