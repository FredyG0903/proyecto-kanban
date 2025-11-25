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

// Convertir la clave pública VAPID de base64 URL-safe a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // La clave VAPID pública debe tener exactamente 65 bytes (87 caracteres en base64 URL-safe)
  // Remover cualquier padding que pueda tener
  let base64 = base64String.trim()
  
  // Reemplazar caracteres URL-safe por caracteres estándar de base64
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
  
  // Agregar padding si es necesario
  while (base64.length % 4) {
    base64 += '='
  }
  
  try {
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    
    // Validar que la clave tenga el tamaño correcto (65 bytes para VAPID con prefijo 0x04)
    if (outputArray.length !== 65) {
      const errorMsg = `La clave VAPID tiene ${outputArray.length} bytes, se esperan exactamente 65 bytes`
      console.error(`❌ ${errorMsg}`)
      throw new Error(errorMsg)
    }
    
    // Verificar que el primer byte sea 0x04 (prefijo del punto no comprimido)
    if (outputArray[0] !== 0x04) {
      console.warn(`⚠️ El primer byte de la clave VAPID es ${outputArray[0]} (0x${outputArray[0].toString(16)}), se espera 0x04`)
    }
    
    console.log(`✅ Clave VAPID convertida: ${outputArray.length} bytes (primer byte: 0x${outputArray[0].toString(16)})`)
    return outputArray
  } catch (error) {
    console.error('❌ Error al convertir clave VAPID:', error)
    throw new Error(`Error al convertir clave VAPID: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Registrar el service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers no están soportados')
    return null
  }

  try {
    console.log('   Registrando Service Worker desde:', SW_URL)
    console.log('   URL completa:', window.location.origin + SW_URL)
    
    // Verificar primero si el archivo es accesible
    try {
      const response = await fetch(SW_URL, { method: 'HEAD' })
      console.log('   ✅ Archivo sw.js es accesible:', response.status)
      if (!response.ok) {
        throw new Error(`sw.js no es accesible: ${response.status} ${response.statusText}`)
      }
    } catch (fetchError) {
      console.error('   ❌ Error al verificar sw.js:', fetchError)
      throw new Error(`No se puede acceder a ${SW_URL}. Verifica que el archivo exista en public/sw.js`)
    }
    
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: '/'
    })
    console.log('✅ Service Worker registrado exitosamente:', registration)
    console.log('   - Scope:', registration.scope)
    console.log('   - Active:', registration.active?.state)
    console.log('   - Installing:', registration.installing?.state)
    console.log('   - Waiting:', registration.waiting?.state)
    
    // Esperar a que el service worker esté activo
    if (registration.installing) {
      console.log('   ⏳ Service Worker se está instalando, esperando activación...')
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.warn('   ⚠️ Timeout esperando activación, continuando de todas formas...')
            resolve() // No rechazar, solo continuar
          }, 5000) // 5 segundos timeout
          
          const worker = registration.installing!
          worker.addEventListener('statechange', function() {
            console.log('   📋 Estado del Service Worker:', this.state)
            if (this.state === 'activated' || this.state === 'activating') {
              console.log('✅ Service Worker activado/activando')
              clearTimeout(timeout)
              resolve()
            } else if (this.state === 'redundant') {
              console.warn('   ⚠️ Service Worker se volvió redundante')
              clearTimeout(timeout)
              resolve() // Continuar de todas formas
            }
          })
          
          // Si ya está activando, resolver inmediatamente
          if (worker.state === 'activating' || worker.state === 'activated') {
            clearTimeout(timeout)
            resolve()
          }
        })
      } catch (error) {
        console.warn('   ⚠️ Error esperando activación, continuando:', error)
      }
    } else if (registration.waiting) {
      console.log('   ⚠️ Service Worker está esperando, intentando activar...')
      try {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        // Esperar un momento para que se active
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.warn('   ⚠️ No se pudo activar Service Worker en espera:', error)
      }
    } else if (registration.active) {
      console.log('   ✅ Service Worker ya está activo')
    } else {
      console.warn('   ⚠️ Service Worker no está en ningún estado conocido')
    }
    
    return registration
  } catch (error) {
    console.error('❌ Error al registrar Service Worker:', error)
    if (error instanceof Error) {
      console.error('   - Mensaje:', error.message)
      console.error('   - Stack:', error.stack)
    }
    // Intentar obtener un registro existente
    try {
      const existing = await navigator.serviceWorker.getRegistration()
      if (existing) {
        console.log('   ℹ️ Se encontró un Service Worker existente:', existing)
        return existing
      }
    } catch (e) {
      console.error('   ❌ No se pudo obtener Service Worker existente:', e)
    }
    return null
  }
}

// Suscribirse a notificaciones push
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    console.log('🔄 Iniciando suscripción a push notifications...')
    
    // Verificar que estemos en HTTPS o localhost
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      throw new Error('Las notificaciones push solo funcionan en HTTPS o localhost')
    }
    
    // Registrar el service worker si no está registrado
    console.log('🔄 Registrando Service Worker...')
    let registration = await registerServiceWorker()
    
    if (!registration) {
      console.warn('⚠️ No se pudo registrar el Service Worker, intentando obtener registro existente...')
      // Intentar obtener un registro existente
      try {
        registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          console.log('✅ Service Worker ya estaba registrado:', registration)
        } else {
          throw new Error('No se pudo registrar ni encontrar un Service Worker existente')
        }
      } catch (error) {
        console.error('❌ Error al obtener Service Worker existente:', error)
        throw new Error('No se pudo registrar el Service Worker')
      }
    }

    // Esperar a que el service worker esté activo con timeout
    console.log('🔄 Esperando a que el Service Worker esté listo...')
    let readyRegistration: ServiceWorkerRegistration
    
    try {
      // Verificar si ya hay un Service Worker activo
      const existingReg = await navigator.serviceWorker.getRegistration()
      if (existingReg && existingReg.active) {
        console.log('✅ Service Worker ya está activo:', existingReg)
        readyRegistration = existingReg
      } else {
        // Crear una promesa con timeout
        console.log('   ⏳ Esperando activación del Service Worker (máximo 5 segundos)...')
        const readyPromise = navigator.serviceWorker.ready
        const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) => {
          setTimeout(() => {
            console.warn('   ⚠️ Timeout esperando Service Worker, intentando continuar...')
            reject(new Error('Timeout esperando Service Worker'))
          }, 5000) // 5 segundos timeout
        })
        
        try {
          readyRegistration = await Promise.race([readyPromise, timeoutPromise])
          console.log('✅ Service Worker listo:', readyRegistration)
        } catch (timeoutError) {
          // Si hay timeout, intentar obtener el registro de todas formas
          console.warn('   ⚠️ Timeout, pero intentando obtener Service Worker existente...')
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) {
            console.log('   ℹ️ Service Worker encontrado (puede no estar activo):', reg)
            console.log('   - Active:', reg.active?.state)
            console.log('   - Installing:', reg.installing?.state)
            console.log('   - Waiting:', reg.waiting?.state)
            
            // Si hay uno en waiting, intentar activarlo
            if (reg.waiting) {
              console.log('   🔄 Intentando activar Service Worker en espera...')
              reg.waiting.postMessage({ type: 'SKIP_WAITING' })
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            // Usar el registro aunque no esté completamente activo
            readyRegistration = reg
          } else {
            throw new Error('No se pudo obtener Service Worker. Verifica que el archivo sw.js sea accesible en /sw.js')
          }
        }
      }
      
      console.log('✅ Service Worker disponible:', readyRegistration)
      console.log('   - Scope:', readyRegistration.scope)
      console.log('   - Active:', readyRegistration.active?.state)
    } catch (error) {
      console.error('❌ Error al obtener Service Worker:', error)
      throw new Error(`Service Worker no está disponible: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }

    // Verificar si ya existe una suscripción
    const existingSubscription = await readyRegistration.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('ℹ️ Ya existe una suscripción push local')
      console.log('   Endpoint:', existingSubscription.endpoint.substring(0, 50) + '...')
      // Verificar si está registrada en el backend
      try {
        console.log('🔄 Verificando si la suscripción está en el backend...')
        const subscriptions = await api.get('push-subscriptions/')
        console.log('   Suscripciones en backend:', subscriptions.data.length)
        const isRegistered = subscriptions.data.some((sub: any) => sub.endpoint === existingSubscription.endpoint)
        if (isRegistered) {
          console.log('✅ Suscripción ya registrada en el backend')
          return existingSubscription
        } else {
          console.log('⚠️ Suscripción existe localmente pero no está en el backend, registrándola...')
          // Registrar la suscripción existente
          const subscriptionData = {
            endpoint: existingSubscription.endpoint,
            p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(existingSubscription.getKey('auth')!),
          }
          console.log('🔄 Enviando suscripción al backend...')
          try {
            const response = await api.post('push-subscriptions/', subscriptionData)
            console.log('✅ Suscripción registrada en el backend')
            console.log('   - ID de suscripción:', response.data?.id || 'N/A')
            return existingSubscription
          } catch (error: any) {
            console.error('❌ Error al registrar suscripción existente:', error)
            if (error?.response) {
              console.error('   - Status:', error.response.status)
              console.error('   - Data:', error.response.data)
            }
            throw error
          }
        }
      } catch (error) {
        console.error('❌ Error al verificar/registrar suscripciones existentes:', error)
        if (error instanceof Error) {
          console.error('   - Mensaje:', error.message)
        }
        // Si hay un error, intentar crear una nueva suscripción
        console.log('🔄 Error al verificar suscripción existente, intentando crear nueva...')
        // No retornar aquí, continuar con el proceso de crear una nueva suscripción
      }
    }

    // Obtener la clave pública VAPID
    console.log('🔄 Obteniendo clave pública VAPID...')
    const vapidPublicKey = await getVapidPublicKey()
    if (!vapidPublicKey) {
      throw new Error('No se pudo obtener la clave pública VAPID')
    }
    console.log('✅ Clave VAPID obtenida del backend')
    console.log('   Longitud:', vapidPublicKey.length, 'caracteres')
    console.log('   Primeros 20 caracteres:', vapidPublicKey.substring(0, 20) + '...')

    // Validar formato de la clave
    if (vapidPublicKey.length < 80) {
      throw new Error(`Clave VAPID demasiado corta: ${vapidPublicKey.length} caracteres (se esperan ~87)`)
    }

    // Convertir la clave a Uint8Array
    console.log('🔄 Convirtiendo clave VAPID a Uint8Array...')
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    console.log('✅ Clave VAPID convertida a Uint8Array')
    console.log('   Tamaño del array:', applicationServerKey.length, 'bytes')

    // Suscribirse
    console.log('🔄 Suscribiéndose a push notifications...')
    const subscription = await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    })
    console.log('✅ Suscripción push creada localmente')
    console.log('   - Endpoint:', subscription.endpoint.substring(0, 50) + '...')

    // Enviar la suscripción al backend
    const subscriptionData = {
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
      auth: arrayBufferToBase64(subscription.getKey('auth')!),
    }

    console.log('🔄 Registrando suscripción en el backend...')
    try {
      const response = await api.post('push-subscriptions/', subscriptionData)
      console.log('✅ Suscripción registrada exitosamente en el backend')
      console.log('   - ID de suscripción:', response.data?.id || 'N/A')
    } catch (error: any) {
      console.error('❌ Error al registrar suscripción en el backend:', error)
      if (error?.response) {
        console.error('   - Status:', error.response.status)
        console.error('   - Data:', error.response.data)
      }
      throw error // Re-lanzar el error para que el llamador lo maneje
    }

    return subscription
  } catch (error) {
    console.error('❌ Error al suscribirse a push notifications:', error)
    if (error instanceof Error) {
      console.error('   - Mensaje:', error.message)
      console.error('   - Stack:', error.stack)
    }
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
    console.log('🔄 Verificando suscripción push local...')
    
    if (!('serviceWorker' in navigator)) {
      console.warn('   ⚠️ Service Worker no está disponible')
      return false
    }
    
    console.log('   Esperando Service Worker...')
    const registration = await navigator.serviceWorker.ready
    console.log('   ✅ Service Worker listo')
    console.log('   - Scope:', registration.scope)
    console.log('   - Active:', registration.active?.state)
    
    if (!registration.pushManager) {
      console.warn('   ⚠️ PushManager no está disponible')
      return false
    }
    
    console.log('   Obteniendo suscripción...')
    const subscription = await registration.pushManager.getSubscription()
    const isSubscribed = subscription !== null
    console.log('   📋 Suscripción encontrada:', isSubscribed)
    
    if (subscription) {
      console.log('   ✅ Endpoint:', subscription.endpoint.substring(0, 50) + '...')
    } else {
      console.log('   ℹ️ No hay suscripción local activa')
    }
    
    return isSubscribed
  } catch (error) {
    console.error('❌ Error al verificar suscripción:', error)
    if (error instanceof Error) {
      console.error('   - Mensaje:', error.message)
      console.error('   - Stack:', error.stack)
    }
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
  console.log('🚀 Inicializando notificaciones push...')
  
  if (!isPushSupported()) {
    console.warn('⚠️ Las notificaciones push no están soportadas en este navegador')
    return false
  }
  console.log('✅ Navegador soporta notificaciones push')

  // Verificar protocolo
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    console.warn('⚠️ Las notificaciones push solo funcionan en HTTPS o localhost')
    console.warn('   Protocolo actual:', location.protocol)
    console.warn('   Hostname actual:', location.hostname)
    return false
  }
  console.log('✅ Protocolo válido para push notifications')

  // Verificar estado de permisos
  console.log('📋 Estado de permisos:', Notification.permission)

  // Verificar si ya tenemos permisos
  if (Notification.permission === 'granted') {
    console.log('✅ Permisos ya concedidos')
    // Ya tenemos permisos, verificar si estamos suscritos
    console.log('🔄 Verificando si hay suscripción local...')
    let subscribed = false
    try {
      subscribed = await isSubscribed()
      console.log('📋 Estado de suscripción local:', subscribed ? 'Sí' : 'No')
    } catch (error) {
      console.error('❌ Error al verificar suscripción local:', error)
      subscribed = false
    }
    if (!subscribed) {
      console.log('🔄 No hay suscripción activa, creando una...')
      try {
        await subscribeToPush()
        console.log('✅ Notificaciones push inicializadas exitosamente')
        return true
      } catch (error) {
        console.error('❌ Error al suscribirse después de obtener permisos:', error)
        if (error instanceof Error) {
          console.error('   - Mensaje:', error.message)
          console.error('   - Stack:', error.stack)
        }
        return false
      }
    } else {
      console.log('✅ Ya existe una suscripción push local')
      // Verificar si está registrada en el backend
      try {
        console.log('🔄 Verificando registro en backend...')
        const subscriptions = await api.get('push-subscriptions/')
        const registration = await navigator.serviceWorker.ready
        const localSubscription = await registration.pushManager.getSubscription()
        if (localSubscription) {
          const isRegistered = subscriptions.data.some((sub: any) => sub.endpoint === localSubscription.endpoint)
          if (!isRegistered) {
            console.log('⚠️ Suscripción local existe pero no está en backend, registrándola...')
            const subscriptionData = {
              endpoint: localSubscription.endpoint,
              p256dh: arrayBufferToBase64(localSubscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(localSubscription.getKey('auth')!),
            }
            await api.post('push-subscriptions/', subscriptionData)
            console.log('✅ Suscripción registrada en el backend')
          } else {
            console.log('✅ Suscripción ya está registrada en el backend')
          }
        }
        return true
      } catch (error) {
        console.error('❌ Error al verificar registro en backend:', error)
        // No fallar, la suscripción local existe
        return true
      }
    }
  }

  // Si no tenemos permisos, solicitarlos
  if (Notification.permission === 'default') {
    console.log('🔄 Solicitando permisos de notificación...')
    try {
      const permission = await requestNotificationPermission()
      console.log('📋 Respuesta de permisos:', permission)
      if (permission === 'granted') {
        await subscribeToPush()
        console.log('✅ Notificaciones push inicializadas exitosamente')
        return true
      } else {
        console.warn('⚠️ Permisos de notificación denegados por el usuario')
        return false
      }
    } catch (error) {
      console.error('❌ Error al solicitar permisos:', error)
      return false
    }
  }

  // Permisos denegados
  console.warn('⚠️ Los permisos de notificación fueron denegados previamente')
  console.warn('   El usuario debe habilitar los permisos manualmente en la configuración del navegador')
  return false
}




