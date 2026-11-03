import { flushPromises, shallowMount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderDetail from '../OrderDetail.vue'
import type { OrderDetailView } from '@/types/order'

const route = reactive({ params: { id: '1' } })
const state = reactive({ current: null as OrderDetailView | null, fetchById: vi.fn() })
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('@/store/ordersData', () => ({ useOrdersDataStore: () => state }))
function deferred() {
    let resolve!: () => void
    let reject!: (error: Error) => void
    const promise = new Promise<void>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
const stubs = {
    BaseLoading: { template: '<span>Loading</span>' },
    OrderDetailContent: { props: ['flatOrder'], template: '<article class="detail-id">#{{ flatOrder.id }}</article>' },
}

describe('M10-F03 order detail navigation cancellation', () => {
    beforeEach(() => { vi.clearAllMocks(); route.params.id = '1'; state.current = null })

    it('aborts the previous route request, ignores late data and clears only its own loading state', async () => {
        const first = deferred(), second = deferred()
        const signals: AbortSignal[] = []
        state.fetchById.mockImplementation((_id: number, _opts: unknown, signal: AbortSignal) => {
            signals.push(signal)
            return signals.length === 1 ? first.promise : second.promise
        })
        const wrapper = shallowMount(OrderDetail, { global: { stubs } })
        expect(state.fetchById).toHaveBeenCalledWith(1, undefined, expect.any(AbortSignal))
        route.params.id = '2'
        await nextTick()
        expect(signals[0]?.aborted).toBe(true)
        expect(state.fetchById).toHaveBeenLastCalledWith(2, undefined, expect.any(AbortSignal))
        state.current = { id: 2 } as OrderDetailView
        second.resolve(); await flushPromises()
        expect(wrapper.get('.detail-id').text()).toBe('#2')
        expect(wrapper.text()).not.toContain('Loading')
        state.current = { id: 1 } as OrderDetailView
        first.resolve(); await flushPromises()
        expect(wrapper.get('.detail-id').text()).toBe('#2')
        wrapper.unmount()
    })

    it('aborts a pending detail request on unmount', async () => {
        const pending = deferred()
        state.fetchById.mockReturnValue(pending.promise)
        const wrapper = shallowMount(OrderDetail, { global: { stubs } })
        const signal = state.fetchById.mock.calls[0]?.[2] as AbortSignal
        wrapper.unmount()
        expect(signal.aborted).toBe(true)
        pending.reject(new Error('obsolete')); await flushPromises()
    })

    it('validates the route and offers a retry after network failure', async () => {
        route.params.id = '7oops'
        const wrapper = shallowMount(OrderDetail, { global: { stubs } })
        await flushPromises()
        expect(state.fetchById).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('Identificador de pedido no válido')
        route.params.id = '7'
        state.fetchById.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
        await nextTick(); await flushPromises()
        expect(wrapper.text()).toContain('network')
        state.current = { id: 7 } as OrderDetailView
        await wrapper.get('button').trigger('click'); await flushPromises()
        expect(wrapper.get('.detail-id').text()).toBe('#7')
        wrapper.unmount()
    })
})
