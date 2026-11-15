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
    const reportError = vi.fn()
    const refresh = createWhatsAppRoutingRefresh(reload, reportError)

    const first = refresh.invalidate()
    refresh.invalidate()
    refresh.invalidate()
    await first

    expect(reload).toHaveBeenCalledTimes(1)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('queues exactly one trailing reload for events arriving during an HTTP read', async () => {
    const gate = deferred()
    let running = 0
    let maximumConcurrent = 0
    const reload = vi.fn(async () => {
      running += 1
      maximumConcurrent = Math.max(maximumConcurrent, running)
      if (reload.mock.calls.length === 1) await gate.promise
      running -= 1
    })
    const refresh = createWhatsAppRoutingRefresh(reload, vi.fn())

    const first = refresh.invalidate()
    await Promise.resolve()
    refresh.invalidate()
    refresh.invalidate()
    expect(reload).toHaveBeenCalledTimes(1)

    gate.resolve()
    await first
    expect(reload).toHaveBeenCalledTimes(2)
    expect(maximumConcurrent).toBe(1)
  })

  it('reports request failures, permits another invalidation, and stops after unmount', async () => {
    const reportError = vi.fn()
    const error = new Error('temporary network issue')
    const reload = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined)
    const refresh = createWhatsAppRoutingRefresh(reload, reportError)

    await refresh.invalidate()
    expect(reportError).toHaveBeenCalledWith(error)
    await refresh.invalidate()
    expect(reload).toHaveBeenCalledTimes(2)

    refresh.dispose()
    await refresh.invalidate()
    expect(reload).toHaveBeenCalledTimes(2)
  })
})
