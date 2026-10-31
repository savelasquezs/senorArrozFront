import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OrderTrackingDialog from '../OrderTrackingDialog.vue'
import type { OrderListItem } from '@/types/order'
const mocks = vi.hoisted(() => ({ tracking: vi.fn(), detail: vi.fn() }))
const scope = vi.hoisted(() => ({ auth: null as any, branch: null as any }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => scope.auth }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => scope.branch }))
const visible = ref(true)
const online = ref(true)
let managementEvent: ((e: { orderId: number; managementVersion: number }) => void) | undefined
vi.mock('@/services/MainAPI/orderManagementApi', () => ({ orderManagementApi: { tracking: mocks.tracking } }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { fetchDetail: mocks.detail } }))
vi.mock('@/composables/useOrderManagementUpdates', () => ({
    useOrderManagementUpdates: (changed: typeof managementEvent) => {
        managementEvent = changed
        return { isPageVisible: visible, isOnline: online }
    },
}))
const row = { id: 20, branchId: 2, branchName: 'Manrique', managementVersion: 7, status: 'on_the_way', type: 'delivery' } as OrderListItem
const snapshot = { orderId: 20, managementVersion: 7, status: 'on_the_way', deliveryManId: 80, deliveryManName: 'Remoto', deliveryRouteId: 30,
    location: { latitude: 6.2, longitude: -75.5, recordedAt: '2026-10-12T17:00:00Z', isFresh: true } }
let wrapper: VueWrapper
const mountDialog = () => wrapper = shallowMount(OrderTrackingDialog, { props: { modelValue: true, order: row }, global: { stubs: {
    BaseDialog: { template: '<section><slot /></section>' },
    BaseButton: { template: '<button><slot /></button>' },
    DeliveryMapAsync: { props: ['orders', 'deliverymanLocations'], template: '<div data-test="map" :data-drivers="Object.keys(deliverymanLocations).join()" />' },
} } })
beforeEach(() => {
    scope.auth = reactive({ user: { id: 7, branchId: 2, role: 'Admin' } as { id: number; branchId: number; role: string } | null,
        isAuthenticated: true, isSuperadmin: false })
    scope.branch = reactive({ selectedBranchId: 2 })
    vi.useFakeTimers()
    visible.value = true
    online.value = true
    mocks.tracking.mockReset().mockResolvedValue(snapshot)
    mocks.detail.mockReset()
    managementEvent = undefined
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })
describe('resource-scoped remote tracking', () => {
    it('queries only the selected order and labels stale GPS truthfully', async () => {
        mocks.tracking.mockResolvedValue({ ...snapshot, location: { ...snapshot.location, isFresh: false } })
        mountDialog(); await flushPromises()
        expect(mocks.tracking).toHaveBeenCalledWith(20, expect.any(AbortSignal))
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
        expect((mocks.tracking.mock.calls[0]![1] as AbortSignal).aborted).toBe(true)
        expect(wrapper.text()).not.toContain('Remoto')
    })
    it('aborts an old request after close/reopen of the same order and ignores its reply', async () => {
        let finish!: (value: typeof snapshot) => void
        mocks.tracking.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
            .mockResolvedValueOnce({ ...snapshot, deliveryManName: 'Actualizado' })
        mountDialog(); await flushPromises()
        const old = mocks.tracking.mock.calls[0]![1] as AbortSignal
        await wrapper.setProps({ modelValue: false })
        expect(old.aborted).toBe(true)
        await wrapper.setProps({ modelValue: true })
        await flushPromises()
        finish({ ...snapshot, deliveryManName: 'Antiguo' })
        await flushPromises()
        expect(mocks.tracking).toHaveBeenCalledTimes(2)
        expect(wrapper.text()).toContain('Actualizado')
        expect(wrapper.text()).not.toContain('Antiguo')
    })
    it('aborts a full detail GET when closing during hydration', async () => {
        let finish!: (value: OrderListItem) => void
        mocks.tracking.mockResolvedValue({ ...snapshot, managementVersion: 8 })
        mocks.detail.mockImplementation(() => new Promise(resolve => { finish = resolve }))
        mountDialog(); await flushPromises()
        expect(mocks.detail).toHaveBeenCalledTimes(1)
        const signal = mocks.detail.mock.calls[0]![1] as AbortSignal
        await wrapper.setProps({ modelValue: false })
        expect(signal.aborted).toBe(true)
        finish({ ...row, status: 'delivered' }); await flushPromises()
        expect(wrapper.text()).not.toContain('Ubicación reciente')
    })
    it('clears the previous GPS and polling immediately on logout', async () => {
        mountDialog(); await flushPromises()
        expect(wrapper.text()).toContain('Ubicación reciente')
        const auth = scope.auth; auth.user = null; auth.isAuthenticated = false
        await flushPromises()
        expect(wrapper.text()).not.toContain('Ubicación reciente')
        await vi.advanceTimersByTimeAsync(90_000)
        expect(mocks.tracking).toHaveBeenCalledTimes(1)
    })
    it('cancels the old tracking GET after a Superadmin changes selected branch', async () => {
        scope.auth.user = { id: 7, branchId: 2, role: 'Superadmin' }
        scope.auth.isSuperadmin = true
        let finish!: (value: typeof snapshot) => void
        mocks.tracking.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
            .mockResolvedValueOnce({ ...snapshot, deliveryManName: 'Otra sucursal' })
        mountDialog(); await flushPromises()
        const signal = mocks.tracking.mock.calls[0]![1] as AbortSignal
        scope.branch.selectedBranchId = 3
        await flushPromises()
        expect(signal.aborted).toBe(true)
        finish({ ...snapshot, deliveryManName: 'Obsoleto' }); await flushPromises()
        expect(mocks.tracking).toHaveBeenCalledTimes(2)
        expect(wrapper.text()).toContain('Otra sucursal')
        expect(wrapper.text()).not.toContain('Obsoleto')
    })
    it('replays a management change received during the in-flight tracking request', async () => {
        let finish!: (value: typeof snapshot) => void
        mocks.tracking.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
            .mockResolvedValueOnce({ ...snapshot, deliveryManName: 'Estado nuevo' })
        mountDialog(); await flushPromises()
        managementEvent?.({ orderId: 20, managementVersion: 8 })
        managementEvent?.({ orderId: 20, managementVersion: 9 })
        expect(mocks.tracking).toHaveBeenCalledTimes(1)
        finish(snapshot); await flushPromises()
        expect(mocks.tracking).toHaveBeenCalledTimes(2)
        expect(wrapper.text()).toContain('Estado nuevo')
    })

})
