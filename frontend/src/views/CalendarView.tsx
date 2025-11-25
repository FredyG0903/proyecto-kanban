import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import api from '@/lib/api'
import { BACKGROUND_IMAGE_URL } from '@/config/background'
import { NotificationBell } from '@/components/NotificationBell'

type CalendarEvent = {
  id: number
  title: string
  description: string
  due_date: string
  priority: 'LOW' | 'MED' | 'HIGH'
  board_id: number
  board_name: string
  list_name: string
  assignees: Array<{ id: number; username: string }>
}

export function CalendarView() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const { theme } = useThemeStore()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterBoardId, setFilterBoardId] = useState<number | null>(null)
  const [boards, setBoards] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    loadBoards()
    loadEvents()
  }, [filterBoardId])

  const loadBoards = async () => {
    try {
      const { data } = await api.get('boards/')
      setBoards(data)
    } catch (error) {
      console.error('Error al cargar tableros:', error)
    }
  }

  const loadEvents = async () => {
    setLoading(true)
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      const params: any = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      }
      
      if (filterBoardId) {
        params.board_id = filterBoardId
      }
      
      const { data } = await api.get<CalendarEvent[]>('calendar/', { params })
      setEvents(data)
    } catch (error) {
      console.error('Error al cargar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToICS = async () => {
    try {
      const params: any = {}
      if (filterBoardId) {
        params.board_id = filterBoardId
      }
      
      const response = await api.get('calendar/export/', {
        params,
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `kanban-calendar-${filterBoardId || 'all'}.ics`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error al exportar calendario:', error)
      alert('Error al exportar el calendario')
    }
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => event.due_date === dateStr)
  }

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    // Agregar días del mes anterior para completar la semana
    const startDay = firstDay.getDay()
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    
    // Agregar días del mes actual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    // Agregar días del mes siguiente para completar la semana
    const remainingDays = 42 - days.length // 6 semanas * 7 días
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day))
    }
    
    return days
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  useEffect(() => {
    loadEvents()
  }, [currentMonth])

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear()
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'HIGH':
        return theme === 'dark' ? 'bg-red-600' : 'bg-red-500'
      case 'MED':
        return theme === 'dark' ? 'bg-yellow-600' : 'bg-yellow-500'
      case 'LOW':
        return theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
      default:
        return theme === 'dark' ? 'bg-gray-600' : 'bg-gray-500'
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
        {/* Header */}
        <header className={`${theme === 'dark' ? 'bg-gray-800 bg-opacity-90' : 'bg-white bg-opacity-90'} backdrop-blur-md shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(user?.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student')}
                  className={`btn-secondary ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  ← Volver
                </button>
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Calendario
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  ¡Hola, {user?.username}!
                </span>
                <button
                  onClick={logout}
                  className="btn-danger"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Controles */}
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${theme === 'dark' ? 'bg-gray-800 bg-opacity-90' : 'bg-white bg-opacity-90'} backdrop-blur-md m-4 rounded-lg shadow-lg`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateMonth('prev')}
                className={`btn-secondary ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                ← Anterior
              </button>
              <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className={`btn-secondary ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Siguiente →
              </button>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={filterBoardId || ''}
                onChange={(e) => setFilterBoardId(e.target.value ? parseInt(e.target.value) : null)}
                className={`px-4 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Todos los tableros</option>
                {boards.map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
              <button
                onClick={exportToICS}
                className="btn-success"
              >
                📥 Exportar .ics
              </button>
            </div>
          </div>

          {/* Calendario */}
          {loading ? (
            <div className="text-center py-12">
              <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Cargando calendario...</div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Días de la semana */}
              {weekDays.map(day => (
                <div
                  key={day}
                  className={`text-center font-semibold py-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* Días del mes */}
              {getDaysInMonth(currentMonth).map((date, index) => {
                const dayEvents = getEventsForDate(date)
                const isCurrentMonthDay = isCurrentMonth(date)
                const isTodayDay = isToday(date)

                return (
                  <div
                    key={index}
                    className={`min-h-24 p-2 border rounded-lg ${
                      theme === 'dark'
                        ? isCurrentMonthDay
                          ? 'bg-gray-800 bg-opacity-50 border-gray-700'
                          : 'bg-gray-900 bg-opacity-30 border-gray-800'
                        : isCurrentMonthDay
                        ? 'bg-white bg-opacity-50 border-gray-200'
                        : 'bg-gray-100 bg-opacity-30 border-gray-300'
                    } ${
                      !isCurrentMonthDay
                        ? theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                        : ''
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isTodayDay
                          ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center'
                          : ''
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          onClick={() => navigate(`/board/${event.board_id}/card/${event.id}`)}
                          className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${getPriorityColor(event.priority)} text-white truncate`}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          +{dayEvents.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Leyenda */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${theme === 'dark' ? 'bg-red-600' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${theme === 'dark' ? 'bg-yellow-600' : 'bg-yellow-500'}`}></div>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Media</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'}`}></div>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Baja</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




