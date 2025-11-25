import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from './views/LoginPage'
import { TeacherDashboard } from './views/TeacherDashboard'
import { StudentDashboard } from './views/StudentDashboard'
import { BoardView } from './views/BoardView'
import { CardDetailView } from './views/CardDetailView'
import { CalendarView } from './views/CalendarView'
import { PrivateRoute } from './components/PrivateRoute'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/dashboard/teacher',
    element: (
      <PrivateRoute>
        <TeacherDashboard />
      </PrivateRoute>
    ),
  },
  {
    path: '/dashboard/student',
    element: (
      <PrivateRoute>
        <StudentDashboard />
      </PrivateRoute>
    ),
  },
  {
    path: '/board/:id',
    element: (
      <PrivateRoute>
        <BoardView />
      </PrivateRoute>
    ),
  },
  {
    path: '/board/:boardId/card/:cardId',
    element: (
      <PrivateRoute>
        <CardDetailView />
      </PrivateRoute>
    ),
  },
  {
    path: '/calendar',
    element: (
      <PrivateRoute>
        <CalendarView />
      </PrivateRoute>
    ),
  },
])

