import { ref } from 'vue'

export type WhatsAppNotificationSound = 'classic' | 'soft' | 'bell' | 'digital' | 'none'

export const WHATSAPP_NOTIFICATION_SOUNDS: Array<{
  value: WhatsAppNotificationSound
  label: string
  description: string
}> = [
  { value: 'classic', label: 'Clásico', description: 'Dos tonos claros y breves' },
  { value: 'soft', label: 'Suave', description: 'Discreto para espacios tranquilos' },
  { value: 'bell', label: 'Campana', description: 'Un aviso cálido de tres notas' },
  { value: 'digital', label: 'Digital', description: 'Rápido y fácil de reconocer' },
  { value: 'none', label: 'Sin sonido', description: 'Mantiene solo el aviso visual' },
]

const STORAGE_KEY = 'senor-arroz:whatsapp-notification-sound'
const validSounds = new Set(WHATSAPP_NOTIFICATION_SOUNDS.map(sound => sound.value))
let audioContext: AudioContext | null = null

function initialSound(): WhatsAppNotificationSound {
  if (typeof window === 'undefined') return 'classic'
  const saved = window.localStorage.getItem(STORAGE_KEY) as WhatsAppNotificationSound | null
  return saved && validSounds.has(saved) ? saved : 'classic'
}

const selectedWhatsAppSound = ref<WhatsAppNotificationSound>(initialSound())

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextCtor) return null
  audioContext ??= new AudioContextCtor()
  return audioContext
}

function scheduleTone(ctx: AudioContext, frequency: number, startAt: number, duration: number, gainValue: number, type: OscillatorType = 'sine') {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.03)
}

export function useNotificationSound() {
  function setWhatsAppNotificationSound(sound: WhatsAppNotificationSound) {
    selectedWhatsAppSound.value = sound
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, sound)
  }

  async function playWhatsAppMessageSound(sound = selectedWhatsAppSound.value) {
    if (sound === 'none') return
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()
    const now = ctx.currentTime

    if (sound === 'soft') {
      scheduleTone(ctx, 660, now, 0.18, 0.035)
      scheduleTone(ctx, 880, now + 0.14, 0.22, 0.03)
    } else if (sound === 'bell') {
      scheduleTone(ctx, 784, now, 0.28, 0.055)
      scheduleTone(ctx, 988, now + 0.11, 0.3, 0.045)
      scheduleTone(ctx, 1319, now + 0.22, 0.34, 0.035)
    } else if (sound === 'digital') {
      scheduleTone(ctx, 1047, now, 0.08, 0.06, 'square')
      scheduleTone(ctx, 1568, now + 0.1, 0.08, 0.05, 'square')
      scheduleTone(ctx, 1319, now + 0.2, 0.11, 0.045, 'square')
    } else {
      scheduleTone(ctx, 880, now, 0.12, 0.08)
      scheduleTone(ctx, 1175, now + 0.16, 0.16, 0.07)
    }
  }

  return {
    selectedWhatsAppSound,
    setWhatsAppNotificationSound,
    playWhatsAppMessageSound,
  }
}
