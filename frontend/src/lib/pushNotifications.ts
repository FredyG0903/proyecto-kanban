import api from './api'

// URL base para el service worker
const SW_URL = '/sw.js'

// Verificar si el navegador soporta notificaciones push
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Solicitar permisos para notificaciones
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Este navegador no soporta notificaciones')
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Obtener la clave pública VAPID del backend
export async function getVapidPublicKey(): Promise<string> {
  try {
    const { data } = await api.get<{ public_key: string }>('push-subscriptions/public_key/')
    return data.public_key
  } catch (error) {
    console.error('Error al obtener clave pública VAPID:', error)
    throw error
  }
}

// Convertir la clave pública VAPID de base64 a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Registrar el service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers no están soportados')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL)
    console.log('Service Worker registrado:', registration)
    return registration
  } catch (error) {
    console.error('Error al registrar Service Worker:', error)
    return null
  }
}

// Suscribirse a notificaciones push
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    // Registrar el service worker si no está registrado
    const registration = await registerServiceWorker()
    if (!registration) {
      throw new Error('No se pudo registrar el Service Worker')
    }

    // Esperar a que el service worker esté activo
    await navigator.serviceWorker.ready

    // Obtener la clave pública VAPID
    const vapidPublicKey = await getVapidPublicKey()
    if (!vapidPublicKey) {
      throw new Error('No se pudo obtener la clave pública VAPID')
    }

    // Convertir la clave a Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    // Suscribirse
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    })

    // Enviar la suscripción al backend
    const subscriptionData = {
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
      auth: arrayBufferToBase64(subscription.getKey('auth')!),
    }

    await api.post('push-subscriptions/', subscriptionData)

    console.log('Suscripción push creada:', subscription)
    return subscription
  } catch (error) {
    console.error('Error al suscribirse a push notifications:', error)
    throw error
  }
}

// Cancelar suscripción push
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // Eliminar del backend
      try {
        const subscriptions = await api.get('push-subscriptions/')
        for (const sub of subscriptions.data) {
          if (sub.endpoint === subscription.endpoint) {
            await api.delete(`push-subscriptions/${sub.id}/`)
          }
        }
      } catch (error) {
        console.error('Error al eliminar suscripción del backend:', error)
      }

      return true
    }
    return false
  } catch (error) {
    console.error('Error al cancelar suscripción push:', error)
    return false
  }
}

// Verificar si el usuario está suscrito
export async function isSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch (error) {
    console.error('Error al verificar suscripción:', error)
    return false
  }
}

// Convertir ArrayBuffer a base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// Inicializar notificaciones push (solicitar permisos y suscribirse)
export async function initializePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('Las notificaciones push no están soportadas en este navegador')
    return false
  }

  // Verificar si ya tenemos permisos
  if (Notification.permission === 'granted') {
    // Ya tenemos permisos, verificar si estamos suscritos
    const subscribed = await isSubscribed()
    if (!subscribed) {
      try {
        await subscribeToPush()
        return true
      } catch (error) {
        console.error('Error al suscribirse después de obtener permisos:', error)
        return false
      }
    }
    return true
  }

  // Si no tenemos permisos, solicitarlos
  if (Notification.permission === 'default') {
    try {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        await subscribeToPush()
        return true
      } else {
        console.warn('Permisos de notificación denegados')
        return false
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error)
      return false
    }
  }

  // Permisos denegados
  console.warn('Los permisos de notificación fueron denegados previamente')
  return false
}

