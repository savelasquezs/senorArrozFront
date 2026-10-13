import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OrderTrackingDialog from '../OrderTrackingDialog.vue'
import type { OrderListItem } from '@/types/order'
const mocks = vi.hoisted(() => ({ tracking: vi.fn(), detail: vi.fn() }))
const visible = ref(true)
const online = ref(true)
vi.mock('@/services/MainAPI/orderManagementApi', () => ({ orderManagementApi: { tracking: mocks.tracking } }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { fetchDetail: mocks.detail } }))
vi.mock('@/composables/useOrderManagementUpdates', () => ({ useOrderManagementUpdates: () => ({ isPageVisible: visible, isOnline: online }) }))
const row = { id: 20, branchId: 2, branchName: 'Manrique', managementVersion: 7, status: 'on_the_way', type: 'delivery' } as OrderListItem
const snapshot = { orderId: 20, managementVersion: 7, status: 'on_the_way', deliveryManId: 80, deliveryManName: 'Remoto', deliveryRouteId: 30,
    location: { latitude: 6.2, longitude: -75.5, recordedAt: '2026-10-12T17:00:00Z', isFresh: true } }
let wrapper: VueWrapper
const mountDialog = () => wrapper = shallowMount(OrderTrackingDialog, { props: { modelValue: true, order: row }, global: { stubs: {
    BaseDialog: { template: '<section><slot /></section>' },
    BaseButton: { template: '<button><slot /></button>' },
    DeliveryMapAsync: { props: ['orders', 'deliverymanLocations'], template: '<div data-test="map" :data-drivers="Object.keys(deliverymanLocations).join()" />' },
} } })
beforeEach(() => { vi.useFakeTimers(); visible.value = true; online.value = true; mocks.tracking.mockResolvedValue(snapshot) })
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
describe('resource-scoped remote tracking', () => {
    it('queries only the selected order and labels stale GPS truthfully', async () => {
        mocks.tracking.mockResolvedValue({ ...snapshot, location: { ...snapshot.location, isFresh: false } })
        mountDialog(); await flushPromises()
        expect(mocks.tracking).toHaveBeenCalledWith(20)
        expect(wrapper.text()).toContain('no es una posición en vivo')
        expect(row.managementVersion).toBe(7)
    })
    it('polls only while open, online and visible and stops on delivery', async () => {
        mountDialog(); await flushPromises()
        visible.value = false
        await vi.advanceTimersByTimeAsync(60_000)
        expect(mocks.tracking).toHaveBeenCalledTimes(1)
        visible.value = true; online.value = false
        await vi.advanceTimersByTimeAsync(30_000)
        expect(mocks.tracking).toHaveBeenCalledTimes(1)
        online.value = true
        mocks.tracking.mockResolvedValue({ ...snapshot, status: 'delivered', location: null })
        await vi.advanceTimersByTimeAsync(30_000)
        expect(mocks.tracking).toHaveBeenCalledTimes(2)
        expect(wrapper.text()).toContain('No se muestra la ubicación')
        await vi.advanceTimersByTimeAsync(90_000)
        expect(mocks.tracking).toHaveBeenCalledTimes(2)
    })
    it('clears GPS on a failed poll rather than pretending it remains live', async () => {
        mountDialog(); await flushPromises()
        mocks.tracking.mockRejectedValue(new Error('Sin acceso'))
        await vi.advanceTimersByTimeAsync(30_000)
        expect(wrapper.get('[role="alert"]').text()).toBe('Sin acceso')
        expect(wrapper.text()).not.toContain('Ubicación reciente:')
    })
    it('ignores replies after closing and makes no further polls', async () => {
        let finish!: (data: any) => void
        mocks.tracking.mockImplementation(() => new Promise(resolve => { finish = resolve }))
        mountDialog(); await flushPromises()
        await wrapper.setProps({ modelValue: false })
        finish(snapshot); await flushPromises()
        await vi.advanceTimersByTimeAsync(60_000)
        expect(mocks.tracking).toHaveBeenCalledTimes(1)
        expect(wrapper.text()).not.toContain('Remoto')
    })
})
