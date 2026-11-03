import { beforeEach, describe, expect, it, vi } from 'vitest'

const transport = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../baseApi', () => ({
    BaseApi: class { get = transport.get },
}))
import { orderManagementApi } from '../orderManagementApi'

describe('M15-F02 options transport cancellation', () => {
    beforeEach(() => { transport.get.mockReset() })

    it('passes AbortSignal to the authorized order-scoped options endpoint', async () => {
        const controller = new AbortController()
        transport.get.mockResolvedValue({ deliverymen: [] })
        await orderManagementApi.options(45, controller.signal)
        expect(transport.get).toHaveBeenCalledExactlyOnceWith(
            '/orders/45/operation-options', { signal: controller.signal },
        )
    })

    it('keeps options callable without a signal for existing consumers', async () => {
        transport.get.mockResolvedValue({ deliverymen: [] })
        await orderManagementApi.options(45)
        expect(transport.get).toHaveBeenCalledExactlyOnceWith(
            '/orders/45/operation-options', { signal: undefined },
        )
    })
})
