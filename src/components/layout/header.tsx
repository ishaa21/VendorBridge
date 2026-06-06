"use client"

import { signOut } from "next-auth/react"
import { Menu, LogOut, ChevronDown } from "lucide-react"
import { NotificationsPanel } from "./notifications-panel"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState } from "react"

interface HeaderProps {
  user: {
    firstName: string
    lastName: string
    role: string
    email: string
  }
  onToggleSidebar: () => void
  onOpenMobileSidebar: () => void
}

export function Header({ user, onToggleSidebar, onOpenMobileSidebar }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()

  return (
    <header className="h-14 border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-4">
      {/* Left side: Logo & Toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:flex hidden h-9 w-9 rounded-lg"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex h-9 w-9 rounded-lg"
          onClick={onOpenMobileSidebar}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="text-primary font-bold text-sm">VB</span>
          </div>
          <span className="font-bold text-sm tracking-wide hidden sm:block">VendorBridge</span>
        </div>
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <ThemeToggle />

        <NotificationsPanel />

        {/* User profile avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-secondary/50 p-1.5 rounded-lg transition-colors text-left cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-medium leading-none">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
                {user.role.replace("_", " ")}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-20 py-1 animate-scale-in">
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-xs font-medium truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
