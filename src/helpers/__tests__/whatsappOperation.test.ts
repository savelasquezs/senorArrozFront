import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveWhatsAppOperation } from '../whatsappOperation'

const pending = { isSuccess: true, errors: [], message: 'Aceptado', data: { operationId: 81, pending: true as const } }
const sent = { isSuccess: true, errors: [], message: 'Enviado', data: { id: 10 } }

describe('WhatsApp operations', () => {
  afterEach(() => vi.useRealTimers())

  it('preserves the embedded response without polling', async () => {
    const poll = vi.fn()
    expect(await resolveWhatsAppOperation(async () => sent, poll)).toEqual(sent)
    expect(poll).not.toHaveBeenCalled()
  })

  it('polls the accepted operation and sends the command once', async () => {
    vi.useFakeTimers()
    const start = vi.fn().mockResolvedValue(pending)
    const poll = vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(sent)
    const result = resolveWhatsAppOperation(start, poll)
    await vi.runAllTimersAsync()
    expect(await result).toEqual(sent)
    expect(start).toHaveBeenCalledTimes(1)
    expect(poll.mock.calls).toEqual([[81], [81]])
  })

  it('does not resubmit a send after a review or a polling error', async () => {
    vi.useFakeTimers()
    const start = vi.fn().mockResolvedValue(pending)
    const poll = vi.fn().mockRejectedValue(new Error('Resultado incierto'))
    const result = resolveWhatsAppOperation(start, poll)
    const rejected = expect(result).rejects.toThrow('Resultado incierto')
    await vi.runAllTimersAsync()
    await rejected
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('leaves a pending operation intact when the waiting budget expires', async () => {
    vi.useFakeTimers()
    const start = vi.fn().mockResolvedValue(pending)
    const result = resolveWhatsAppOperation(start, vi.fn().mockResolvedValue(pending), 1000)
    const rejected = expect(result).rejects.toThrow('envío 81 sigue pendiente')
    await vi.runAllTimersAsync()
    await rejected
    expect(start).toHaveBeenCalledTimes(1)
  })
})
