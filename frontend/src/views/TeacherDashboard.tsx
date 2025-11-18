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

export function TeacherDashboard() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#22c55e')

  useEffect(() => {
    // Verificar que el usuario sea docente
    if (user && user.role !== 'teacher') {
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

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const { data } = await api.post<Board>('boards/', { name, color })
      setBoards([data, ...boards])
      setName('')
    } catch (error) {
      console.error('Error al crear tablero:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestor de Tareas</h1>
            <p className="text-sm text-gray-400">¡Hola, {user?.first_name || user?.username}!</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition text-sm"
          >
            Sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Mis Tableros</h2>
          <form onSubmit={createBoard} className="flex gap-2 mb-4">
            <input
              className="bg-gray-800 border border-gray-700 rounded px-4 py-2 flex-1 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del tablero"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer"
            />
            <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
              Crear Tablero
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Cargando tableros...</div>
        ) : boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-2">¡Bienvenido a tu Tablero!</h3>
              <p className="text-gray-400 mb-4">
                Comienza creando un tablero para organizar tus cursos y tareas
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map(board => (
              <div
                key={board.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:bg-gray-750 hover:border-gray-600 transition"
                style={{ borderTop: `4px solid ${board.color}` }}
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className="font-medium text-white mb-2">{board.name}</div>
                <div className="text-xs text-gray-400">
                  {board.members.length} miembro{board.members.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

