"use client"

import { useState } from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { Breadcrumbs } from "./breadcrumbs"
import { type Role } from "@prisma/client"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RealtimeProvider } from "@/contexts/realtime-context"

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    firstName: string
    lastName: string
    role: Role
    email: string
  }
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <RealtimeProvider>
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Header
        user={user}
        onToggleSidebar={() => setCollapsed(!collapsed)}
        onOpenMobileSidebar={() => setMobileOpen(true)}
      />

      <div className="flex-1 flex relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
          <Sidebar userRole={user.role} collapsed={collapsed} />
        </div>

        {/* Mobile Sidebar Drawer Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute top-0 left-0 bottom-0 w-64 bg-card z-50 flex flex-col shadow-xl animate-fade-in">
              <div className="h-14 border-b border-border/40 px-4 flex items-center justify-between">
                <span className="font-bold text-sm">Navigation</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg cursor-pointer"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar
                  userRole={user.role}
                  collapsed={false}
                  onCloseMobile={() => setMobileOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 max-w-7xl w-full mx-auto">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </div>
    </RealtimeProvider>
  )
}
