import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useNavigate } from 'react-router-dom'
import { BACKGROUND_IMAGE_URL } from '@/config/background'
import { useThemeStore } from '@/store/theme'
import { NotificationBell } from '@/components/NotificationBell'
import { isSoundEnabled, setSoundEnabled } from '@/lib/notificationSound'

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
  const updateProfile = useAuthStore(s => s.updateProfile)
  const deleteAccount = useAuthStore(s => s.deleteAccount)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#22c55e')
  const [dueDate, setDueDate] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled())
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

  const handleEditClick = () => {
    setIsEditing(true)
    setEditForm({
      username: user?.username || '',
      email: user?.email || '',
      password: '',
      confirmPassword: ''
    })
    setError(null)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
    setError(null)
  }

  const handleSaveProfile = async () => {
    setError(null)
    
    // Validaciones
    if (editForm.password && editForm.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setSaving(true)
    try {
      const payload: { username?: string; email?: string; password?: string } = {}
      if (editForm.username !== user?.username) {
        payload.username = editForm.username
      }
      if (editForm.email !== user?.email) {
        payload.email = editForm.email
      }
      if (editForm.password) {
        payload.password = editForm.password
      }

      await updateProfile(payload)
      await fetchMe()
      setIsEditing(false)
      setEditForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      })
    } catch (e: any) {
      setError(e?.response?.data?.username?.[0] || 
               e?.response?.data?.email?.[0] || 
               e?.response?.data?.password?.[0] ||
               e?.response?.data?.detail ||
               'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)
    setError(null)
    try {
      await deleteAccount()
      logout()
      navigate('/login', { replace: true })
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Error al eliminar la cuenta')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
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

  const deleteBoard = async (boardId: number) => {
    if (!confirm('¿Estás seguro de eliminar este tablero? Esta acción no se puede deshacer y se eliminarán todas las listas y tarjetas.')) {
      return
    }
    try {
      await api.delete(`boards/${boardId}/`)
      setBoards(boards.filter(b => b.id !== boardId))
    } catch (error: any) {
      console.error('Error al eliminar tablero:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || 'Error al eliminar el tablero'
      alert(errorMessage)
    }
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
    <div 
      className={`min-h-screen relative transition-colors duration-300 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}
      style={{
        backgroundImage: BACKGROUND_IMAGE_URL,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {theme === 'dark' && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-all duration-300"></div>
      )}
      <div className="relative z-10">
      {/* Header */}
      <header className={`bg-opacity-60 backdrop-blur-md border-b px-6 py-4 transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-300'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Gestor de Tareas</h1>
            <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>¡Hola, {user?.username}!</p>
            <p className={`font-medium ${theme === 'dark' ? 'text-sm text-blue-400' : 'text-base text-blue-600'}`}>Docente</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => navigate('/calendar')}
              className={`btn-secondary text-sm ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
              title="Ver calendario"
            >
              📅 Calendario
            </button>
            <button
              onClick={() => setShowProfile(true)}
              className="btn-secondary text-sm"
            >
              👤 Mi Perfil
            </button>
            <button
              onClick={logout}
              className="btn-danger text-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mis Tableros</h2>
          <form onSubmit={createBoard} className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input
                className="input-modern flex-1"
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
                className="input-modern"
                placeholder="Fecha límite del proyecto"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <button className="btn-primary">
                Crear Tablero
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className={`text-center py-8 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>Cargando tableros...</div>
        ) : boards.length === 0 ? (
          <div className="text-center py-16">
            <div className={`bg-opacity-60 backdrop-blur-md rounded-lg p-8 max-w-md mx-auto ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>¡Bienvenido a tu Tablero!</h3>
              <p className={`mb-4 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>
                Comienza creando un tablero para organizar tus cursos y tareas
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map(board => (
              <div
                key={board.id}
                className="card-modern relative"
                style={{ borderTop: `4px solid ${board.color}` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div 
                    className={`font-semibold flex-1 cursor-pointer ${theme === 'dark' ? 'text-white text-base' : 'text-gray-900 text-lg'}`}
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    {board.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(board)
                      }}
                      className={`transition-colors ${
                        theme === 'dark' 
                          ? 'text-gray-400 hover:text-white' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                      title="Editar tablero"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBoard(board.id)
                      }}
                      className={`transition-colors ${
                        theme === 'dark' 
                          ? 'text-red-400 hover:text-red-300' 
                          : 'text-red-600 hover:text-red-700'
                      }`}
                      title="Eliminar tablero"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div 
                  className={`cursor-pointer font-medium ${theme === 'dark' ? 'text-xs text-gray-400' : 'text-sm text-gray-800'}`}
                  onClick={() => navigate(`/board/${board.id}`)}
                >
                  {board.members.length} miembro{board.members.length !== 1 ? 's' : ''}
                </div>
                {board.due_date && (
                  <div 
                    className={`mt-1 cursor-pointer font-medium ${theme === 'dark' ? 'text-xs text-gray-500' : 'text-sm text-gray-700'}`}
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
          <div className={`bg-opacity-70 backdrop-blur-md rounded-lg p-6 w-full max-w-md transition-all duration-300 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
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
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Nombre del tablero</label>
                <input
                  type="text"
                  className="input-modern"
                  placeholder="Nombre del tablero"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Color</label>
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="h-10 w-full cursor-pointer"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Fecha límite del proyecto</label>
                <input
                  type="date"
                  className="input-modern"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowProfile(false)}>
          <div className={`bg-opacity-70 backdrop-blur-md rounded-lg w-full max-w-md transition-all duration-300 my-auto ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            {/* Header fijo */}
            <div className={`flex items-center justify-between p-6 pb-4 border-b border-opacity-20 sticky top-0 z-10 backdrop-blur-sm bg-opacity-90 rounded-t-lg ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
            }`}>
              <h2 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mi Perfil</h2>
              <button
                onClick={() => setShowProfile(false)}
                className={`text-2xl transition-colors ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ×
              </button>
            </div>
            
            {/* Contenido con scroll */}
            <div className="p-6 pt-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {error && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${theme === 'dark' ? 'bg-red-900 bg-opacity-50 text-red-200' : 'bg-red-100 text-red-700'}`}>
                  {error}
                </div>
              )}
              <div className="space-y-4">
              <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>Usuario</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                ) : (
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.username || 'N/A'}</p>
                )}
              </div>
              <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark' 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                ) : (
                  <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.email || 'N/A'}</p>
                )}
              </div>
              {isEditing && (
                <>
                  <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>
                      Nueva Contraseña (dejar vacío para no cambiar)
                    </label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className={`w-full px-3 py-2 rounded border ${
                        theme === 'dark' 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  {editForm.password && (
                    <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>
                        Confirmar Contraseña
                      </label>
                      <input
                        type="password"
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                        className={`w-full px-3 py-2 rounded border ${
                          theme === 'dark' 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Repite la contraseña"
                      />
                    </div>
                  )}
                </>
              )}
              <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>ID (10 dígitos)</label>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.id_number || 'N/A'}</p>
              </div>
              <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>Rol</label>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {user?.role === 'teacher' ? 'Docente' : user?.role === 'student' ? 'Estudiante' : 'N/A'}
                </p>
              </div>
              </div>
            </div>
            
            {/* Footer fijo con botones */}
            <div className={`p-6 pt-4 border-t border-opacity-20 sticky bottom-0 backdrop-blur-sm bg-opacity-90 rounded-b-lg ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className={`p-2 rounded-lg transition-all duration-200 text-xl ${
                      theme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  >
                    {theme === 'dark' ? '☀️' : '🌙'}
                  </button>
                  <button
                    onClick={() => {
                      const newValue = !soundEnabled
                      setSoundEnabledState(newValue)
                      setSoundEnabled(newValue)
                    }}
                    className={`p-2 rounded-lg transition-all duration-200 text-xl ${
                      theme === 'dark' 
                        ? soundEnabled
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-800 hover:bg-gray-700 opacity-50'
                        : soundEnabled
                        ? 'bg-gray-200 hover:bg-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 opacity-50'
                    }`}
                    title={soundEnabled ? 'Desactivar sonido de notificaciones' : 'Activar sonido de notificaciones'}
                  >
                    {soundEnabled ? '🔔' : '🔕'}
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="btn-secondary text-sm px-4 py-2"
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="btn-primary text-sm px-4 py-2"
                        disabled={saving}
                      >
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditClick}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setShowProfile(false)
                        }}
                        className="btn-secondary text-sm px-4 py-2"
                      >
                        Cerrar
                      </button>
                    </>
                  )}
                </div>
              </div>
              {!isEditing && (
                <div className="mt-4 pt-4 border-t border-opacity-20">
                  <button
                    onClick={handleDeleteAccount}
                    className={`w-full text-sm px-4 py-2 rounded-lg transition-colors ${
                      showDeleteConfirm
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    disabled={deleting}
                  >
                    {deleting 
                      ? 'Eliminando cuenta...' 
                      : showDeleteConfirm 
                        ? '⚠️ Confirmar eliminación de cuenta' 
                        : '🗑️ Eliminar cuenta'}
                  </button>
                  {showDeleteConfirm && (
                    <p className={`mt-2 text-xs text-center ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
                      Esta acción no se puede deshacer. Se eliminarán todos tus datos.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

