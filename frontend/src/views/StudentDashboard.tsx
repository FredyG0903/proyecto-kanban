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
  owner: { id: number; username: string }
  members: Array<{ id: number; username: string }>
}

type Card = {
  id: number
  title: string
  description: string
  due_date: string | null
  priority: 'low' | 'med' | 'high'
  list: number
  assignees: Array<{ id: number; username: string }>
}

export function StudentDashboard() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const updateProfile = useAuthStore(s => s.updateProfile)
  const deleteAccount = useAuthStore(s => s.deleteAccount)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
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
  const [myCards, setMyCards] = useState<Card[]>([])
  const [soonCards, setSoonCards] = useState<Card[]>([])
  const [overdueCards, setOverdueCards] = useState<Card[]>([])
  const [loadingCards, setLoadingCards] = useState(false)
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled())

  useEffect(() => {
    // Verificar que el usuario sea estudiante
    if (user && user.role !== 'student') {
      navigate('/login', { replace: true })
      return
    }
    loadBoards()
    if (user) {
      loadMyCards()
    }
  }, [user, navigate])

  const loadBoards = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Board[]>('boards/')
      setBoards(data)
    } catch (error) {
      console.error('Error al cargar tableros:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMyCards = async () => {
    if (!user) return
    setLoadingCards(true)
    try {
      // Cargar tarjetas asignadas a mí
      const { data: assignedCards } = await api.get<Card[]>(`cards/search/?assignee=${user.id}`)
      setMyCards(assignedCards)

      // Cargar tarjetas próximas a vencer (próximos 7 días)
      const { data: soonData } = await api.get<Card[]>(`cards/search/?due=soon`)
      setSoonCards(soonData)

      // Cargar tarjetas vencidas
      const { data: overdueData } = await api.get<Card[]>(`cards/search/?due=overdue`)
      setOverdueCards(overdueData)
    } catch (error) {
      console.error('Error al cargar tarjetas:', error)
    } finally {
      setLoadingCards(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500'
      case 'med':
        return 'text-yellow-500'
      case 'low':
        return 'text-green-500'
      default:
        return 'text-gray-500'
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
      <header className={`bg-opacity-60 backdrop-blur-md border-b transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-300'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Dashboard Estudiante</h1>
            <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Bienvenido, {user?.username}</p>
            <p className={`font-medium ${theme === 'dark' ? 'text-sm text-green-400' : 'text-base text-green-600'}`}>Estudiante</p>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Sección de Filtros de Tarjetas */}
        <div className="mb-8">
          <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mis Tareas</h2>
          
          {loadingCards ? (
            <div className={`text-center py-4 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>Cargando tareas...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Tarjetas Asignadas a Mí */}
              <div className={`card-modern ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  📋 Mis Asignaciones ({myCards.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {myCards.length === 0 ? (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No tienes tareas asignadas</p>
                  ) : (
                    myCards.slice(0, 5).map(card => (
                      <div
                        key={card.id}
                        className={`p-2 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                        onClick={() => navigate(`/board/${card.list}/card/${card.id}`)}
                      >
                        <div className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {card.title}
                        </div>
                        {card.due_date && (
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            📅 {formatDate(card.due_date)}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${getPriorityColor(card.priority)}`}>
                          Prioridad: {card.priority}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {myCards.length > 5 && (
                  <button
                    onClick={() => navigate('/dashboard/student?filter=my-assignments')}
                    className={`mt-2 text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    Ver todas ({myCards.length})
                  </button>
                )}
              </div>

              {/* Tarjetas Próximas a Vencer */}
              <div className={`card-modern ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  ⏰ Próximas a Vencer ({soonCards.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {soonCards.length === 0 ? (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No hay tareas próximas a vencer</p>
                  ) : (
                    soonCards.slice(0, 5).map(card => (
                      <div
                        key={card.id}
                        className={`p-2 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                        onClick={() => navigate(`/board/${card.list}/card/${card.id}`)}
                      >
                        <div className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {card.title}
                        </div>
                        {card.due_date && (
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            📅 {formatDate(card.due_date)}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${getPriorityColor(card.priority)}`}>
                          Prioridad: {card.priority}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {soonCards.length > 5 && (
                  <button
                    onClick={() => navigate('/dashboard/student?filter=soon')}
                    className={`mt-2 text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    Ver todas ({soonCards.length})
                  </button>
                )}
              </div>

              {/* Tarjetas Vencidas */}
              <div className={`card-modern ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  ⚠️ Vencidas ({overdueCards.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {overdueCards.length === 0 ? (
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No hay tareas vencidas</p>
                  ) : (
                    overdueCards.slice(0, 5).map(card => (
                      <div
                        key={card.id}
                        className={`p-2 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                        onClick={() => navigate(`/board/${card.list}/card/${card.id}`)}
                      >
                        <div className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {card.title}
                        </div>
                        {card.due_date && (
                          <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                            📅 {formatDate(card.due_date)}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${getPriorityColor(card.priority)}`}>
                          Prioridad: {card.priority}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {overdueCards.length > 5 && (
                  <button
                    onClick={() => navigate('/dashboard/student?filter=overdue')}
                    className={`mt-2 text-sm ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    Ver todas ({overdueCards.length})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sección de Tableros */}
        <div className="mb-6">
          <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tableros Disponibles</h2>
          <p className={`font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-800'}`}>
            Tableros de cursos donde eres miembro
          </p>
        </div>

        {loading ? (
          <div className={`text-center py-8 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>Cargando tableros...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boards.map(board => (
              <div
                key={board.id}
                className="card-modern cursor-pointer"
                style={{ borderTop: `4px solid ${board.color}` }}
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white text-base' : 'text-gray-900 text-lg'}`}>{board.name}</div>
                <div className={`font-medium ${theme === 'dark' ? 'text-xs text-gray-400' : 'text-sm text-gray-800'}`}>
                  Docente: {board.owner.username}
                </div>
              </div>
            ))}
            {boards.length === 0 && (
              <div className={`col-span-full text-center py-8 font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>
                No tienes acceso a ningún tablero aún. Un docente debe invitarte.
              </div>
            )}
          </div>
        )}
      </main>

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

