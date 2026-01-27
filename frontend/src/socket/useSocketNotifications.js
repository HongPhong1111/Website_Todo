import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../auth/auth'

export function useSocketNotifications(onNotification) {
  const socketRef = useRef(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const socket = io(import.meta.env.VITE_API_BASE || 'http://localhost:4000', {
      auth: { token },
    })

    socket.on('notification', (payload) => {
      onNotification?.(payload)
    })

    socketRef.current = socket
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [onNotification])

  return socketRef
}
