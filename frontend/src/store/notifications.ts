import { create } from 'zustand'
import api from '../lib/api'
import { initializePushNotifications, isPushSupported } from '../lib/pushNotifications'
import { playNotificationSound, isSoundEnabled } from '../lib/notificationSound'

export type Notification = {
  id: number
  type: string
  title: string
  message: string
  board_id?: number
  card_id?: number
  created_at: string
  read: boolean
}

type NotificationState = {
  notifications: Notification[]
  unreadCount: number
  ws: WebSocket | null
  connected: boolean
  connect: (token: string) => void
  disconnect: () => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  loadNotifications: () => Promise<void>
}

const getWebSocketUrl = (token: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '') || 'localhost:8000'
  return `${protocol}//${host}/ws/notifications/?token=${token}`
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  ws: null,
  connected: false,

  connect: (token: string) => {
    // Cerrar conexión existente si hay una
    const { ws } = get()
    if (ws) {
      ws.close()
    }

    try {
      const wsUrl = getWebSocketUrl(token)
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket conectado')
        set({ ws, connected: true })
        // Cargar notificaciones existentes al conectar
        get().loadNotifications()
        // Inicializar notificaciones push si están soportadas
        if (isPushSupported()) {
          initializePushNotifications().catch(error => {
            console.error('Error al inicializar push notifications:', error)
          })
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'notification') {
            get().addNotification(data.data)
          }
        } catch (error) {
          console.error('Error al parsear mensaje WebSocket:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        set({ connected: false })
      }

      ws.onclose = () => {
        console.log('WebSocket desconectado')
        set({ ws: null, connected: false })
        // Reconectar después de 3 segundos
        setTimeout(() => {
          const { connected } = get()
          if (!connected && token) {
            get().connect(token)
          }
        }, 3000)
      }
    } catch (error) {
      console.error('Error al conectar WebSocket:', error)
      set({ connected: false })
    }
  },

  disconnect: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ ws: null, connected: false })
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => {
      // Evitar duplicados
      if (state.notifications.some(n => n.id === notification.id)) {
        return state
      }
      
      // Reproducir sonido si la notificación no está leída y el sonido está habilitado
      if (!notification.read && isSoundEnabled()) {
        playNotificationSound()
      }
      
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
      }
    })
  },

  markAsRead: async (id: number) => {
    try {
      await api.post(`notifications/${id}/mark_read/`)
      set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error)
    }
  },

  markAllAsRead: async () => {
    try {
      await api.post('notifications/mark_all_read/')
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }))
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error)
    }
  },

  loadNotifications: async () => {
    try {
      const { data } = await api.get<Notification[]>('notifications/?unread=true')
      set((state) => {
        // Combinar con notificaciones existentes, evitando duplicados
        const existingIds = new Set(state.notifications.map(n => n.id))
        const newNotifications = data.filter(n => !existingIds.has(n.id))
        return {
          notifications: [...newNotifications, ...state.notifications],
          unreadCount: data.filter(n => !n.read).length
        }
      })
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    }
  }
}))



