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

type Label = {
  id: number
  name: string
  color: string
}

type Comment = {
  id: number
  author: User
  content: string
  created_at: string
}

type ChecklistItem = {
  id: number
  text: string
  done: boolean
  position: number
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
  labels: Label[]
  created_at?: string
}

export function CardDetailView() {
  const { boardId, cardId } = useParams<{ boardId: string; cardId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [card, setCard] = useState<Card | null>(null)
  const [board, setBoard] = useState<{ due_date: string | null } | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [showAssigneesModal, setShowAssigneesModal] = useState(false)
  const [boardMembers, setBoardMembers] = useState<User[]>([])
  const [showCreateLabelForm, setShowCreateLabelForm] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6')

  // Formulario de edición
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'med' | 'high'>('med')

  useEffect(() => {
    if (cardId) {
      loadCard()
      loadComments()
      loadChecklist()
      loadLabels()
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
      setEditDescription(data.description)
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
      const { data } = await api.get<{ due_date: string | null }>(`boards/${boardId}/`)
      setBoard(data)
    } catch (error) {
      console.error('Error al cargar tablero:', error)
    }
  }

  const loadComments = async () => {
    try {
      const { data } = await api.get<Comment[]>(`comments/?card=${cardId}`)
      setComments(data)
    } catch (error) {
      console.error('Error al cargar comentarios:', error)
    }
  }

  const loadChecklist = async () => {
    try {
      const { data } = await api.get<ChecklistItem[]>(`checklist/?card=${cardId}`)
      setChecklist(data)
    } catch (error) {
      console.error('Error al cargar checklist:', error)
    }
  }

  const loadLabels = async () => {
    if (!boardId) return
    try {
      const { data } = await api.get<Label[]>(`labels/?board=${boardId}`)
      setLabels(data)
    } catch (error) {
      console.error('Error al cargar etiquetas:', error)
    }
  }

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
        description: editDescription,
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

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !cardId) return
    try {
      const { data } = await api.post<Comment>(`comments/`, {
        card: parseInt(cardId),
        content: newComment,
      })
      setComments([data, ...comments])
      setNewComment('')
    } catch (error) {
      console.error('Error al agregar comentario:', error)
    }
  }

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistItem.trim() || !cardId) return
    try {
      const { data } = await api.post<ChecklistItem>(`checklist/`, {
        card: parseInt(cardId),
        text: newChecklistItem,
        position: checklist.length,
      })
      setChecklist([...checklist, data])
      setNewChecklistItem('')
    } catch (error) {
      console.error('Error al agregar item:', error)
    }
  }

  const toggleChecklistItem = async (item: ChecklistItem) => {
    try {
      const { data } = await api.patch(`checklist/${item.id}/`, {
        done: !item.done,
      })
      setChecklist(checklist.map(i => (i.id === item.id ? data : i)))
    } catch (error) {
      console.error('Error al actualizar item:', error)
    }
  }

  const toggleLabel = async (label: Label) => {
    if (!cardId) return
    const hasLabel = card?.labels.some(l => l.id === label.id)
    try {
      await api.post(`labels/${label.id}/cards/`, {
        card_id: parseInt(cardId),
        action: hasLabel ? 'remove' : 'add',
      })
      await loadCard()
    } catch (error) {
      console.error('Error al toggle etiqueta:', error)
    }
  }

  const createLabel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabelName.trim() || !boardId) return
    try {
      const { data } = await api.post<Label>(`labels/`, {
        board: parseInt(boardId),
        name: newLabelName,
        color: newLabelColor,
      })
      setLabels([...labels, data])
      setNewLabelName('')
      setNewLabelColor('#3b82f6')
      setShowCreateLabelForm(false)
      // Automáticamente agregar la etiqueta a la tarjeta
      await api.post(`labels/${data.id}/cards/`, {
        card_id: parseInt(cardId!),
        action: 'add',
      })
      await loadCard()
    } catch (error: any) {
      console.error('Error al crear etiqueta:', error)
      alert(error?.response?.data?.detail || 'Error al crear etiqueta')
    }
  }

  const deleteChecklistItem = async (itemId: number) => {
    try {
      await api.delete(`checklist/${itemId}/`)
      setChecklist(checklist.filter(i => i.id !== itemId))
    } catch (error) {
      console.error('Error al eliminar item:', error)
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => navigate(`/board/${boardId}`)} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-700 flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-xl font-bold mb-2"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-bold mb-2">{card.title}</h2>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(card.priority)}`}>
                  {card.priority === 'high' ? 'Alta' : card.priority === 'med' ? 'Media' : 'Baja'}
                </span>
                {card.due_date && (
                  <span className="px-2 py-1 bg-yellow-600 rounded text-xs">
                    📅 {new Date(card.due_date).toLocaleDateString('es-ES')}
                  </span>
                )}
                {card.labels.map(label => (
                  <span
                    key={label.id}
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: label.color + '40', color: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate(`/board/${boardId}`)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Descripción */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Descripción</h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {card.description ? 'Editar' : 'Agregar'}
                  </button>
                )}
              </div>
              {editing ? (
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 min-h-[100px] text-white placeholder-gray-400"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Agregar descripción..."
                />
              ) : (
                <div 
                  className="text-gray-300 whitespace-pre-wrap cursor-pointer hover:bg-gray-700 rounded p-2 transition"
                  onClick={() => setEditing(true)}
                >
                  {card.description || <span className="text-gray-500 italic">Sin descripción. Haz clic para agregar una.</span>}
                </div>
              )}
            </div>

            {/* Fecha límite y Prioridad (solo en edición y solo para docentes) */}
            {editing && user?.role === 'teacher' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha límite
                    {board?.due_date && (
                      <span className="text-xs text-gray-400 block">
                        Máx: {new Date(board.due_date).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={board?.due_date ? board.due_date.split('T')[0] : undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prioridad</label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value as 'low' | 'med' | 'high')}
                  >
                    <option value="low">Baja</option>
                    <option value="med">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
            )}

            {/* Responsables */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Responsables</h3>
                <button
                  onClick={() => setShowAssigneesModal(true)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {card.assignees.map(user => (
                  <span 
                    key={user.id} 
                    className="px-3 py-1 bg-blue-600 rounded text-sm flex items-center gap-2"
                  >
                    {user.username}
                    <button
                      onClick={() => toggleAssignee(user.id)}
                      className="text-blue-200 hover:text-white"
                      title="Quitar asignado"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {card.assignees.length === 0 && (
                  <span className="text-gray-500 text-sm">Sin responsables asignados</span>
                )}
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h3 className="font-semibold mb-2">Checklist</h3>
              <div className="space-y-2 mb-3">
                {checklist.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay items en el checklist</p>
                ) : (
                  checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(item)}
                        className="w-5 h-5"
                      />
                      <span className={`flex-1 ${item.done ? 'line-through text-gray-500' : ''}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => deleteChecklistItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm"
                        title="Eliminar item"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={addChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400"
                  placeholder="Agregar item..."
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                  Agregar
                </button>
              </form>
            </div>

            {/* Etiquetas */}
            <div>
              <h3 className="font-semibold mb-2">Etiquetas</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {card.labels.map(label => (
                  <span
                    key={label.id}
                    className="px-3 py-1 rounded text-sm cursor-pointer"
                    style={{ backgroundColor: label.color + '40', color: label.color }}
                    onClick={() => toggleLabel(label)}
                  >
                    {label.name} ×
                  </span>
                ))}
              </div>
              <button
                onClick={() => setShowLabelModal(true)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                + Agregar etiqueta
              </button>
            </div>

            {/* Comentarios */}
            <div>
              <h3 className="font-semibold mb-2">Comentarios ({comments.length})</h3>
              <form onSubmit={addComment} className="mb-4">
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2 text-white placeholder-gray-400"
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={3}
                  required
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!newComment.trim()}
                >
                  Comentar
                </button>
              </form>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay comentarios aún</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-gray-700 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">{comment.author.username}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Creado por {card.created_by.username}
              {card.created_at && ` el ${new Date(card.created_at).toLocaleDateString('es-ES')}`}
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button
                    onClick={saveCard}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      loadCard()
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={deleteCard}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de etiquetas */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center" onClick={() => {
          setShowLabelModal(false)
          setShowCreateLabelForm(false)
        }}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Gestionar etiquetas</h3>
              <button
                onClick={() => {
                  setShowLabelModal(false)
                  setShowCreateLabelForm(false)
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Formulario para crear nueva etiqueta */}
            {showCreateLabelForm ? (
              <form onSubmit={createLabel} className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Nombre de la etiqueta</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400"
                    placeholder="Nombre..."
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Color</label>
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={e => setNewLabelColor(e.target.value)}
                    className="w-full h-10 cursor-pointer"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Crear y Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateLabelForm(false)
                      setNewLabelName('')
                      setNewLabelColor('#3b82f6')
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreateLabelForm(true)}
                className="w-full mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                + Crear nueva etiqueta
              </button>
            )}

            {/* Lista de etiquetas existentes */}
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {labels.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No hay etiquetas disponibles</p>
              ) : (
                labels.map(label => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
                    onClick={() => {
                      toggleLabel(label)
                      setShowLabelModal(false)
                    }}
                  >
                    <span
                      className="px-3 py-1 rounded text-sm"
                      style={{ backgroundColor: label.color + '40', color: label.color }}
                    >
                      {label.name}
                    </span>
                    {card.labels.some(l => l.id === label.id) && <span className="text-green-400">✓</span>}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => {
                setShowLabelModal(false)
                setShowCreateLabelForm(false)
              }}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de asignados */}
      {showAssigneesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center" onClick={() => setShowAssigneesModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Asignar responsables</h3>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {boardMembers.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay miembros disponibles</p>
              ) : (
                boardMembers.map(member => {
                  const isAssigned = card?.assignees.some(a => a.id === member.id)
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded cursor-pointer transition ${
                        isAssigned 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      onClick={() => toggleAssignee(member.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.username}</span>
                        {member.first_name && (
                          <span className="text-sm text-gray-300">
                            ({member.first_name} {member.last_name || ''})
                          </span>
                        )}
                      </div>
                      {isAssigned && <span className="text-white">✓</span>}
                    </div>
                  )
                })
              )}
            </div>
            <button
              onClick={() => setShowAssigneesModal(false)}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

