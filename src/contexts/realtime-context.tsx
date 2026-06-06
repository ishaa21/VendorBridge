"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react"

export type RealtimeEvent = {
  type: string
  count?: number
  at?: string
  message?: string
}

type Listener = (event: RealtimeEvent) => void

const RealtimeContext = createContext<{
  subscribe: (listener: Listener) => () => void
} | null>(null)

/**
 * Single shared SSE connection for the whole dashboard shell.
 * Avoids duplicate streams and excessive DB polling from multiple EventSources.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef(new Set<Listener>())

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  useEffect(() => {
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      source = new EventSource("/api/realtime/stream")

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as RealtimeEvent
          if (payload.type === "heartbeat" || payload.type === "connected") return
          listenersRef.current.forEach((fn) => fn(payload))
        } catch {
          // ignore malformed events
        }
      }

      source.onerror = () => {
        source?.close()
        source = null
        reconnectTimer = setTimeout(connect, 10_000)
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      source?.close()
    }
  }, [])

  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeEvent(handler: (event: RealtimeEvent) => void, enabled = true) {
  const ctx = useContext(RealtimeContext)
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled || !ctx) return
    return ctx.subscribe((event) => handlerRef.current(event))
  }, [ctx, enabled])
}
