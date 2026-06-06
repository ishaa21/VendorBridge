"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

type RealtimePollOptions = {
  intervalMs?: number
  enabled?: boolean
  onTick?: () => void
  /** When true, only runs onTick — no router.refresh (much faster). Default: true when onTick is set. */
  skipRouterRefresh?: boolean
}

/**
 * Lightweight background refresh. Prefer useRealtimeEvent from realtime-context for push updates.
 */
export function useRealtimePoll({
  intervalMs = 30_000,
  enabled = true,
  onTick,
  skipRouterRefresh,
}: RealtimePollOptions = {}) {
  const router = useRouter()
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick
  const shouldSkipRefresh = skipRouterRefresh ?? !!onTick

  const refresh = useCallback(() => {
    if (!shouldSkipRefresh) router.refresh()
    onTickRef.current?.()
  }, [router, shouldSkipRefresh])

  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      if (document.visibilityState === "hidden") return
      refresh()
    }

    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs, refresh])

  return { refresh }
}

/** @deprecated Use useRealtimeEvent from @/contexts/realtime-context instead */
export function useRealtimeStream(
  onEvent: (payload: { type: string; data?: unknown }) => void,
  enabled = true
) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!enabled) return

    const source = new EventSource("/api/realtime/stream")

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === "heartbeat" || payload.type === "connected") return
        onEventRef.current(payload)
      } catch {
        // ignore
      }
    }

    source.onerror = () => source.close()
    return () => source.close()
  }, [enabled])
}
