import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderMutationSnapshot } from '@/services/MainAPI/orderMutation'
import { beginOrderMutation } from '@/services/MainAPI/orderMutation'
import type { OrderManagementChange } from '../useOrderManagementUpdates'

const mocks = vi.hoisted(() => ({
    fetchDetail: vi.fn(),
    changed: null as unknown as (event: OrderManagementChange) => void,
    resume: null as unknown as () => void,
    conflict: null as unknown as (id: number) => void,
}))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { fetchDetail: mocks.fetchDetail } }))
vi.mock('../useOrderManagementUpdates', () => ({
    useOrderManagementUpdates: (changed: typeof mocks.changed, resume: typeof mocks.resume, conflict: typeof mocks.conflict) => {
        Object.assign(mocks, { changed, resume, conflict })
    },
}))
import { useOrderSnapshotUpdates } from '../useOrderSnapshotUpdates'

let wrapper: VueWrapper
let order: Ref<OrderMutationSnapshot | null>
let updates: ReturnType<typeof useOrderSnapshotUpdates>
const event = (version: number, id = 81) => mocks.changed({ orderId: id, branchId: 1, managementVersion: version })
function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>(done => { resolve = done })
    return { promise, resolve }
}

describe('displayed order snapshot updates', () => {
    beforeEach(() => {
        mocks.fetchDetail.mockReset().mockResolvedValue({ id: 81, managementVersion: 3 })
        order = ref({ id: 81, managementVersion: 3 })
        wrapper = mount(defineComponent({
            setup() {
                updates = useOrderSnapshotUpdates(order)
                return () => h('div', updates.staleSnapshot.value ? 'changed' : 'current')
            },
        }))
    })
    afterEach(() => wrapper.unmount())

    it('checks on resume without marking an unchanged order or replacing the editing snapshot', async () => {
        const snapshot = order.value
        mocks.resume()
        await flushPromises()
        expect(mocks.fetchDetail).toHaveBeenCalledExactlyOnceWith(81)
        expect(updates.staleSnapshot.value).toBe(false)
        expect(order.value).toBe(snapshot)
    })

    it('confirms a missed change on resume without overwriting a draft', async () => {
        const snapshot = order.value
        mocks.fetchDetail.mockResolvedValue({ id: 81, managementVersion: 4 })
        mocks.resume()
        await flushPromises()
        expect(updates.staleSnapshot.value).toBe(true)
        expect(order.value).toBe(snapshot)
        expect(order.value?.managementVersion).toBe(3)
    })

    it('ignores unrelated, repeated and older notifications', () => {
        event(20, 82)
        event(3)
        event(2)
        expect(updates.staleSnapshot.value).toBe(false)
        expect(mocks.fetchDetail).not.toHaveBeenCalled()
        event(4)
        event(4)
        event(2)
        expect(updates.staleSnapshot.value).toBe(true)
    })

    it('waits for an own save even when its realtime notification arrives before HTTP', async () => {
        const finish = beginOrderMutation(81)!
        try {
            event(4)
            await nextTick()
            expect(wrapper.text()).toBe('current')
            order.value!.managementVersion = 4
        } finally { finish() }
        await nextTick()
        expect(wrapper.text()).toBe('current')
    })

    it('keeps a newer external change after an own save completes', () => {
        const finish = beginOrderMutation(81)!
        try {
            event(5)
            order.value!.managementVersion = 4
        } finally { finish() }
        expect(updates.staleSnapshot.value).toBe(true)
    })

    it('clears the notice when the displayed snapshot catches up', () => {
        event(4)
        expect(updates.staleSnapshot.value).toBe(true)
        order.value = { id: 81, managementVersion: 4 }
        expect(updates.staleSnapshot.value).toBe(false)
    })

    it('only marks a real conflict for the opened order and clears it after refresh', () => {
        mocks.conflict(82)
        expect(updates.staleSnapshot.value).toBe(false)
        mocks.conflict(81)
        expect(updates.staleSnapshot.value).toBe(true)
        updates.markRefreshed()
        expect(updates.staleSnapshot.value).toBe(false)
    })

    it('deduplicates simultaneous resume and reconnect checks', async () => {
        const response = deferred<{ id: number; managementVersion: number }>()
        mocks.fetchDetail.mockReturnValue(response.promise)
        mocks.resume()
        mocks.resume()
        mocks.resume()
        expect(mocks.fetchDetail).toHaveBeenCalledTimes(1)
        response.resolve({ id: 81, managementVersion: 3 })
        await flushPromises()
        expect(updates.staleSnapshot.value).toBe(false)
    })

    it('does not convert network failures into change notices and allows retrying', async () => {
        mocks.fetchDetail.mockRejectedValueOnce(new Error('offline'))
        await updates.checkForChanges()
        expect(updates.staleSnapshot.value).toBe(false)
        await updates.checkForChanges()
        expect(mocks.fetchDetail).toHaveBeenCalledTimes(2)
    })

    it('ignores an older check when the local snapshot has already advanced', async () => {
        const response = deferred<{ id: number; managementVersion: number }>()
        mocks.fetchDetail.mockReturnValue(response.promise)
        mocks.resume()
        order.value!.managementVersion = 5
        response.resolve({ id: 81, managementVersion: 4 })
        await flushPromises()
        expect(updates.staleSnapshot.value).toBe(false)
        expect(order.value!.managementVersion).toBe(5)
    })

    it('discards an old request even when navigating away and back to the same order', async () => {
        const response = deferred<{ id: number; managementVersion: number }>()
        mocks.fetchDetail.mockReturnValue(response.promise)
        mocks.resume()
        order.value = { id: 82, managementVersion: 1 }
        order.value = { id: 81, managementVersion: 3 }
        response.resolve({ id: 81, managementVersion: 8 })
        await flushPromises()
        expect(updates.staleSnapshot.value).toBe(false)
    })

    it('does not clear a newer notification when a refresh is still behind it', () => {
        event(6)
        order.value = { id: 81, managementVersion: 5 }
        updates.markRefreshed()
        expect(updates.staleSnapshot.value).toBe(true)
    })
})
