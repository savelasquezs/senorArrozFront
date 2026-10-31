import { beforeEach, describe, expect, it, vi } from 'vitest'
const calls = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../baseApi', () => ({ BaseApi: class { get = calls.get } }))
import { orderManagementApi } from '../orderManagementApi'
import { orderApi } from '../orderApi'

describe('M15-F04 tracking transport', () => {
    beforeEach(() => { calls.get.mockReset().mockResolvedValue({}) })
    it('passes AbortSignal to order-scoped tracking', async () => {
        const signal = new AbortController().signal
        await orderManagementApi.tracking(20, signal)
        expect(calls.get).toHaveBeenCalledExactlyOnceWith('/orders/20/tracking', { signal })
    })
    it('preserves tracking calls without a signal', async () => {
        await orderManagementApi.tracking(20)
        expect(calls.get).toHaveBeenCalledExactlyOnceWith('/orders/20/tracking', { signal: undefined })
    })
    it('passes cancellation to full detail only when supplied', async () => {
        const signal = new AbortController().signal
        await orderApi.fetchDetail(20, signal)
        expect(calls.get).toHaveBeenCalledExactlyOnceWith('/orders/20/details', { signal })
        calls.get.mockClear()
        await orderApi.fetchDetail(20)
        expect(calls.get).toHaveBeenCalledExactlyOnceWith('/orders/20/details', undefined)
    })
})
