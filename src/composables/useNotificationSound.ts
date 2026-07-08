let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextCtor) return null
  audioContext ??= new AudioContextCtor()
  return audioContext
}

async function playTone(frequency: number, startAt: number, duration: number, gainValue: number) {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') await ctx.resume()

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.03)
}

export function useNotificationSound() {
  async function playWhatsAppMessageSound() {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    await playTone(880, now, 0.12, 0.08)
    await playTone(1175, now + 0.16, 0.16, 0.07)
  }

  return { playWhatsAppMessageSound }
}
