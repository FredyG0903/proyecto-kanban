import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/auth'
import { Link, useNavigate } from 'react-router-dom'

type FormData = { username: string; email?: string; password: string }

export function RegisterPage() {
  const { register: reg, handleSubmit } = useForm<FormData>()
  const doRegister = useAuthStore(s => s.register)
  const loading = useAuthStore(s => s.loading)
  const error = useAuthStore(s => s.error)
  const navigate = useNavigate()

  const onSubmit = async (values: FormData) => {
    try {
      await doRegister(values)
      navigate('/login')
    } catch {}
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Crear cuenta</h1>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <label className="block text-sm mb-1">Usuario</label>
          <input className="w-full border rounded px-3 py-2" {...reg('username', { required: true })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email (opcional)</label>
          <input className="w-full border rounded px-3 py-2" {...reg('email')} />
        </div>
        <div>
          <label className="block text-sm mb-1">Contraseña</label>
          <input type="password" className="w-full border rounded px-3 py-2" {...reg('password', { required: true, minLength: 8 })} />
        </div>
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
        <p className="text-sm">
          ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600">Inicia sesión</Link>
        </p>
      </form>
    </div>
  )
}


