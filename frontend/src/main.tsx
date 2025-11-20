import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { useAuthStore } from './store/auth'
import { useThemeStore } from './store/theme'

// Inicializar auth al cargar la app
useAuthStore.getState().initialize()

// Inicializar tema al cargar la app
const theme = useThemeStore.getState().theme
document.documentElement.setAttribute('data-theme', theme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)

