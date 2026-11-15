import { describe, expect, it, vi } from 'vitest'
import { createWhatsAppRoutingRefresh } from '../whatsappRoutingRefresh'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

describe('WhatsApp routing SignalR refresh', () => {
  it('coalesces several routing events in one tick into one inbox reload', async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    const refresh = createWhatsAppRoutingRefresh(reload)
    const first = refresh.invalidate()
    refresh.invalidate(); refresh.invalidate()
    await first
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('queues exactly one trailing reload for events arriving during an HTTP read', async () => {
    const gate = deferred()
    let running = 0, maximumConcurrent = 0
    const reload = vi.fn(async () => {
      running++; maximumConcurrent = Math.max(maximumConcurrent, running)
      if (reload.mock.calls.length === 1) await gate.promise
      running--
    })
    const refresh = createWhatsAppRoutingRefresh(reload)
    const first = refresh.invalidate(); await Promise.resolve()
    refresh.invalidate(); refresh.invalidate()
    expect(reload).toHaveBeenCalledTimes(1)
    gate.resolve(); await first
    expect(reload).toHaveBeenCalledTimes(2); expect(maximumConcurrent).toBe(1)
  })

  it('propagates request failures, permits another invalidation, and stops after unmount', async () => {
    const error = new Error('temporary network issue')
    const reload = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined)
    const refresh = createWhatsAppRoutingRefresh(reload)
    await expect(refresh.invalidate()).rejects.toThrow(error)
    await refresh.invalidate(); expect(reload).toHaveBeenCalledTimes(2)
    refresh.dispose(); await refresh.invalidate()
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('forwards freshness and abort context and drops a queued read on disposal', async () => {
    const gate = deferred()
    const reload = vi.fn(async (_context: { signal: AbortSignal; isCurrent: () => boolean }) => gate.promise)
    const refresh = createWhatsAppRoutingRefresh(reload)
    const first = refresh.invalidate(); await Promise.resolve()
    const context = reload.mock.calls[0]![0]
    expect(context.isCurrent()).toBe(true)
    refresh.invalidate(); expect(context.isCurrent()).toBe(false)
    refresh.dispose(); expect(context.signal.aborted).toBe(true)
    gate.resolve(); await first
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('a different filter starts immediately without waiting for obsolete HTTP', async () => {
    const gate = deferred()
    const reload = vi.fn(async (_context: { signal: AbortSignal; isCurrent: () => boolean }) => {
      if (reload.mock.calls.length === 1) await gate.promise
    })
    const refresh = createWhatsAppRoutingRefresh(reload)
    const first = refresh.invalidate('A'); await Promise.resolve()
    const next = refresh.invalidate('B'); await next
    expect(reload).toHaveBeenCalledTimes(2)
    expect(reload.mock.calls[0]![0].signal.aborted).toBe(true)
    gate.resolve(); await first
    expect(reload.mock.calls[1]![0].isCurrent()).toBe(true)
  })

  it('cancel before debounce permits a fresh request with the same key', async () => {
    const gate = deferred()
    const reload = vi.fn(async () => { if (reload.mock.calls.length === 1) await gate.promise })
    const refresh = createWhatsAppRoutingRefresh(reload)
    const first = refresh.invalidate('A'); await Promise.resolve()
    refresh.cancel(); await refresh.invalidate('A')
    expect(reload).toHaveBeenCalledTimes(2)
    gate.resolve(); await first
  })
})
