"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications"
import { useRealtimeEvent } from "@/contexts/realtime-context"
import { cn } from "@/lib/utils"

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = useCallback(async () => {
    const result = await getNotifications()
    if (result.success) {
      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (open) loadNotifications()
  }, [open, loadNotifications])

  useRealtimeEvent((event) => {
    if (event.type === "notifications") {
      setUnreadCount((c) => c + (event.count ?? 1))
      if (open) loadNotifications()
    }
  })

  async function handleMarkRead(id: string) {
    await markNotificationRead(id)
    loadNotifications()
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    loadNotifications()
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-lg relative"
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl z-50 animate-scale-in">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No notifications yet</p>
            ) : (
              <ul className="divide-y divide-border/30">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "p-3 hover:bg-accent/30 transition-colors",
                      !n.isRead && "bg-emerald-500/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => {
                              handleMarkRead(n.id)
                              setOpen(false)
                            }}
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                          >
                            View
                          </Link>
                        )}
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
