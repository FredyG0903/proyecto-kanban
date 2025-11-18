import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'

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
}

export function CardDetailView() {
  const { boardId, cardId } = useParams<{ boardId: string; cardId: string }>()
  const navigate = useNavigate()

  const [card, setCard] = useState<Card | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [showLabelModal, setShowLabelModal] = useState(false)

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
    }
  }, [cardId])

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

  const saveCard = async () => {
    if (!cardId) return
    try {
      const { data } = await api.patch(`cards/${cardId}/`, {
        title: editTitle,
        description: editDescription,
        due_date: editDueDate || null,
        priority: editPriority,
      })
      setCard(data)
      setEditing(false)
    } catch (error) {
      console.error('Error al guardar tarjeta:', error)
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
              <h3 className="font-semibold mb-2">Descripción</h3>
              {editing ? (
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 min-h-[100px]"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Agregar descripción..."
                />
              ) : (
                <p className="text-gray-300 whitespace-pre-wrap">
                  {card.description || <span className="text-gray-500 italic">Sin descripción</span>}
                </p>
              )}
            </div>

            {/* Fecha límite y Prioridad (solo en edición) */}
            {editing && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha límite</label>
                  <input
                    type="date"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
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
              <h3 className="font-semibold mb-2">Responsables</h3>
              <div className="flex flex-wrap gap-2">
                {card.assignees.map(user => (
                  <span key={user.id} className="px-3 py-1 bg-blue-600 rounded text-sm">
                    {user.username}
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
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklistItem(item)}
                      className="w-5 h-5"
                    />
                    <span className={item.done ? 'line-through text-gray-500' : ''}>{item.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={addChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2"
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
              <h3 className="font-semibold mb-2">Comentarios</h3>
              <form onSubmit={addComment} className="mb-4">
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2"
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={3}
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                  Comentar
                </button>
              </form>
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-gray-700 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{comment.author.username}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <p className="text-gray-300">{comment.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-gray-500 text-sm">No hay comentarios aún</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Creado por {card.created_by.username} el {new Date(card.created_at).toLocaleDateString('es-ES')}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Agregar etiqueta</h3>
            <div className="space-y-2 mb-4">
              {labels.map(label => (
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
                  {card.labels.some(l => l.id === label.id) && <span>✓</span>}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowLabelModal(false)}
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

