import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const esRef = useRef(null)
  const dismissedRef = useRef(new Set())
  const reconnectTimerRef = useRef(null)
  const reconnectDelayRef = useRef(2000)

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    try {
      const es = new EventSource(`${API_BASE}/notifications/stream`)
      esRef.current = es

      es.addEventListener('alert', (event) => {
        try {
          const incoming = JSON.parse(event.data)
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id))
            const fresh = incoming.filter(
              n => !existingIds.has(n.id) && !dismissedRef.current.has(n.id)
            )
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
        } catch {
          // ignore malformed events
        }
      })

      es.onopen = () => {
        reconnectDelayRef.current = 2000
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000)
          connect()
        }, reconnectDelayRef.current)
      }
    } catch {
      // SSE not available in this environment
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (esRef.current) esRef.current.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [connect])

  const dismiss = useCallback((id) => {
    dismissedRef.current.add(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => dismissedRef.current.add(n.id))
      return []
    })
  }, [])

  return { notifications, dismiss, dismissAll }
}
