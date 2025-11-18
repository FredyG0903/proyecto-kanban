import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'

type User = {
  id: number
  username: string
  first_name: string
  last_name: string
}

type Board = {
  id: number
  name: string
  color: string
  owner: User
  members: User[]
}

type List = {
  id: number
  title: string
  position: number
  board: number
}

type Card = {
  id: number
  title: string
  description: string
  due_date: string | null
  priority: 'low' | 'med' | 'high'
  position: number
  list: number
  created_by: User
  assignees: User[]
}

export function BoardView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const [board, setBoard] = useState<Board | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewListForm, setShowNewListForm] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [showNewCardForm, setShowNewCardForm] = useState<number | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [searchUsers, setSearchUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingListId, setEditingListId] = useState<number | null>(null)
  const [editListTitle, setEditListTitle] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [filterAssignee, setFilterAssignee] = useState<number | null>(null)
  const [filterDue, setFilterDue] = useState<string>('')
  const [draggedCard, setDraggedCard] = useState<Card | null>(null)
  const [dragOverList, setDragOverList] = useState<number | null>(null)

  useEffect(() => {
    if (id) {
      loadBoard()
      loadLists()
    }
  }, [id])

  useEffect(() => {
    if (lists.length > 0) {
      loadCards()
    }
  }, [lists])

  const loadBoard = async () => {
    try {
      const { data } = await api.get<Board>(`boards/${id}/`)
      setBoard(data)
    } catch (error) {
      console.error('Error al cargar tablero:', error)
      navigate('/dashboard/teacher')
    }
  }

  const loadLists = async () => {
    try {
      const { data } = await api.get<List[]>(`boards/${id}/lists/`)
      setLists(data)
    } catch (error) {
      console.error('Error al cargar listas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCards = async () => {
    try {
      const allCards: Card[] = []
      for (const list of lists) {
        try {
          const { data } = await api.get<Card[]>(`lists/${list.id}/cards/`)
          allCards.push(...data)
        } catch (err) {
          console.error(`Error al cargar tarjetas de lista ${list.id}:`, err)
        }
      }
      setCards(allCards)
    } catch (error) {
      console.error('Error al cargar tarjetas:', error)
    }
  }

  const createList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListTitle.trim() || !id) return
    try {
      const { data } = await api.post<List>(`boards/${id}/lists/`, {
        title: newListTitle,
        position: lists.length,
      })
      setLists([...lists, data])
      setNewListTitle('')
      setShowNewListForm(false)
    } catch (error) {
      console.error('Error al crear lista:', error)
    }
  }

  const updateList = async (listId: number) => {
    if (!editListTitle.trim()) return
    try {
      const { data } = await api.patch<List>(`lists/${listId}/`, {
        title: editListTitle,
      })
      setLists(lists.map(l => (l.id === listId ? data : l)))
      setEditingListId(null)
      setEditListTitle('')
    } catch (error) {
      console.error('Error al actualizar lista:', error)
    }
  }

  const deleteList = async (listId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta lista? Se eliminarán todas las tarjetas.')) return
    try {
      await api.delete(`lists/${listId}/`)
      setLists(lists.filter(l => l.id !== listId))
      setCards(cards.filter(c => c.list !== listId))
    } catch (error) {
      console.error('Error al eliminar lista:', error)
    }
  }

  const createCard = async (e: React.FormEvent, listId: number) => {
    e.preventDefault()
    if (!newCardTitle.trim()) return
    try {
      const { data } = await api.post<Card>(`lists/${listId}/cards/`, {
        title: newCardTitle,
        position: cards.filter(c => c.list === listId).length,
      })
      setCards([...cards, data])
      setNewCardTitle('')
      setShowNewCardForm(null)
      await loadCards()
    } catch (error) {
      console.error('Error al crear tarjeta:', error)
    }
  }

  const moveCard = async (cardId: number, newListId: number, newPosition: number) => {
    try {
      const { data } = await api.patch(`cards/${cardId}/`, {
        list_id: newListId,
        position: newPosition,
      })
      setCards(cards.map(c => (c.id === cardId ? data : c)))
      await loadCards()
    } catch (error) {
      console.error('Error al mover tarjeta:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, listId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverList(listId)
  }

  const handleDragLeave = () => {
    setDragOverList(null)
  }

  const handleDrop = async (e: React.DragEvent, targetListId: number) => {
    e.preventDefault()
    setDragOverList(null)
    if (!draggedCard || draggedCard.list === targetListId) {
      setDraggedCard(null)
      return
    }
    const targetCards = cards.filter(c => c.list === targetListId)
    await moveCard(draggedCard.id, targetListId, targetCards.length)
    setDraggedCard(null)
  }

  const searchUsersByUsername = async (query: string) => {
    if (!query.trim()) {
      setSearchUsers([])
      return
    }
    try {
      // Buscar usuarios por username (necesitarías un endpoint para esto)
      // Por ahora, usaremos una búsqueda simple
      const { data } = await api.get<User[]>(`cards/search/?q=${query}`)
      // Esto es un workaround, idealmente deberías tener un endpoint /api/users/search/
      setSearchUsers([])
    } catch (error) {
      console.error('Error al buscar usuarios:', error)
    }
  }

  const inviteMemberByUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteUsername.trim() || !id) return
    // Por ahora, asumimos que el usuario ingresa un ID
    // Idealmente deberías buscar por username primero
    try {
      await api.post(`boards/${id}/members/`, {
        user_id: parseInt(inviteUsername),
        action: 'add',
      })
      await loadBoard()
      setInviteUsername('')
      setShowMembersModal(false)
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Error al invitar miembro')
      console.error('Error al invitar miembro:', error)
    }
  }

  const removeMember = async (memberId: number) => {
    if (!id) return
    try {
      await api.post(`boards/${id}/members/`, {
        user_id: memberId,
        action: 'remove',
      })
      await loadBoard()
    } catch (error) {
      console.error('Error al remover miembro:', error)
    }
  }

  const searchCards = async () => {
    if (!id) return
    try {
      const params = new URLSearchParams()
      if (searchFilter) params.append('q', searchFilter)
      if (filterAssignee) params.append('assignee', filterAssignee.toString())
      if (filterDue) params.append('due', filterDue)
      const { data } = await api.get<Card[]>(`cards/search/?${params.toString()}`)
      // Mostrar resultados en un modal o actualizar la vista
      console.log('Resultados de búsqueda:', data)
    } catch (error) {
      console.error('Error al buscar tarjetas:', error)
    }
  }

  const getCardsForList = (listId: number) => {
    let filtered = cards.filter(card => card.list === listId).sort((a, b) => a.position - b.position)
    if (searchFilter) {
      filtered = filtered.filter(
        c => c.title.toLowerCase().includes(searchFilter.toLowerCase()) || c.description.toLowerCase().includes(searchFilter.toLowerCase())
      )
    }
    if (filterAssignee) {
      filtered = filtered.filter(c => c.assignees.some(a => a.id === filterAssignee))
    }
    if (filterDue === 'overdue') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      filtered = filtered.filter(c => c.due_date && new Date(c.due_date) < today)
    } else if (filterDue === 'soon') {
      const today = new Date()
      const weekFromNow = new Date()
      weekFromNow.setDate(today.getDate() + 7)
      filtered = filtered.filter(
        c => c.due_date && new Date(c.due_date) >= today && new Date(c.due_date) <= weekFromNow
      )
    }
    return filtered
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500'
      case 'med':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-green-500'
      default:
        return 'border-l-gray-500'
    }
  }

  const allAssignees = Array.from(new Set(cards.flatMap(c => c.assignees)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando tablero...</div>
      </div>
    )
  }

  if (!board) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header
        className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between"
        style={{ borderTop: `4px solid ${board.color}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/teacher')}
            className="text-gray-400 hover:text-white transition"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold">{board.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSearchModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
          >
            🔍 Buscar
          </button>
          <button
            onClick={() => setShowMembersModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
          >
            Gestionar Miembros
          </button>
          <span className="text-gray-400">¡Hola, {user?.first_name || user?.username}!</span>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Filtros activos */}
      {(searchFilter || filterAssignee || filterDue) && (
        <div className="bg-gray-800 px-6 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Filtros activos:</span>
          {searchFilter && (
            <span className="px-2 py-1 bg-blue-600 rounded text-sm">
              Búsqueda: {searchFilter}
              <button onClick={() => setSearchFilter('')} className="ml-2">×</button>
            </span>
          )}
          {filterAssignee && (
            <span className="px-2 py-1 bg-blue-600 rounded text-sm">
              Responsable: {allAssignees.find(a => a.id === filterAssignee)?.username}
              <button onClick={() => setFilterAssignee(null)} className="ml-2">×</button>
            </span>
          )}
          {filterDue && (
            <span className="px-2 py-1 bg-blue-600 rounded text-sm">
              Vencimiento: {filterDue === 'overdue' ? 'Vencidas' : 'Próximas'}
              <button onClick={() => setFilterDue('')} className="ml-2">×</button>
            </span>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {/* Listas existentes */}
          {lists.map(list => (
            <div
              key={list.id}
              className={`bg-gray-800 rounded-lg p-4 flex flex-col ${
                dragOverList === list.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onDragOver={e => handleDragOver(e, list.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, list.id)}
            >
              {/* Header de la lista */}
              <div className="flex items-center justify-between mb-4">
                {editingListId === list.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                      value={editListTitle}
                      onChange={e => setEditListTitle(e.target.value)}
                      autoFocus
                      onBlur={() => updateList(list.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') updateList(list.id)
                        if (e.key === 'Escape') {
                          setEditingListId(null)
                          setEditListTitle('')
                        }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <h3
                      className="font-semibold text-lg flex-1 cursor-pointer"
                      onDoubleClick={() => {
                        setEditingListId(list.id)
                        setEditListTitle(list.title)
                      }}
                    >
                      {list.title}
                    </h3>
                    <span className="text-sm text-gray-400">
                      ({getCardsForList(list.id).length})
                    </span>
                    {board.owner.id === user?.id && (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => {
                            setEditingListId(list.id)
                            setEditListTitle(list.title)
                          }}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteList(list.id)}
                          className="text-gray-400 hover:text-red-400 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tarjetas */}
              <div className="flex-1 space-y-3 mb-4 min-h-[100px]">
                {getCardsForList(list.id).map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={e => handleDragStart(e, card)}
                    className={`bg-gray-700 rounded p-3 border-l-4 ${getPriorityColor(
                      card.priority
                    )} cursor-move hover:bg-gray-600 transition`}
                    onClick={() => navigate(`/board/${id}/card/${card.id}`)}
                  >
                    <div className="font-medium mb-1">{card.title}</div>
                    {card.description && (
                      <div className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {card.description}
                      </div>
                    )}
                    {card.due_date && (
                      <div className="text-xs text-yellow-400 flex items-center gap-1">
                        📅 {new Date(card.due_date).toLocaleDateString('es-ES')}
                      </div>
                    )}
                    {card.assignees.length > 0 && (
                      <div className="text-xs text-gray-400 mt-2">
                        👤 {card.assignees.map(a => a.username).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Botón para agregar tarjeta */}
              {showNewCardForm === list.id ? (
                <form onSubmit={e => createCard(e, list.id)} className="space-y-2">
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Título de la tarjeta..."
                    value={newCardTitle}
                    onChange={e => setNewCardTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                    >
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCardForm(null)
                        setNewCardTitle('')
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewCardForm(list.id)}
                  className="w-full text-left text-gray-400 hover:text-white hover:bg-gray-700 px-3 py-2 rounded transition"
                >
                  + Agregar tarjeta
                </button>
              )}
            </div>
          ))}

          {/* Botón para nueva columna */}
          {showNewListForm ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <form onSubmit={createList} className="space-y-2">
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título de la columna..."
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewListForm(false)
                      setNewListTitle('')
                    }}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowNewListForm(true)}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 flex items-center justify-center gap-2 transition min-h-[200px]"
            >
              <span className="text-2xl">+</span>
              <span>Nueva Columna</span>
            </button>
          )}
        </div>
      </main>

      {/* Modal de búsqueda y filtros */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Buscar y Filtrar Tarjetas</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Búsqueda de texto</label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  placeholder="Buscar en título o descripción..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Responsable</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  value={filterAssignee || ''}
                  onChange={e => setFilterAssignee(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Todos</option>
                  {allAssignees.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de vencimiento</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  value={filterDue}
                  onChange={e => setFilterDue(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="overdue">Vencidas</option>
                  <option value="soon">Próximas (7 días)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setSearchFilter('')
                  setFilterAssignee(null)
                  setFilterDue('')
                  setShowSearchModal(false)
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowSearchModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de gestión de miembros */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Gestionar Miembros</h2>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Miembros actuales:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <span>{board.owner.username} (Dueño)</span>
                </div>
                {board.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span>{member.username}</span>
                    {board.owner.id === user?.id && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {board.owner.id === user?.id && (
              <form onSubmit={inviteMemberByUsername} className="space-y-2">
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID de usuario a invitar"
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                  >
                    Invitar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMembersModal(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                  >
                    Cerrar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
