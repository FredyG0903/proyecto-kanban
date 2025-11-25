/**
 * Reproduce un sonido de notificación similar a Facebook Messenger
 * Usa Web Audio API para generar un sonido tipo "pop" o "ding" característico
 */
export function playNotificationSound() {
  try {
    // Crear contexto de audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Crear dos osciladores para un sonido más rico (similar a Messenger)
    const oscillator1 = audioContext.createOscillator()
    const oscillator2 = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Conectar los nodos
    oscillator1.connect(gainNode)
    oscillator2.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configurar el primer oscilador (tono principal más agudo, similar a Messenger)
    oscillator1.frequency.value = 1000 // Frecuencia principal más aguda
    oscillator1.type = 'sine'
    
    // Configurar el segundo oscilador (armónico para darle más cuerpo)
    oscillator2.frequency.value = 1500 // Frecuencia armónica
    oscillator2.type = 'sine'
    
    // Configurar volumen con un ataque rápido y decay suave (típico de Messenger)
    const now = audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01) // Ataque muy rápido
    gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.08) // Decay rápido
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2) // Fade out suave
    
    // Reproducir ambos osciladores
    oscillator1.start(now)
    oscillator1.stop(now + 0.2) // Duración corta (200ms) como Messenger
    
    oscillator2.start(now)
    oscillator2.stop(now + 0.2)
    
    // Limpiar después de que termine
    oscillator1.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.warn('No se pudo reproducir el sonido de notificación:', error)
    // Fallback: intentar con un elemento audio HTML5 si está disponible
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp6aFREAo=')
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignorar errores de reproducción
      })
    } catch (e) {
      // Si todo falla, simplemente no reproducir sonido
    }
  }
}

/**
 * Verifica si el sonido está habilitado (guardado en localStorage)
 */
export function isSoundEnabled(): boolean {
  const soundEnabled = localStorage.getItem('notificationSoundEnabled')
  return soundEnabled === null || soundEnabled === 'true' // Por defecto habilitado
}

/**
 * Habilita o deshabilita el sonido de notificaciones
 */
export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem('notificationSoundEnabled', enabled.toString())
}

