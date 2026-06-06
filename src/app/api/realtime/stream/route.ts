import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const POLL_MS = 15_000
const MAX_LIFETIME_MS = 5 * 60_000

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = session.user.id
  let lastNotificationCheck = new Date()
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let lifetimeTimer: ReturnType<typeof setTimeout> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false

      const send = (data: object) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      const cleanup = () => {
        if (closed) return
        closed = true
        if (pollInterval) clearInterval(pollInterval)
        if (lifetimeTimer) clearTimeout(lifetimeTimer)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      send({ type: "connected", at: new Date().toISOString() })

      pollInterval = setInterval(async () => {
        if (closed) return
        try {
          const newNotifications = await prisma.notification.count({
            where: {
              userId,
              isRead: false,
              createdAt: { gt: lastNotificationCheck },
            },
          })

          if (newNotifications > 0) {
            send({ type: "notifications", count: newNotifications })
            lastNotificationCheck = new Date()
          }
        } catch {
          send({ type: "error", message: "Database unavailable" })
        }
      }, POLL_MS)

      lifetimeTimer = setTimeout(cleanup, MAX_LIFETIME_MS)

      // @ts-expect-error - runtime cleanup hook
      controller.cancel = cleanup
    },
    cancel() {
      if (pollInterval) clearInterval(pollInterval)
      if (lifetimeTimer) clearTimeout(lifetimeTimer)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
