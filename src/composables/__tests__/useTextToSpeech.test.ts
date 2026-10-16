import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTextToSpeech } from '@/composables/useTextToSpeech'

type FakeUtterance = {
    text: string
    onstart?: () => void
    onend?: () => void
    onerror?: (e: { error: string }) => void
}
let utterances: FakeUtterance[]
const stop = vi.fn()

beforeEach(() => {
    vi.useFakeTimers()
    utterances = []
    stop.mockClear()
    vi.stubGlobal('speechSynthesis', {
        speak: vi.fn((utterance: FakeUtterance) => { utterances.push(utterance) }),
        cancel: stop,
    })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
        text: string
        constructor(text: string) { this.text = text }
    })
})
afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('useTextToSpeech', () => {
    it('queues simultaneous orders without interrupting the first', async () => {
        const { speak } = useTextToSpeech()
        const first = speak('Pedido uno')
        const second = speak('Pedido dos')
        expect(utterances.map(x => x.text)).toEqual(['Pedido uno'])
        expect(stop).not.toHaveBeenCalled()
        utterances[0]!.onend?.()
        expect(await first).toBe(true)
        expect(utterances.map(x => x.text)).toEqual(['Pedido uno', 'Pedido dos'])
        utterances[1]!.onend?.()
        expect(await second).toBe(true)
    })

    it('does not acknowledge a rejected utterance', async () => {
        const { speak, lastError } = useTextToSpeech()
        const voice = speak('Pedido fallido')
        utterances[0]!.onerror?.({ error: 'not-allowed' })
        expect(await voice).toBe(false)
        expect(lastError.value).toBe('not-allowed')
    })

    it('does not count cancelled active or queued audio as played', async () => {
        const { speak, cancel } = useTextToSpeech()
        const first = speak('Pedido uno')
        const second = speak('Pedido dos')
        cancel()
        expect(await first).toBe(false)
        expect(await second).toBe(false)
        expect(stop).toHaveBeenCalledOnce()
    })
})
