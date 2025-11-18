import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
  role: 'student' | 'teacher' | null
  id_number: string | null
}

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (payload: { username: string; email?: string; password: string; role: 'student' | 'teacher'; id_number: string }) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      loading: false,
      error: null,

      async login(username, password) {
        try {
          set({ loading: true, error: null })
          const { data } = await api.post('auth/login/', { username, password })
          set({ accessToken: data.access, refreshToken: data.refresh })
          await get().fetchMe()
        } catch (e: any) {
          set({ error: e?.response?.data?.detail || 'Error de autenticación' })
          throw e
        } finally {
          set({ loading: false })
        }
      },

      async register(payload) {
        try {
          set({ loading: true, error: null })
          await api.post('auth/register/', payload)
        } catch (e: any) {
          const msg =
            e?.response?.data?.detail ||
            (typeof e?.response?.data === 'object' ? JSON.stringify(e.response.data) : 'Error de registro')
          set({ error: msg })
          throw e
        } finally {
          set({ loading: false })
        }
      },

      async fetchMe() {
        try {
          const { data } = await api.get<User>('me/')
          set({ user: data })
        } catch {
          set({ user: null, accessToken: null, refreshToken: null })
        }
      },

      async initialize() {
        const { accessToken } = get()
        if (accessToken) {
          try {
            await get().fetchMe()
          } catch {
            // Si el token es inválido, limpiar todo
            set({ accessToken: null, refreshToken: null, user: null })
          }
        }
      },

      logout() {
        set({ accessToken: null, refreshToken: null, user: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)


