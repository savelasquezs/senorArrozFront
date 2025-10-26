import { ref } from 'vue'

export function useTextToSpeech() {
    const isSupported = ref('speechSynthesis' in window)
    const isSpeaking = ref(false)

    const speak = (text: string, options?: { lang?: string; rate?: number; pitch?: number }) => {
        if (!isSupported.value) {
            console.warn('TTS no soportado')
            return
        }

        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = options?.lang || 'es-ES'
        utterance.rate = options?.rate || 0.9
        utterance.pitch = options?.pitch || 1

        utterance.onstart = () => { isSpeaking.value = true }
        utterance.onend = () => { isSpeaking.value = false }
        utterance.onerror = (event) => {
            console.error('Error TTS:', event)
            isSpeaking.value = false
        }

        window.speechSynthesis.speak(utterance)
    }

    const cancel = () => {
        if (isSupported.value) {
            window.speechSynthesis.cancel()
            isSpeaking.value = false
        }
    }

    return { isSupported, isSpeaking, speak, cancel }
}

