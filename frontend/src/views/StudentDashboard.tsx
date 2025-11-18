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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Estudiante</h1>
            <p className="text-sm text-gray-600">Bienvenido, {user?.first_name || user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Tableros Disponibles</h2>
          <p className="text-sm text-gray-600">
            Tableros de cursos donde eres miembro
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Cargando tableros...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map(board => (
              <div
                key={board.id}
                className="p-4 rounded-lg shadow bg-white border cursor-pointer hover:shadow-md transition"
                style={{ borderTop: `4px solid ${board.color}` }}
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className="font-medium text-gray-900 mb-2">{board.name}</div>
                <div className="text-xs text-gray-500">
                  Docente: {board.owner.username}
                </div>
              </div>
            ))}
            {boards.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-8">
                No tienes acceso a ningún tablero aún. Un docente debe invitarte.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

