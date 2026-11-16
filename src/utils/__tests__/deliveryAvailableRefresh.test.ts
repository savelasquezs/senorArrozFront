import { describe, expect, it, vi } from 'vitest'
import { refreshAvailableOrdersIfVisible, type DeliveryTab } from '../deliveryAvailableRefresh'

describe('M15-F01 dispatch ready-order SignalR reads', () => {
    it.each<DeliveryTab>(['preparation', 'analytics', 'routing', 'route'])(
        'does not fetch the ready list while the %s tab is visible',
        async tab => {
            const refresh = vi.fn().mockResolvedValue(undefined)
            await refreshAvailableOrdersIfVisible(tab, refresh)
            expect(refresh).not.toHaveBeenCalled()
        },
    )

    it('refreshes when available is the active tab', async () => {
        const refresh = vi.fn().mockResolvedValue(undefined)
        await refreshAvailableOrdersIfVisible('available', refresh)
        expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('awaits the active refresh without triggering a second request', async () => {
        let resolve!: () => void
        const pending = new Promise<void>(done => { resolve = done })
        const refresh = vi.fn().mockReturnValue(pending)
        let settled = false
        const completion = refreshAvailableOrdersIfVisible('available', refresh)
            .then(() => { settled = true })
        await Promise.resolve()
        expect(settled).toBe(false)
        resolve()
        await completion
        expect(settled).toBe(true)
        expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('propagates errors on the visible tab to the existing SignalR handler', async () => {
        const issue = new Error('temporary API failure')
        const refresh = vi.fn().mockRejectedValue(issue)
        await expect(refreshAvailableOrdersIfVisible('available', refresh)).rejects.toBe(issue)
        expect(refresh).toHaveBeenCalledTimes(1)
    })
})
