import { useEffect, useRef } from 'react'

interface SocketMessage {
  type: string
  payload: unknown
}

export function useAdminSocket(onMessage: (msg: SocketMessage) => void) {
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${proto}://${window.location.host}/ws/admin`)
      socket.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data))
        } catch {
          /* ignore malformed */
        }
      }
      socket.onclose = () => {
        if (!closed) reconnectTimer = setTimeout(connect, 3000)
      }
      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])
}
