import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/auth'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

type LoginFormData = { username: string; password: string }
type RegisterFormData = { username: string; email?: string; password: string; role: 'student' | 'teacher'; id_number: string }

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const { register: regLogin, handleSubmit: handleLogin, formState: { errors: loginErrors } } = useForm<LoginFormData>()
  const { register: regRegister, handleSubmit: handleRegister, formState: { errors: registerErrors } } = useForm<RegisterFormData>()
  const login = useAuthStore(s => s.login)
  const register = useAuthStore(s => s.register)
  const loading = useAuthStore(s => s.loading)
  const error = useAuthStore(s => s.error)
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      // Redirigir según el rol
      if (user.role === 'teacher') {
        navigate('/dashboard/teacher', { replace: true })
      } else if (user.role === 'student') {
        navigate('/dashboard/student', { replace: true })
      } else {
        // Si no tiene rol, redirigir a login (no debería pasar)
        navigate('/login', { replace: true })
      }
    }
  }, [user, navigate])

  const onLogin = async (values: LoginFormData) => {
    try {
      await login(values.username, values.password)
      // La redirección se hace en el useEffect cuando user cambia
    } catch {}
  }

  const onRegister = async (values: RegisterFormData) => {
    try {
      await register(values)
      // Después de registrarse, cambiar a modo login
      setMode('login')
      // Limpiar error si existe
      useAuthStore.setState({ error: null })
    } catch {}
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md border border-gray-700">
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-4 rounded font-medium transition ${
              mode === 'login'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 px-4 rounded font-medium transition ${
              mode === 'register'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Registrarse
          </button>
        </div>

        {error && <div className="mb-4 p-3 text-sm text-red-400 bg-red-900 bg-opacity-30 rounded border border-red-800">{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin(onLogin)} className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4 text-white">Iniciar Sesión</h2>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Usuario</label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...regLogin('username', { required: true })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Contraseña</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...regLogin('password', { required: true })}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showLoginPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister(onRegister)} className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4 text-white">Crear Cuenta</h2>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Usuario</label>
              <input
                type="text"
                className={`w-full bg-gray-700 border rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  registerErrors.username ? 'border-red-500' : 'border-gray-600'
                }`}
                {...regRegister('username', {
                  required: 'El usuario es requerido',
                  pattern: {
                    value: /^[a-zA-Z0-9@.+_-]+$/,
                    message: 'Solo letras, números y @/./+/-/_',
                  },
                  onChange: (e) => {
                    // Remover espacios automáticamente
                    e.target.value = e.target.value.replace(/\s/g, '')
                  },
                })}
                placeholder="Sin espacios (ej: fredyalvarez)"
              />
              {registerErrors.username && (
                <p className="text-xs text-red-500 mt-1">
                  {registerErrors.username.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Email</label>
              <input
                type="email"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...regRegister('email', { required: 'El email es requerido' })}
              />
              {registerErrors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {registerErrors.email.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">ID (10 dígitos)</label>
              <input
                type="text"
                className={`w-full bg-gray-700 border rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  registerErrors.id_number ? 'border-red-500' : 'border-gray-600'
                }`}
                {...regRegister('id_number', {
                  required: 'El ID es requerido',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'El ID debe tener exactamente 10 dígitos numéricos',
                  },
                  onChange: (e) => {
                    // Solo permitir números
                    e.target.value = e.target.value.replace(/\D/g, '')
                    // Limitar a 10 dígitos
                    if (e.target.value.length > 10) {
                      e.target.value = e.target.value.slice(0, 10)
                    }
                  },
                })}
                placeholder="1234567890"
                maxLength={10}
              />
              {registerErrors.id_number && (
                <p className="text-xs text-red-500 mt-1">
                  {registerErrors.id_number.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Contraseña</label>
              <div className="relative">
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  className={`w-full bg-gray-700 border rounded px-3 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    registerErrors.password ? 'border-red-500' : 'border-gray-600'
                  }`}
                  {...regRegister('password', {
                    required: 'La contraseña es requerida',
                    minLength: {
                      value: 8,
                      message: 'La contraseña debe tener al menos 8 caracteres',
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                  tabIndex={-1}
                >
                  {showRegisterPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {registerErrors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {registerErrors.password.message as string}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Rol</label>
              <select
                className={`w-full bg-gray-700 border rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  registerErrors.role ? 'border-red-500' : 'border-gray-600'
                }`}
                {...regRegister('role', { required: 'Debes seleccionar un rol' })}
              >
                <option value="">Selecciona un rol</option>
                <option value="student">Estudiante</option>
                <option value="teacher">Docente</option>
              </select>
              {registerErrors.role && (
                <p className="text-xs text-red-500 mt-1">
                  {registerErrors.role.message as string}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Registrarse'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
