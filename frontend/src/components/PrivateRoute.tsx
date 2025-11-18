import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

export function PrivateRoute({ children }: { children: JSX.Element }) {
  const accessToken = useAuthStore(s => s.accessToken)
  const user = useAuthStore(s => s.user)
  const initialize = useAuthStore(s => s.initialize)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Si hay token pero no hay usuario, intentar cargar el usuario
    if (accessToken && !user) {
      initialize()
    }
  }, [accessToken, user, initialize])

  // Esperar a que el componente se monte para evitar problemas de hidratación
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    )
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return children
}

