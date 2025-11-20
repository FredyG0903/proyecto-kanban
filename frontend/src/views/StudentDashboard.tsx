import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useNavigate } from 'react-router-dom'

type Board = {
  id: number
  name: string
  color: string
  owner: { id: number; username: string }
  members: Array<{ id: number; username: string }>
}

export function StudentDashboard() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    // Verificar que el usuario sea estudiante
    if (user && user.role !== 'student') {
      navigate('/login', { replace: true })
      return
    }
    loadBoards()
  }, [user, navigate])

  const loadBoards = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Board[]>('boards/')
      setBoards(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Estudiante</h1>
            <p className="text-sm text-gray-400">Bienvenido, {user?.first_name || user?.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition"
            >
              👤 Mi Perfil
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Tableros Disponibles</h2>
          <p className="text-sm text-gray-400">
            Tableros de cursos donde eres miembro
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Cargando tableros...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map(board => (
              <div
                key={board.id}
                className="p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-750 hover:border-gray-600 transition"
                style={{ borderTop: `4px solid ${board.color}` }}
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className="font-medium text-white mb-2">{board.name}</div>
                <div className="text-xs text-gray-400">
                  Docente: {board.owner.username}
                </div>
              </div>
            ))}
            {boards.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-8">
                No tienes acceso a ningún tablero aún. Un docente debe invitarte.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Perfil */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowProfile(false)}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="text-sm text-gray-400 block mb-1">Usuario</label>
                <p className="text-white font-medium">{user?.username || 'N/A'}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="text-sm text-gray-400 block mb-1">Email</label>
                <p className="text-white font-medium">{user?.email || 'N/A'}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="text-sm text-gray-400 block mb-1">ID (10 dígitos)</label>
                <p className="text-white font-medium">{user?.id_number || 'N/A'}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <label className="text-sm text-gray-400 block mb-1">Rol</label>
                <p className="text-white font-medium">
                  {user?.role === 'teacher' ? 'Docente' : user?.role === 'student' ? 'Estudiante' : 'N/A'}
                </p>
              </div>
              {user?.first_name && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <label className="text-sm text-gray-400 block mb-1">Nombre</label>
                  <p className="text-white font-medium">{user.first_name} {user.last_name || ''}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowProfile(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

