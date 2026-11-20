import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStatusChange } from '../useOrderStatusChange'
import type { Order, OrderListItem } from '@/types/order'

const mocks = vi.hoisted(() => ({
    updateStatus: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    canChangeStatus: vi.fn(() => true),
}))

vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { updateStatus: mocks.updateStatus } }))
vi.mock('@/composables/useOrderPermissions', () => ({
    useOrderPermissions: () => ({ canChangeStatus: mocks.canChangeStatus }),
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: mocks.success, error: mocks.error }),
}))

const order = (id: number): OrderListItem => ({
    id, type: 'onsite', status: 'taken', deliveryManId: null,
}) as OrderListItem
const updated = (id: number): Order => ({ id, status: 'in_preparation' }) as Order

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(r => { resolve = r })
    return { promise, resolve }
}

describe('M10-F05: status changes must be single-flight per order', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('sends only one PUT for repeated progress clicks while a change is pending', async () => {
        const response = deferred<Order>()
        mocks.updateStatus.mockReturnValueOnce(response.promise)
        const change = useOrderStatusChange()
        const onSuccess = vi.fn()
        const snapshot = order(19)

        const first = change.handleStatusChange(snapshot, 'in_preparation', onSuccess)
        const second = change.handleStatusChange(snapshot, 'in_preparation', onSuccess)

        expect(mocks.updateStatus).toHaveBeenCalledExactlyOnceWith(19, 'in_preparation', undefined, snapshot)
        response.resolve(updated(19))
        await Promise.all([first, second])
        expect(onSuccess).toHaveBeenCalledTimes(1)
        expect(mocks.success).toHaveBeenCalledTimes(1)
    })

    it('also guards direct calls from the delivery assignment callback', async () => {
        const response = deferred<Order>()
        mocks.updateStatus.mockReturnValueOnce(response.promise)
        const change = useOrderStatusChange()
        const first = change.executeStatusChange(19, 'on_the_way')
        const second = change.executeStatusChange(19, 'on_the_way')
        expect(mocks.updateStatus).toHaveBeenCalledTimes(1)
        response.resolve({ id: 19, status: 'on_the_way' } as Order)
        await Promise.all([first, second])
    })

    it('does not serialize unrelated order IDs', async () => {
        const response1 = deferred<Order>()
        const response2 = deferred<Order>()
        mocks.updateStatus.mockReturnValueOnce(response1.promise).mockReturnValueOnce(response2.promise)
        const change = useOrderStatusChange()
        const first = change.executeStatusChange(19, 'ready')
        const second = change.executeStatusChange(20, 'ready')
        expect(mocks.updateStatus).toHaveBeenCalledTimes(2)
        response1.resolve(updated(19))
        response2.resolve(updated(20))
        await Promise.all([first, second])
    })

    it('releases the order after network failure so a manual retry can proceed', async () => {
        mocks.updateStatus.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(updated(19))
        const change = useOrderStatusChange()
        await change.executeStatusChange(19, 'ready')
        await change.executeStatusChange(19, 'ready')
        expect(mocks.updateStatus).toHaveBeenCalledTimes(2)
        expect(mocks.error).toHaveBeenCalledTimes(1)
        expect(mocks.success).toHaveBeenCalledTimes(1)
    })
})
