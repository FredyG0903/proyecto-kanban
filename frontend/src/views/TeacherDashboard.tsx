import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useNavigate } from 'react-router-dom'

type Board = {
  id: number
  name: string
  color: string
  due_date: string | null
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
  const [dueDate, setDueDate] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#22c55e')
  const [editDueDate, setEditDueDate] = useState('')

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
      const { data } = await api.post<Board>('boards/', { 
        name, 
        color,
        due_date: dueDate || null
      })
      setBoards([data, ...boards])
      setName('')
      setDueDate('')
    } catch (error) {
      console.error('Error al crear tablero:', error)
    }
  }

  const openEditModal = (board: Board) => {
    setEditingBoard(board)
    setEditName(board.name)
    setEditColor(board.color)
    setEditDueDate(board.due_date || '')
  }

  const closeEditModal = () => {
    setEditingBoard(null)
    setEditName('')
    setEditColor('#22c55e')
    setEditDueDate('')
  }

  const updateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBoard || !editName.trim()) return
    try {
      const { data } = await api.patch<Board>(`boards/${editingBoard.id}/`, {
        name: editName,
        color: editColor,
        due_date: editDueDate || null
      })
      setBoards(boards.map(b => (b.id === editingBoard.id ? data : b)))
      closeEditModal()
    } catch (error) {
      console.error('Error al actualizar tablero:', error)
      alert('Error al actualizar el tablero')
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition text-sm"
            >
              👤 Mi Perfil
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition text-sm"
            >
              Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Mis Tableros</h2>
          <form onSubmit={createBoard} className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input
                className="bg-gray-800 border border-gray-700 rounded px-4 py-2 flex-1 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del tablero"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                className="bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fecha límite del proyecto"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                Crear Tablero
              </button>
            </div>
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
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:bg-gray-750 hover:border-gray-600 transition relative"
                style={{ borderTop: `4px solid ${board.color}` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div 
                    className="font-medium text-white flex-1 cursor-pointer"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    {board.name}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditModal(board)
                    }}
                    className="ml-2 text-gray-400 hover:text-white transition"
                    title="Editar tablero"
                  >
                    ✏️
                  </button>
                </div>
                <div 
                  className="text-xs text-gray-400 cursor-pointer"
                  onClick={() => navigate(`/board/${board.id}`)}
                >
                  {board.members.length} miembro{board.members.length !== 1 ? 's' : ''}
                </div>
                {board.due_date && (
                  <div 
                    className="text-xs text-gray-500 mt-1 cursor-pointer"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    📅 {new Date(board.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Edición de Tablero */}
      {editingBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeEditModal}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Editar Tablero</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={updateBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Nombre del tablero</label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del tablero"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Color</label>
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="h-10 w-full cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Fecha límite del proyecto</label>
                <input
                  type="date"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Perfil */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowProfile(false)}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Mi Perfil</h2>
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
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

