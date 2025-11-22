import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '@/store/notifications'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'

export function NotificationBell() {
  const { accessToken } = useAuthStore()
  const { theme } = useThemeStore()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  const {
    notifications,
    unreadCount,
    connected,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    loadNotifications
  } = useNotificationStore()

  useEffect(() => {
    if (accessToken) {
      connect(accessToken)
      loadNotifications()
      return () => disconnect()
    }
  }, [accessToken])

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8, // 8px de margen
        right: window.innerWidth - rect.right
      })
    }
  }, [showDropdown])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    await markAsRead(notification.id)
    if (notification.board_id) {
      navigate(`/board/${notification.board_id}`)
      setShowDropdown(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours} h`
    if (days < 7) return `Hace ${days} días`
    return date.toLocaleDateString('es-ES')
  }

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className={`relative btn-primary rounded-full w-10 h-10 flex items-center justify-center p-0 ${
            theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          title="Notificaciones"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {!connected && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500 rounded-full border-2 border-white"></span>
          )}
        </button>
      </div>

      {showDropdown && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed w-80 max-h-96 overflow-y-auto rounded-lg shadow-xl ${
            theme === 'dark'
              ? 'bg-gray-800 bg-opacity-95 backdrop-blur-md border border-gray-700'
              : 'bg-white bg-opacity-95 backdrop-blur-md border border-gray-300'
          }`}
          style={{ 
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 99999
          }}
        >
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={`text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className={`p-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? notification.read
                        ? 'border-gray-700 hover:bg-gray-700'
                        : 'border-gray-600 bg-blue-900 bg-opacity-20 hover:bg-gray-700'
                      : notification.read
                      ? 'border-gray-200 hover:bg-gray-50'
                      : 'border-gray-200 bg-blue-50 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p
                        className={`font-medium mb-1 ${
                          theme === 'dark'
                            ? notification.read
                              ? 'text-gray-300'
                              : 'text-white'
                            : notification.read
                            ? 'text-gray-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p
                        className={`text-sm mb-2 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <span
                        className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                    {!notification.read && (
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

