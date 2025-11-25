import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { BACKGROUND_IMAGE_URL } from '@/config/background'
import { useThemeStore } from '@/store/theme'

type User = {
  id: number
  username: string
}

type Board = {
  id: number
  name: string
  color: string
  due_date: string | null
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
  const { theme } = useThemeStore()

  const [board, setBoard] = useState<Board | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewListForm, setShowNewListForm] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [showNewCardForm, setShowNewCardForm] = useState<number | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [newCardDueDate, setNewCardDueDate] = useState('')
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
  const [isMovingCard, setIsMovingCard] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  useEffect(() => {
    if (id) {
      loadBoard()
      loadLists()
    }
  }, [id])

  useEffect(() => {
    if (lists.length > 0 && !isMovingCard) {
      loadCards()
    }
  }, [lists, isMovingCard])

  const loadBoard = async () => {
    try {
      const { data } = await api.get<Board>(`boards/${id}/`)
      setBoard(data)
    } catch (error) {
      console.error('Error al cargar tablero:', error)
      navigate(user?.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student')
    }
  }

  const loadActivities = async () => {
    if (!id) return
    setLoadingActivities(true)
    try {
      const { data } = await api.get<any[]>(`boards/${id}/activity/`)
      setActivities(data)
    } catch (error) {
      console.error('Error al cargar actividades:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  const formatActivityAction = (action: string, meta: any) => {
    switch (action) {
      case 'board_created':
        return `Creó el tablero "${meta.board_name || 'Tablero'}"`
      case 'board_deleted':
        return `Eliminó el tablero "${meta.board_name || 'Tablero'}"`
      case 'list_created':
        return `Creó la lista "${meta.list_title || 'Lista'}"`
      case 'list_deleted':
        return `Eliminó la lista "${meta.list_title || 'Lista'}"`
      case 'card_created':
        return `Creó la tarjeta "${meta.card_title || 'Tarjeta'}"`
      case 'card_moved':
        return `Movió la tarjeta "${meta.card_title || 'Tarjeta'}" de "${meta.from_list || 'Lista'}" a "${meta.to_list || 'Lista'}"`
      case 'card_deleted':
        return `Eliminó la tarjeta "${meta.card_title || 'Tarjeta'}"`
      case 'member_added':
        return `Agregó al miembro "${meta.username || 'Usuario'}"`
      case 'member_removed':
        return `Removió al miembro "${meta.username || 'Usuario'}"`
      case 'comment_added':
        return `Agregó un comentario en la tarjeta`
      default:
        return action.replace('_', ' ')
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      const payload: { title: string; position: number; due_date?: string } = {
        title: newCardTitle,
        position: cards.filter(c => c.list === listId).length,
      }
      if (newCardDueDate) {
        payload.due_date = newCardDueDate
      }
      const { data } = await api.post<Card>(`lists/${listId}/cards/`, payload)
      setCards([...cards, data])
      setNewCardTitle('')
      setNewCardDueDate('')
      setShowNewCardForm(null)
      await loadCards()
    } catch (error: any) {
      console.error('Error al crear tarjeta:', error)
      const errorMessage = error?.response?.data?.detail 
        || error?.response?.data?.title?.[0] 
        || (typeof error?.response?.data === 'object' ? JSON.stringify(error.response.data) : null)
        || error?.message 
        || 'Error al crear la tarjeta'
      alert(errorMessage)
    }
  }

  const deleteCard = async (cardId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta tarjeta?')) return
    try {
      await api.delete(`cards/${cardId}/`)
      setCards(cards.filter(c => c.id !== cardId))
      await loadCards()
    } catch (error) {
      console.error('Error al eliminar tarjeta:', error)
      alert('Error al eliminar la tarjeta')
    }
  }

  const moveCard = async (cardId: number, newListId: number, newPosition: number) => {
    setIsMovingCard(true)
    try {
      // Actualización optimista: mover la tarjeta en el estado local inmediatamente
      const cardToMove = cards.find(c => c.id === cardId)
      if (!cardToMove) {
        console.error('Tarjeta no encontrada:', cardId)
        setIsMovingCard(false)
        return
      }
      
      const oldListId = cardToMove.list
      
      // Remover la tarjeta de su lista actual
      const updatedCards = cards.filter(c => c.id !== cardId)
      // Agregar la tarjeta a la nueva lista con la nueva posición
      const newCard = { ...cardToMove, list: newListId, position: newPosition }
      updatedCards.push(newCard)
      setCards(updatedCards)
      
      console.log('Movimiento optimista aplicado:', { cardId, oldListId, newListId, newPosition })
      
      // Hacer la petición al backend
      const { data } = await api.patch(`cards/${cardId}/`, {
        list_id: newListId,
        position: newPosition,
      })
      
      console.log('Respuesta del servidor:', data)
      
      // Verificar que el list_id en la respuesta sea correcto
      if (data.list !== newListId) {
        console.warn('El servidor devolvió un list_id diferente:', { esperado: newListId, recibido: data.list })
      }
      
      // Actualizar con los datos del servidor (que incluyen el list_id correcto)
      setCards(prevCards => {
        // Remover la tarjeta de cualquier lista donde esté
        const withoutMoved = prevCards.filter(c => c.id !== cardId)
        // Agregar la tarjeta actualizada del servidor
        const updated = [...withoutMoved, data]
        console.log('Estado actualizado con datos del servidor. Tarjeta:', updated.find(c => c.id === cardId))
        return updated
      })
    } catch (error: any) {
      console.error('Error al mover tarjeta:', error)
      console.error('Detalles del error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      })
      
      // Revertir el cambio optimista en caso de error recargando las tarjetas
      await loadCards()
      
      // Mostrar error al usuario con el mensaje real del servidor
      let errorMessage = 'Error al mover la tarjeta.'
      if (error?.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.join(', ')
        } else {
          errorMessage = JSON.stringify(error.response.data.detail)
        }
      } else if (error?.response?.data?.list_id) {
        errorMessage = `Error en list_id: ${JSON.stringify(error.response.data.list_id)}`
      } else if (error?.response?.data) {
        errorMessage = `Error: ${JSON.stringify(error.response.data)}`
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setIsMovingCard(false)
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
    try {
      // Intentar primero como id_number (10 dígitos), luego como username
      const payload: { id_number?: string; username?: string; action: string } = {
        action: 'add',
      }
      
      // Si es solo números y tiene 10 dígitos, es un id_number
      if (/^\d{10}$/.test(inviteUsername.trim())) {
        payload.id_number = inviteUsername.trim()
      } else {
        // Si no, es un username
        payload.username = inviteUsername.trim()
      }
      
      await api.post(`boards/${id}/members/`, payload)
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

  // Verificar si el usuario es docente y dueño del tablero
  const isTeacherOwner = user?.role === 'teacher' && board.owner.id === user?.id

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
      <header
        className={`bg-opacity-60 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-300'
        }`}
        style={{ borderTop: `4px solid ${board.color}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(user?.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student')}
            className="btn-secondary text-sm"
          >
            ← Volver
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{board.name}</h1>
            {board.due_date && (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>
                📅 Fecha límite: {new Date(board.due_date).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/calendar')}
            className={`btn-secondary ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
            title="Ver calendario"
          >
            📅 Calendario
          </button>
          {isTeacherOwner && (
            <button
              onClick={() => {
                setShowActivityModal(true)
                loadActivities()
              }}
              className={`btn-secondary ${theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'}`}
              title="Ver historial de actividad"
            >
              📊 Historial
            </button>
          )}
          <button
            onClick={() => setShowSearchModal(true)}
            className="btn-success"
          >
            🔍 Buscar
          </button>
          {isTeacherOwner && (
            <button
              onClick={() => setShowMembersModal(true)}
              className="btn-primary"
            >
              Gestionar Miembros
            </button>
          )}
          <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>¡Hola, {user?.username}!</span>
          <button
            onClick={logout}
            className="btn-danger"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Filtros activos */}
      {(searchFilter || filterAssignee || filterDue) && (
        <div className={`bg-opacity-60 backdrop-blur-md px-6 py-2 flex items-center gap-2 flex-wrap transition-all duration-300 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>Filtros activos:</span>
          {searchFilter && (
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            }`}>
              Búsqueda: {searchFilter}
              <button 
                onClick={() => setSearchFilter('')} 
                className="px-1.5 py-0.5 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-bold transition-all duration-200"
                title="Quitar filtro"
              >
                ×
              </button>
            </span>
          )}
          {filterAssignee && (
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            }`}>
              Responsable: {allAssignees.find(a => a.id === filterAssignee)?.username}
              <button 
                onClick={() => setFilterAssignee(null)} 
                className="px-1.5 py-0.5 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-bold transition-all duration-200"
                title="Quitar filtro"
              >
                ×
              </button>
            </span>
          )}
          {filterDue && (
            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
              theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
            }`}>
              Vencimiento: {filterDue === 'overdue' ? 'Vencidas' : 'Próximas'}
              <button 
                onClick={() => setFilterDue('')} 
                className="px-1.5 py-0.5 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-bold transition-all duration-200"
                title="Quitar filtro"
              >
                ×
              </button>
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
              className={`card-modern flex flex-col ${
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
                      className="flex-1 bg-gray-700 bg-opacity-60 backdrop-blur-md border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                      ({getCardsForList(list.id).length})
                    </span>
                    {isTeacherOwner && (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => {
                            setEditingListId(list.id)
                            setEditListTitle(list.title)
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-200 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                          }`}
                          title="Editar columna"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteList(list.id)}
                          className={`p-1.5 rounded-lg transition-all duration-200 ${
                            theme === 'dark' 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                          title="Eliminar columna"
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
                    className={`bg-gray-700 bg-opacity-60 backdrop-blur-md rounded-xl p-3 border-l-4 ${getPriorityColor(
                      card.priority
                    )} cursor-move hover:bg-opacity-70 transition-all duration-200 shadow-md hover:shadow-lg relative group`}
                  >
                    <div 
                      className="flex items-start justify-between gap-2"
                      onClick={() => navigate(`/board/${id}/card/${card.id}`)}
                    >
                      <div className="flex-1">
                        <div className="font-medium mb-1">{card.title}</div>
                        {card.description && (
                          <div className={`text-sm mb-2 line-clamp-2 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                          }`}>
                            {card.description}
                          </div>
                        )}
                        {card.due_date && (
                          <div className="text-xs text-yellow-400 flex items-center gap-1">
                            📅 {new Date(card.due_date).toLocaleDateString('es-ES')}
                          </div>
                        )}
                        {card.assignees.length > 0 && (
                          <div className={`text-xs mt-2 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                          }`}>
                            👤 {card.assignees.map(a => a.username).join(', ')}
                          </div>
                        )}
                      </div>
                      {isTeacherOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteCard(card.id)
                          }}
                          className={`opacity-0 group-hover:opacity-100 transition-all duration-200 text-sm p-1.5 rounded-lg ${
                            theme === 'dark' 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                          title="Eliminar tarjeta"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón para agregar tarjeta (solo docentes dueños) */}
              {isTeacherOwner && showNewCardForm === list.id ? (
                <form onSubmit={e => createCard(e, list.id)} className="space-y-2">
                  <input
                    type="text"
                    className="input-modern"
                    placeholder="Título de la tarjeta..."
                    value={newCardTitle}
                    onChange={e => setNewCardTitle(e.target.value)}
                    autoFocus
                    required
                  />
                  <input
                    type="date"
                    className="input-modern"
                    placeholder="Fecha límite (opcional)"
                    value={newCardDueDate}
                    onChange={e => setNewCardDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={board?.due_date ? board.due_date : undefined}
                    title={board?.due_date ? `Debe ser antes de ${new Date(board.due_date).toLocaleDateString()}` : ''}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn-primary text-sm px-3 py-1"
                    >
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCardForm(null)
                        setNewCardTitle('')
                        setNewCardDueDate('')
                      }}
                      className="btn-secondary text-sm px-3 py-1"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : isTeacherOwner ? (
                <button
                  onClick={() => setShowNewCardForm(list.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-gray-500 shadow-sm hover:shadow-md' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
                  }`}
                >
                  + Agregar tarjeta
                </button>
              ) : null}
            </div>
          ))}

          {/* Botón para nueva columna (solo docentes dueños) */}
          {isTeacherOwner && showNewListForm ? (
            <div className="bg-gray-800 bg-opacity-60 backdrop-blur-md rounded-lg p-4">
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
                    className="btn-primary text-sm px-3 py-2"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewListForm(false)
                      setNewListTitle('')
                    }}
                    className="btn-secondary text-sm px-3 py-2"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : isTeacherOwner ? (
            <button
              onClick={() => setShowNewListForm(true)}
              className={`bg-opacity-60 backdrop-blur-md hover:bg-opacity-70 rounded-xl p-4 flex items-center justify-center gap-2 transition-all duration-200 min-h-[200px] border-2 border-dashed shadow-lg hover:shadow-xl ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-600 hover:border-gray-500 text-white'
                  : 'bg-white border-gray-300 hover:border-gray-400 text-gray-900'
              }`}
            >
              <span className="text-2xl font-bold">+</span>
              <span className="font-semibold text-lg">Nueva Columna</span>
            </button>
          ) : null}
        </div>
      </main>

      {/* Modal de búsqueda y filtros */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-opacity-70 backdrop-blur-md rounded-lg p-6 w-full max-w-md transition-all duration-300 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className="text-xl font-bold mb-4">Buscar y Filtrar Tarjetas</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                }`}>Búsqueda de texto</label>
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
                className="btn-secondary flex-1"
              >
                Limpiar
              </button>
              <button
                onClick={() => setShowSearchModal(false)}
                className="btn-primary flex-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de historial de actividad */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowActivityModal(false)}>
          <div className={`bg-opacity-90 backdrop-blur-md rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                📊 Historial de Actividad
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Actividad reciente del tablero "{board?.name}"
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingActivities ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cargando actividades...
                </div>
              ) : activities.length === 0 ? (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No hay actividades registradas aún
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {activity.actor.username}
                            </span>
                            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {formatActivityAction(activity.action, activity.meta || {})}
                            </span>
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {formatDateTime(activity.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={`p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              <button
                onClick={() => setShowActivityModal(false)}
                className="btn-secondary w-full"
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
          <div className={`bg-opacity-70 backdrop-blur-md rounded-lg p-6 w-full max-w-md transition-all duration-300 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
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
                    {isTeacherOwner && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                          theme === 'dark'
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
                            : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {isTeacherOwner && (
              <form onSubmit={inviteMemberByUsername} className="space-y-2">
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID (10 dígitos) o Usuario"
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                />
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                  Ingresa el ID de 10 dígitos o el nombre de usuario
                </p>
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
    </div>
  )
}
