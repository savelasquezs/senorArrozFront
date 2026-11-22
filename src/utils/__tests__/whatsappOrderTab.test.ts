import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWhatsAppOrderLauncher, listenForWhatsAppOrders } from '@/utils/whatsappOrderTab'

class TestBroadcastChannel {
    static channels = new Set<TestBroadcastChannel>()
    onmessage: ((event: { data: unknown }) => void) | null = null

    constructor(readonly name: string) { TestBroadcastChannel.channels.add(this) }
    postMessage(data: unknown) {
        for (const other of TestBroadcastChannel.channels) {
            if (other !== this && other.name === this.name) queueMicrotask(() => other.onmessage?.({ data }))
        }
    }
    close() { TestBroadcastChannel.channels.delete(this); this.onmessage = null }
}

const scope = '[7,"Cashier","personal",1]'
const otherScope = '[7,"Cashier","personal",2]'
const orderUrl = '/whatsapp?orderId=25'
const listeners: Array<() => void> = []

describe('open order in the WhatsApp tab', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
        vi.spyOn(window, 'focus').mockImplementation(() => {})
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    })
    afterEach(() => {
        for (const stop of listeners.splice(0)) stop()
        vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers()
    })

    it('sends the order only to the most recently used matching tab', async () => {
        const first = vi.fn(), recent = vi.fn(), other = vi.fn()
        listeners.push(listenForWhatsAppOrders(() => scope, first))
        await vi.advanceTimersByTimeAsync(10)
        listeners.push(listenForWhatsAppOrders(() => scope, recent))
        listeners.push(listenForWhatsAppOrders(() => otherScope, other))
        const popup = vi.spyOn(window, 'open')

        const launch = createWhatsAppOrderLauncher()(scope, 25, orderUrl, () => true)
        await vi.advanceTimersByTimeAsync(250)

        expect(await launch).toBe(true)
        expect(recent).toHaveBeenCalledExactlyOnceWith(25)
        expect(first).not.toHaveBeenCalled()
        expect(other).not.toHaveBeenCalled()
        expect(popup).not.toHaveBeenCalled()
    })

    it('offers a direct retry when opening a new tab is blocked', async () => {
        const replace = vi.fn()
        const popup = vi.spyOn(window, 'open').mockReturnValueOnce(null)
            .mockReturnValueOnce({ location: { replace } } as unknown as Window)
        const launch = createWhatsAppOrderLauncher()
        const first = launch(scope, 25, orderUrl, () => true)
        await vi.advanceTimersByTimeAsync(250)
        expect(await first).toBe(false)

        const retry = launch(scope, 25, orderUrl, () => true)
        expect(popup).toHaveBeenCalledTimes(2)
        expect(await retry).toBe(true)
        expect(replace).toHaveBeenCalledExactlyOnceWith(orderUrl)
    })
})
