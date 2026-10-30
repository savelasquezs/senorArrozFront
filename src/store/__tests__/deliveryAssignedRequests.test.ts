import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '../delivery'
import type { OrderListItem } from '@/types/order'

const requests = vi.hoisted(() => ({ fetchAssignedOrders: vi.fn() }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { fetchAssignedOrders: requests.fetchAssignedOrders } }))

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: Error) => void
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
function result(...ids: number[]) {
    return { items: ids.map(id => ({ id, status: 'on_the_way', deliveryManId: 7 } as OrderListItem)),
        totalCount: ids.length, page: 1, pageSize: 200, totalPages: 1 }
}
function setUser(id: number, branchId = 1, role = 'Deliveryman') {
    useAuthStore().user = { id, branchId, role } as never
}

describe('M15-F03: assigned route board read lifecycle', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        requests.fetchAssignedOrders.mockReset()
        setUser(7)
    })

    it('ignores an old request that finishes after a newer refresh and aborts its signal', async () => {
        const old = deferred<ReturnType<typeof result>>()
        const fresh = deferred<ReturnType<typeof result>>()
        requests.fetchAssignedOrders.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
        const store = useDeliveryStore()
        const earlier = store.loadRouteAssignedOrders(7)
        const oldSignal = requests.fetchAssignedOrders.mock.calls[0]![2] as AbortSignal
        const later = store.loadRouteAssignedOrders(7)
        expect(oldSignal.aborted).toBe(true)
        fresh.resolve(result(17, 14)); await later
        expect(store.routeAssignedOrders.map(row => row.id)).toEqual([17, 14])
        old.resolve(result(2)); await earlier
        expect(store.routeAssignedOrders.map(row => row.id)).toEqual([17, 14])
        expect(store.isLoading).toBe(false)
    })

    it('clearing the store aborts the request and cannot repopulate route rows', async () => {
        const pending = deferred<ReturnType<typeof result>>()
        requests.fetchAssignedOrders.mockReturnValue(pending.promise)
        const store = useDeliveryStore()
        const read = store.loadRouteAssignedOrders(7)
        const signal = requests.fetchAssignedOrders.mock.calls[0]![2] as AbortSignal
        store.clear()
        expect(signal.aborted).toBe(true)
        pending.resolve(result(19)); await read
        expect(store.routeAssignedOrders).toEqual([])
        expect(store.ordersOnTheWay).toEqual([])
        expect(store.error).toBeNull()
    })

    it('switching the authenticated identity or branch invalidates the current assigned board', async () => {
        const pending = deferred<ReturnType<typeof result>>()
        requests.fetchAssignedOrders.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(result(21))
        const store = useDeliveryStore()
        const old = store.loadRouteAssignedOrders(7)
        const signal = requests.fetchAssignedOrders.mock.calls[0]![2] as AbortSignal
        setUser(8, 2)
        expect(signal.aborted).toBe(true)
        expect(store.routeAssignedOrders).toEqual([])
        expect(store.isLoading).toBe(false)
        pending.resolve(result(9)); await old
        expect(store.routeAssignedOrders).toEqual([])
        await store.loadRouteAssignedOrders(8)
        expect(store.routeAssignedOrders.map(row => row.id)).toEqual([21])
        setUser(8, 3)
        expect(store.routeAssignedOrders).toEqual([])
    })

    it('does not retain the previous driver rows while loading another driver', async () => {
        const pending = deferred<ReturnType<typeof result>>()
        requests.fetchAssignedOrders.mockResolvedValueOnce(result(10)).mockReturnValueOnce(pending.promise)
        setUser(25, 1, 'Admin')
        const store = useDeliveryStore()
        await store.loadRouteAssignedOrders(7)
        expect(store.routeAssignedOrders.map(row => row.id)).toEqual([10])
        const read = store.loadRouteAssignedOrders(8)
        expect(store.routeAssignedOrders).toEqual([])
        pending.resolve(result(11)); await read
        expect(store.routeAssignedOrders.map(row => row.id)).toEqual([11])
    })

    it('ignores aborted errors without overwriting the active loader or showing stale errors', async () => {
        const old = deferred<ReturnType<typeof result>>()
        const current = deferred<ReturnType<typeof result>>()
        requests.fetchAssignedOrders.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
        const store = useDeliveryStore()
        const earlier = store.loadRouteAssignedOrders(7)
        const newer = store.loadRouteAssignedOrders(7)
        old.reject(new Error('cancelled')); await earlier
        expect(store.isLoading).toBe(true)
        expect(store.error).toBeNull()
        current.resolve(result(15)); await newer
        expect(store.routeAssignedOrders.map(row => row.id)).toEqual([15])
        expect(store.isLoading).toBe(false)
    })

    it('surfaces an error from the active request without replacing existing route rows', async () => {
        requests.fetchAssignedOrders.mockResolvedValueOnce(result(10)).mockRejectedValueOnce(new Error('server unavailable'))
        const store = useDeliveryStore()
        await store.loadRouteAssignedOrders(7)
        await expect(store.loadRouteAssignedOrders(7)).rejects.toThrow('server unavailable')
        expect(store.routeAssignedOrders.map(row => row.id)).toEqual([10])
        expect(store.error).toBe('server unavailable')
        expect(store.isLoading).toBe(false)
    })
})
