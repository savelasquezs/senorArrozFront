import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrdersDataStore } from '../ordersData'
import type { OrderDetailView } from '@/types/order'
const api = vi.hoisted(() => ({ fetchDetail: vi.fn() }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: api }))
function deferred<T>() {
    let resolve!: (result: T) => void
    const promise = new Promise<T>(ok => { resolve = ok })
    return { promise, resolve }
}
describe('M10-F03 store cancellation', () => {
    beforeEach(() => { setActivePinia(createPinia()); api.fetchDetail.mockReset() })
    it('does not store a canceled response even if the transport resolves', async () => {
        const pending = deferred<OrderDetailView>()
        const controller = new AbortController()
        api.fetchDetail.mockReturnValue(pending.promise)
        const store = useOrdersDataStore()
        const read = store.fetchById(3, undefined, controller.signal)
        controller.abort()
        pending.resolve({ id: 3 } as OrderDetailView)
        await read
        expect(api.fetchDetail).toHaveBeenCalledWith(3, controller.signal)
        expect(store.current).toBeNull()
    })
})
