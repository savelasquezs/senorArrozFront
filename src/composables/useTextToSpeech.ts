import { ref } from 'vue'

type SpeechRequest = { utterance: SpeechSynthesisUtterance; text: string; resolve: (played: boolean) => void }
let active: SpeechRequest | null = null
const waiting: SpeechRequest[] = []
let watchdog: number | undefined
const isSpeaking = ref(false)
const lastError = ref<string | null>(null)

function drain() {
    if (active || waiting.length === 0) return
    const item = waiting.shift()!
    active = item
    const finish = (played: boolean) => {
        if (active !== item) return
        if (watchdog !== undefined) window.clearTimeout(watchdog)
        watchdog = undefined
        active = null
        isSpeaking.value = false
        item.resolve(played)
        drain()
    }
    item.utterance.onstart = () => { if (active === item) isSpeaking.value = true }
    item.utterance.onend = () => finish(true)
    item.utterance.onerror = event => {
        if (active !== item) return
        lastError.value = event.error || 'unknown'
        console.warn('TTS error:', lastError.value)
        finish(false)
    }
    try {
        window.speechSynthesis.speak(item.utterance)
        watchdog = window.setTimeout(() => {
            if (active !== item) return
            lastError.value = 'timeout'
            const failed = active
            active = null
            isSpeaking.value = false
            watchdog = undefined
            window.speechSynthesis.cancel()
            failed?.resolve(false)
            drain()
        }, Math.max(15_000, Math.min(120_000, item.text.length * 250)))
    } catch (cause) {
        lastError.value = String(cause)
        console.warn('TTS error:', cause)
        finish(false)
    }
}

export function useTextToSpeech() {
    const isSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
    const speak = (text: string, options?: { lang?: string; rate?: number; pitch?: number }): Promise<boolean> => {
        if (!isSupported.value) {
            lastError.value = 'unsupported'
            return Promise.resolve(false)
        }
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = options?.lang || 'es-CO'
        utterance.rate = options?.rate || 0.9
        utterance.pitch = options?.pitch || 1
        lastError.value = null
        return new Promise(resolve => {
            waiting.push({ utterance, text, resolve })
            drain()
        })
    }
    const cancel = () => {
        if (watchdog !== undefined) window.clearTimeout(watchdog)
        watchdog = undefined
        const interrupted = active
        active = null
        isSpeaking.value = false
        const queued = waiting.splice(0)
        window.speechSynthesis?.cancel()
        interrupted?.resolve(false)
        queued.forEach(item => item.resolve(false))
    }
    return { isSupported, isSpeaking, lastError, speak, cancel }
}
