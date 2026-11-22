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
const originalName = window.name

describe('open order in the WhatsApp tab', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
        vi.spyOn(window, 'focus').mockImplementation(() => {})
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
        vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    })
    afterEach(() => {
        for (const stop of listeners.splice(0)) stop()
        window.name = originalName
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

        expect(await launch).toBe('reused')
        expect(recent).toHaveBeenCalledExactlyOnceWith(25)
        expect(first).not.toHaveBeenCalled()
        expect(other).not.toHaveBeenCalled()
        expect(popup).not.toHaveBeenCalled()
    })

    it('leaves Orders open and delivers once in the background when focus is blocked', async () => {
        const receiveOrder = vi.fn()
        vi.mocked(document.hasFocus).mockReturnValue(false)
        vi.mocked(window.focus).mockImplementation(() => { throw new DOMException('Focus denied', 'InvalidAccessError') })
        listeners.push(listenForWhatsAppOrders(() => scope, receiveOrder))
        const popup = vi.spyOn(window, 'open')
        const post = vi.spyOn(window, 'postMessage')

        const launch = createWhatsAppOrderLauncher()(scope, 25, orderUrl, () => true)
        await vi.advanceTimersByTimeAsync(1100)

        expect(await launch).toBe('background')
        expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'senor-arroz:focus-whatsapp-tab' }, window.location.origin)
        vi.mocked(document.hasFocus).mockReturnValue(true)
        window.dispatchEvent(new Event('focus'))
        expect(receiveOrder).toHaveBeenCalledExactlyOnceWith(25)
        expect(popup).not.toHaveBeenCalled()
    })

    it('waits for the other tab to come to the foreground before opening the chat', async () => {
        const receiveOrder = vi.fn()
        vi.mocked(document.hasFocus).mockReturnValue(false)
        listeners.push(listenForWhatsAppOrders(() => scope, receiveOrder))

        const launch = createWhatsAppOrderLauncher()(scope, 25, orderUrl, () => true)
        await vi.advanceTimersByTimeAsync(250)
        expect(receiveOrder).not.toHaveBeenCalled()
        vi.mocked(document.hasFocus).mockReturnValue(true)
        window.dispatchEvent(new Event('focus'))
        await vi.advanceTimersByTimeAsync(0)

        expect(await launch).toBe('reused')
        expect(receiveOrder).toHaveBeenCalledExactlyOnceWith(25)
    })

    it('asks the browser to focus the window previously opened from Orders', async () => {
        const replace = vi.fn()
        const tab = { name: '', closed: false, focus: vi.fn(() => vi.mocked(document.hasFocus).mockReturnValue(true)), location: { replace } }
        const popup = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
        const launch = createWhatsAppOrderLauncher()
        const first = launch(scope, 25, orderUrl, () => true)
        await vi.advanceTimersByTimeAsync(250)
        expect(await first).toBe('opened')
        expect(replace).toHaveBeenCalledExactlyOnceWith(orderUrl)

        window.name = tab.name
        vi.mocked(document.hasFocus).mockReturnValue(false)
        const receiveOrder = vi.fn()
        listeners.push(listenForWhatsAppOrders(() => scope, receiveOrder))
        const second = launch(scope, 26, '/whatsapp?orderId=26', () => true)
        await vi.advanceTimersByTimeAsync(250)
        expect(await second).toBe('reused')
        expect(tab.focus).toHaveBeenCalledTimes(1)
        expect(receiveOrder).toHaveBeenCalledExactlyOnceWith(26)
        expect(popup).toHaveBeenCalledTimes(1)
    })

    it('leaves Orders open if the browser blocks a new tab', async () => {
        const popup = vi.spyOn(window, 'open').mockReturnValue(null)
        const launch = createWhatsAppOrderLauncher()(scope, 25, orderUrl, () => true)
        await vi.advanceTimersByTimeAsync(250)

        expect(await launch).toBe('blocked')
        expect(popup).toHaveBeenCalledTimes(1)
    })

    it('delivers the order to an existing WhatsApp tab that only supports background delivery', async () => {
        const olderTab = new TestBroadcastChannel('senor-arroz:whatsapp-order')
        listeners.push(() => olderTab.close())
        const receivedOrders = vi.fn()
        olderTab.onmessage = ({ data }) => {
            const message = data as { type: string; scope: string; requestId: string; orderId?: number }
            if (message.type === 'discover') {
                olderTab.postMessage({ ...message, type: 'offer', tabId: 'older-tab', lastFocused: Date.now() })
            } else if (message.type === 'open') {
                receivedOrders(message.orderId)
                olderTab.postMessage({ ...message, type: 'accepted', tabId: 'older-tab' })
            }
        }
        const popup = vi.spyOn(window, 'open')

        const launch = createWhatsAppOrderLauncher()(scope, 25, orderUrl, () => true)
        await vi.advanceTimersByTimeAsync(250)

        expect(await launch).toBe('background')
        expect(receivedOrders).toHaveBeenCalledExactlyOnceWith(25)
        expect(popup).not.toHaveBeenCalled()
    })
})
