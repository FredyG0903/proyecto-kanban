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

type Card = {
  id: number
  title: string
  description: string
  due_date: string | null
  priority: 'low' | 'med' | 'high'
  list: number
  created_by: User
  assignees: User[]
  created_at?: string
}

export function CardDetailView() {
  const { boardId, cardId } = useParams<{ boardId: string; cardId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { theme } = useThemeStore()

  const [card, setCard] = useState<Card | null>(null)
  const [board, setBoard] = useState<{ due_date: string | null; owner: User } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showAssigneesModal, setShowAssigneesModal] = useState(false)
  const [boardMembers, setBoardMembers] = useState<User[]>([])

  // Formulario de edición
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'med' | 'high'>('med')

  useEffect(() => {
    if (cardId) {
      loadCard()
      loadBoard()
    }
  }, [cardId])

  useEffect(() => {
    if (boardId && showAssigneesModal) {
      loadBoardMembers()
    }
  }, [boardId, showAssigneesModal])

  const loadCard = async () => {
    try {
      const { data } = await api.get<Card>(`cards/${cardId}/`)
      setCard(data)
      setEditTitle(data.title)
      setEditDueDate(data.due_date || '')
      setEditPriority(data.priority)
    } catch (error) {
      console.error('Error al cargar tarjeta:', error)
      navigate(`/board/${boardId}`)
    } finally {
      setLoading(false)
    }
  }

  const loadBoard = async () => {
    if (!boardId) return
    try {
      const { data } = await api.get<{ due_date: string | null; owner: User }>(`boards/${boardId}/`)
      setBoard(data)
    } catch (error) {
      console.error('Error al cargar tablero:', error)
    }
  }

  // Verificar si el usuario es docente y dueño del tablero
  const isTeacherOwner = user?.role === 'teacher' && board?.owner?.id === user?.id

  const loadBoardMembers = async () => {
    if (!boardId) return
    try {
      const { data } = await api.get<{ owner: User; members: User[] }>(`boards/${boardId}/`)
      // Combinar owner y members en una lista única
      const allMembers = [data.owner, ...data.members]
      // Eliminar duplicados por ID
      const uniqueMembers = allMembers.filter((member, index, self) => 
        index === self.findIndex(m => m.id === member.id)
      )
      setBoardMembers(uniqueMembers)
    } catch (error) {
      console.error('Error al cargar miembros del tablero:', error)
    }
  }

  const toggleAssignee = async (userId: number) => {
    if (!cardId) return
    const isAssigned = card?.assignees.some(a => a.id === userId)
    try {
      await api.post(`cards/${cardId}/assignees/`, {
        user_id: userId,
        action: isAssigned ? 'remove' : 'add',
      })
      await loadCard() // Recargar la tarjeta para actualizar los asignados
    } catch (error: any) {
      console.error('Error al gestionar asignado:', error)
      alert(error?.response?.data?.detail || 'Error al gestionar asignado')
    }
  }

  const saveCard = async () => {
    if (!cardId) return
    try {
      // Validar que la fecha no exceda la del tablero
      if (editDueDate && board?.due_date) {
        const cardDate = new Date(editDueDate)
        const boardDate = new Date(board.due_date)
        if (cardDate > boardDate) {
          alert(`La fecha límite de la tarjeta no puede ser posterior a la fecha límite del tablero (${board.due_date})`)
          return
        }
      }
      
      const { data } = await api.patch(`cards/${cardId}/`, {
        title: editTitle,
        due_date: editDueDate || null,
        priority: editPriority,
      })
      setCard(data)
      setEditing(false)
    } catch (error: any) {
      console.error('Error al guardar tarjeta:', error)
      alert(error?.response?.data?.detail || error?.response?.data?.due_date?.[0] || 'Error al guardar la tarjeta')
    }
  }

  const deleteCard = async () => {
    if (!cardId || !confirm('¿Estás seguro de eliminar esta tarjeta?')) return
    try {
      await api.delete(`cards/${cardId}/`)
      navigate(`/board/${boardId}`)
    } catch (error) {
      console.error('Error al eliminar tarjeta:', error)
    }
  }

  if (loading) {
    return (
      <div 
        className={`min-h-screen flex items-center justify-center relative transition-colors duration-300 ${
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
        <div className="relative z-10 text-xl">Cargando...</div>
      </div>
    )
  }

  if (!card) {
    return null
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'med':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
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
        <div className="absolute inset-0 bg-gray-900 bg-opacity-60 transition-all duration-300"></div>
      )}
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => navigate(`/board/${boardId}`)} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        // Solo cerrar si se hace clic en el overlay, no en el modal mismo
        if (e.target === e.currentTarget) {
          navigate(`/board/${boardId}`)
        }
      }}>
        <div 
          className={`bg-opacity-70 backdrop-blur-md rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto transition-all duration-300 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700 flex items-start justify-between">
            <div className="flex-1">
              {editing && isTeacherOwner ? (
                <input
                  type="text"
                  className="input-modern text-xl font-bold mb-4"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-bold mb-4">{card.title}</h2>
              )}
            </div>
            <button
              onClick={() => navigate(`/board/${boardId}`)}
                className={`text-2xl transition-colors ${
                  theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Prioridad */}
            <div>
              <h3 className="font-semibold mb-2">Prioridad</h3>
              {editing && isTeacherOwner ? (
                <select
                  className="input-modern"
                  value={editPriority}
                  onChange={e => setEditPriority(e.target.value as 'low' | 'med' | 'high')}
                >
                  <option value="low">Baja</option>
                  <option value="med">Media</option>
                  <option value="high">Alta</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-sm ${getPriorityColor(card.priority)}`}>
                    {card.priority === 'high' ? 'Alta' : card.priority === 'med' ? 'Media' : 'Baja'}
                  </span>
                </div>
              )}
            </div>

            {/* Fecha límite */}
            <div>
              <h3 className="font-semibold mb-2">Fecha límite</h3>
              {editing && isTeacherOwner ? (
                <div>
                  <input
                    type="date"
                    className="input-modern"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={board?.due_date ? board.due_date.split('T')[0] : undefined}
                  />
                  {board?.due_date && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                      Máximo: {new Date(board.due_date).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {card.due_date ? (
                    <span className="px-3 py-1 bg-yellow-600 rounded text-sm">
                      📅 {new Date(card.due_date).toLocaleDateString('es-ES')}
                    </span>
                  ) : (
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`}>Sin fecha límite</span>
                  )}
                </div>
              )}
            </div>

            {/* Responsables */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Responsables</h3>
                {isTeacherOwner && (
                  <button
                    onClick={() => setShowAssigneesModal(true)}
                    className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                      theme === 'dark' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    + Agregar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {card.assignees.map(user => (
                  <span 
                    key={user.id} 
                    className="px-3 py-1 bg-blue-600 rounded text-sm flex items-center gap-2"
                  >
                    {user.username}
                    {isTeacherOwner && (
                      <button
                        onClick={() => toggleAssignee(user.id)}
                        className={`ml-2 px-2 py-0.5 rounded-full font-bold text-sm transition-all duration-200 ${
                          theme === 'dark'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                        title="Quitar asignado"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {card.assignees.length === 0 && (
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-700'}`}>Sin responsables asignados</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700 flex items-center justify-end gap-2">
            {isTeacherOwner && (
              <>
                {editing ? (
                  <>
                    <button
                      onClick={saveCard}
                      className="btn-success"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        loadCard()
                      }}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="btn-primary"
                    >
                      Editar
                    </button>
                    <button
                      onClick={deleteCard}
                      className="btn-danger"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de asignados */}
      {showAssigneesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center" onClick={() => setShowAssigneesModal(false)}>
          <div className={`bg-opacity-70 backdrop-blur-md rounded-lg p-6 w-full max-w-md transition-all duration-300 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Asignar responsables</h3>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {boardMembers.length === 0 ? (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>No hay miembros disponibles</p>
              ) : (
                boardMembers.map(member => {
                  const isAssigned = card?.assignees.some(a => a.id === member.id)
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                        isAssigned 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : theme === 'dark'
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}
                      onClick={() => {
                        if (isTeacherOwner) {
                          toggleAssignee(member.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{member.username}</span>
                      </div>
                      {isAssigned && <span className={isAssigned ? 'text-white' : ''}>✓</span>}
                    </div>
                  )
                })
              )}
            </div>
            <button
              onClick={() => setShowAssigneesModal(false)}
              className="btn-secondary w-full"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

