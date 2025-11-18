import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

type Board = {
  id: number
  name: string
  color: string
}

export function BoardsPage() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#22c55e')

  const loadBoards = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Board[]>('boards/')
      setBoards(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoards()
  }, [])

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const { data } = await api.post<Board>('boards/', { name, color })
    setBoards([data, ...boards])
    setName('')
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis tableros</h1>
          <p className="text-sm text-gray-600">Hola {user?.first_name || user?.username}</p>
        </div>
        <button className="text-sm text-red-600" onClick={logout}>Salir</button>
      </header>

      <form onSubmit={createBoard} className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Nombre del tablero"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <button className="bg-blue-600 text-white px-4 rounded">Crear</button>
      </form>

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {boards.map(b => (
            <div key={b.id} className="p-4 rounded shadow bg-white border" style={{ borderTop: `4px solid ${b.color}` }}>
              <div className="font-medium">{b.name}</div>
            </div>
          ))}
          {boards.length === 0 && <div className="text-gray-600 text-sm">No tienes tableros aún.</div>}
        </div>
      )}
    </div>
  )
}


