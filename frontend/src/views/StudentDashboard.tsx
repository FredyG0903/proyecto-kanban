import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useNavigate } from 'react-router-dom'
import { BACKGROUND_IMAGE_URL } from '@/config/background'
import { useThemeStore } from '@/store/theme'

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
  const { theme, toggleTheme } = useThemeStore()
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowProfile(false)}>
          <div className={`bg-opacity-70 backdrop-blur-md rounded-lg p-6 w-full max-w-md transition-all duration-300 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mi Perfil</h2>
              <button
                onClick={() => setShowProfile(false)}
                className={`text-2xl transition-colors ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>Usuario</label>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.username || 'N/A'}</p>
              </div>
              <div className={`rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <label className={`block mb-1 font-medium ${theme === 'dark' ? 'text-sm text-gray-400' : 'text-base text-gray-700'}`}>Email</label>
                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user?.email || 'N/A'}</p>
              </div>
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
            <div className="mt-6 flex items-center justify-between">
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
                onClick={() => setShowProfile(false)}
                className="btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

