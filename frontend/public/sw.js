// Service Worker para recibir notificaciones push
self.addEventListener('push', function(event) {
  let data = {}
  
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = { title: 'Nueva notificación', body: event.data.text() }
    }
  }

  const options = {
    body: data.body || 'Tienes una nueva notificación',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: data.data || {},
    tag: `notification-${data.data?.notification_id || Date.now()}`,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Kanban Académico', options)
  )
})

// Manejar clics en las notificaciones
self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const data = event.notification.data || {}
  const boardId = data.board_id

  // Abrir o enfocar la ventana de la aplicación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Si hay una ventana abierta, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (boardId) {
            return client.navigate(`/board/${boardId}`).then(() => client.focus())
          }
          return client.focus()
        }
      }
      // Si no hay ventana abierta, abrir una nueva
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
  console.log('Notificación cerrada:', event.notification.tag)
})

