// Service Worker para recibir notificaciones push
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push event recibido')
  
  let data = {}
  
  if (event.data) {
    try {
      const text = event.data.text()
      console.log('[Service Worker] Datos recibidos (texto):', text)
      data = JSON.parse(text)
      console.log('[Service Worker] Datos parseados:', data)
    } catch (e) {
      console.error('[Service Worker] Error al parsear datos:', e)
      // Intentar parsear como objeto directamente si es posible
      try {
        if (typeof event.data.json === 'function') {
          data = event.data.json()
        } else {
          data = { 
            title: 'Nueva notificación', 
            body: event.data.text() || 'Tienes una nueva notificación'
          }
        }
      } catch (e2) {
        console.error('[Service Worker] Error al parsear datos alternativo:', e2)
        data = { 
          title: 'Nueva notificación', 
          body: event.data.text() || 'Tienes una nueva notificación'
        }
      }
    }
  } else {
    console.warn('[Service Worker] No hay datos en el evento push')
    data = { 
      title: 'Kanban Académico', 
      body: 'Tienes una nueva notificación'
    }
  }

  // Validar que los datos necesarios estén presentes
  if (!data.title && !data.body) {
    console.warn('[Service Worker] Datos de notificación incompletos, usando valores por defecto')
    data = {
      title: data.title || 'Kanban Académico',
      body: data.body || 'Tienes una nueva notificación'
    }
  }

  // Verificar si la página está visible (en primer plano)
  // Si está visible, aún así mostrar la notificación push para que el usuario la vea
  const options = {
    body: data.body || data.message || 'Tienes una nueva notificación',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: data.data || {},
    tag: `notification-${data.data?.notification_id || data.id || Date.now()}`,
    requireInteraction: false,  // Cambiar a true si queremos que el usuario interactúe
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    // Forzar mostrar la notificación incluso si la página está visible
    silent: false,
    renotify: true,  // Renotificar si hay una notificación con el mismo tag
  }

  console.log('[Service Worker] Mostrando notificación:', data.title || 'Kanban Académico', options)
  
  // Verificar si hay clientes (ventanas) activos
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const hasVisibleClients = clientList.some(client => client.visibilityState === 'visible')
        console.log('[Service Worker] Clientes activos:', clientList.length)
        console.log('[Service Worker] Hay clientes visibles:', hasVisibleClients)
        
        // IMPORTANTE: Siempre mostrar la notificación push, incluso si la página está visible
        // Esto es necesario porque el usuario podría estar en un modal y no ver las notificaciones in-app
        return self.registration.showNotification(data.title || 'Kanban Académico', options)
          .then(() => {
            console.log('[Service Worker] ✅ Notificación mostrada exitosamente')
            console.log('[Service Worker]   - Se mostró incluso con página visible para asegurar visibilidad')
          })
          .catch((error) => {
            console.error('[Service Worker] ❌ Error al mostrar notificación:', error)
            // Intentar mostrar una notificación básica como fallback
            return self.registration.showNotification('Kanban Académico', {
              body: data.body || data.message || 'Tienes una nueva notificación',
              tag: 'fallback-notification',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
            }).catch((fallbackError) => {
              console.error('[Service Worker] ❌ Error incluso con notificación fallback:', fallbackError)
            })
          })
      })
  )
})

// Manejar clics en las notificaciones
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Click en notificación:', event.notification)
  event.notification.close()

  const data = event.notification.data || {}
  const boardId = data.board_id
  console.log('[Service Worker] Board ID:', boardId)

  // Abrir o enfocar la ventana de la aplicación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      console.log('[Service Worker] Ventanas encontradas:', clientList.length)
      // Si hay una ventana abierta, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('[Service Worker] Enfocando ventana existente')
          if (boardId) {
            return client.navigate(`/board/${boardId}`).then(() => client.focus())
          }
          return client.focus()
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      console.log('[Service Worker] Abriendo nueva ventana')
      if (clients.openWindow) {
        if (boardId) {
          return clients.openWindow(`/board/${boardId}`)
        }
        return clients.openWindow('/')
      }
    })
  )
})

// Manejar notificaciones cerradas
self.addEventListener('notificationclose', function(event) {
  // Aquí podrías registrar que el usuario cerró la notificación sin interactuar
  console.log('[Service Worker] Notificación cerrada:', event.notification.tag)
})

// Log cuando el service worker se activa
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] ✅ Service Worker activado')
})

// Log cuando el service worker se instala
self.addEventListener('install', function(event) {
  console.log('[Service Worker] 📦 Service Worker instalado')
  // Forzar activación inmediata sin esperar
  event.waitUntil(
    self.skipWaiting().then(() => {
      console.log('[Service Worker] ✅ skipWaiting() ejecutado')
    })
  )
})

// Activar inmediatamente cuando se instala
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] 🔄 Service Worker activando...')
  // Tomar control de todas las páginas inmediatamente
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[Service Worker] ✅ clients.claim() ejecutado - Service Worker activo')
    })
  )
})




