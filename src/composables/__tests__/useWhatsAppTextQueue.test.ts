import { effectScope, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useWhatsAppTextQueue } from '../useWhatsAppTextQueue'
import type { WhatsAppMessage } from '@/types/whatsapp'

const api = vi.hoisted(() => ({ startQueuedText: vi.fn(), getQueuedText: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))

const accepted = (operationId: number) => ({ data: { operationId, pending: true } })
let scope: EffectScope
const owner = ref('tenant-1:cashier-7')

function mount(messages = ref<WhatsAppMessage[]>([])) {
  scope = effectScope()
  const confirmed = vi.fn()
  const queue = scope.run(() => useWhatsAppTextQueue(owner, () => messages.value, confirmed))!
  return { ...queue, messages, confirmed }
}

beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  scope.stop()
  vi.useRealTimers()
})

describe('WhatsApp text queue', () => {
  it('accepts identical texts locally and serializes admission until each request has an operation id', async () => {
    let accept!: (value: ReturnType<typeof accepted>) => void
    api.startQueuedText.mockReturnValueOnce(new Promise(resolve => { accept = resolve })).mockResolvedValueOnce(accepted(22))
    const queue = mount()
    queue.enqueue({ conversationId: 11, text: 'Hola' })
    queue.enqueue({ conversationId: 11, text: 'Hola' })
    expect(queue.entries.value.map(item => item.state)).toEqual(['submitting', 'queued'])
    expect(api.startQueuedText).toHaveBeenCalledTimes(1)
    accept(accepted(21))
    await flushPromises()
    expect(queue.entries.value.map(item => item.operationId)).toEqual([21, 22])
    expect(new Set(queue.entries.value.map(item => item.requestId)).size).toBe(2)
  })

  it('looks up a lost acknowledgement and recovers a pending message after reload', async () => {
    api.startQueuedText.mockRejectedValueOnce(new Error('Sin conexión'))
    api.getQueuedText.mockResolvedValueOnce(accepted(21))
    const queue = mount()
    queue.enqueue({ conversationId: 11, text: 'Hola' })
    await flushPromises()
    const id = queue.entries.value[0]!.requestId
    expect(api.getQueuedText).toHaveBeenCalledWith(id, undefined)
    expect(queue.entries.value[0]!.operationId).toBe(21)
    scope.stop()
    const afterReload = mount()
    const message = { id: 1, conversationId: 11, whatsAppMessageId: 'wamid.local', clientRequestId: id } as WhatsAppMessage
    api.getQueuedText.mockResolvedValueOnce({ data: message })
    await vi.advanceTimersByTimeAsync(800)
    expect(afterReload.entries.value).toEqual([])
    expect(afterReload.confirmed).toHaveBeenCalledExactlyOnceWith(message)
    expect(api.startQueuedText).toHaveBeenCalledTimes(1)
  })

  it('continues draining when a realtime confirmation arrives before the submission response', async () => {
    let accept!: (value: ReturnType<typeof accepted>) => void
    api.startQueuedText.mockReturnValueOnce(new Promise(resolve => { accept = resolve })).mockResolvedValueOnce(accepted(22))
    const queue = mount()
    queue.enqueue({ conversationId: 11, text: 'Primero' })
    queue.enqueue({ conversationId: 11, text: 'Segundo' })
    queue.messages.value = [{ clientRequestId: queue.entries.value[0]!.requestId } as WhatsAppMessage]
    await flushPromises()
    accept(accepted(21))
    await flushPromises()
    expect(queue.entries.value.map(item => item.operationId)).toEqual([22])
  })
})
