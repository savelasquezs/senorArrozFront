import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    connected: null as unknown as Ref<boolean>, connectOnMount: false,
    handlers: new Map<string, (...args: any[]) => Promise<void>>(), off: vi.fn(), trace: [] as string[],
    ready: vi.fn(), preparation: vi.fn(), assigned: vi.fn(), getPlan: vi.fn(),
    success: vi.fn(), error: vi.fn(), warning: vi.fn(),
}))
vi.mock('@/composables/useSignalR', async () => {
    const { ref, onMounted } = await import('vue')
    mocks.connected = ref(true)
    return { useSignalR: () => {
        onMounted(() => { mocks.trace.push('connect'); if (mocks.connectOnMount) mocks.connected.value = true })
        return { isConnected: mocks.connected,
            on: (name: string, handler: (...args: any[]) => Promise<void>) => { mocks.handlers.set(name, handler); mocks.trace.push(name) },
            off: mocks.off,
        }
    } }
})
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ user: { id: 7, branchId: 1 }, userRole: 'Admin',
    branchName: 'Test', isAdmin: true, isSuperadmin: false, isDeliveryman: false, isCashier: false }) }))
vi.mock('@/store/delivery', () => ({ useDeliveryStore: () => ({
    availableOrders: [], preparationOrders: [], ordersOnTheWay: [], historyBranchSummaries: [],
    historyModalRequestId: 0, historyOrders: [], historyNeighborhoodOptions: [],
    loadAvailableOrders: mocks.ready, loadPreparationOrders: mocks.preparation, loadRouteAssignedOrders: mocks.assigned,
}) }))
vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/delivery' }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: mocks.success, error: mocks.error, warning: mocks.warning }) }))
vi.mock('@/services/MainAPI/deliveryRoutingApi', () => ({ deliveryRoutingApi: { getPlan: mocks.getPlan } }))
vi.mock('@/composables/dashboard/useDeliverySelfAnalytics', async () => {
    const { ref } = await import('vue')
    return { useDeliverySelfAnalytics: () => ({ loading: ref(false), error: ref(null), resolvedPayload: ref({}), refresh: vi.fn() }) }
})
vi.mock('@/components/dashboard', () => ({
    defaultDateRangeToday: () => [new Date('2026-10-31'), new Date('2026-10-31')],
    DashboardPeriodPanel: { template: '<div />' }, DeliveryPerformancePanel: { template: '<div />' },
}))
import DeliveryView from '../DeliveryView.vue'

let wrapper: VueWrapper | undefined
function render() { wrapper = shallowMount(DeliveryView); return wrapper }
async function tab(label: string) {
    await wrapper!.findAll('button').find(button => button.text() === label)!.trigger('click')
    await flushPromises()
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }

describe('M15-F01 delivery view lifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks(); mocks.handlers.clear(); mocks.trace.length = 0; mocks.connectOnMount = false; mocks.connected.value = true
        mocks.ready.mockResolvedValue(undefined); mocks.preparation.mockResolvedValue(undefined)
        mocks.assigned.mockResolvedValue(undefined); mocks.getPlan.mockResolvedValue({ version: 1, proposals: [] })
    })
    afterEach(() => { wrapper?.unmount(); wrapper = undefined })

    it('skips hidden ready reads but keeps the notification and refreshes on return', async () => {
        render(); await flushPromises(); expect(mocks.ready).toHaveBeenCalledTimes(1)
        await tab('En preparación')
        await mocks.handlers.get('OrderReady')!({ id: 42 })
        await mocks.handlers.get('OrderAssigned')!({ id: 42 })
        expect(mocks.ready).toHaveBeenCalledTimes(1)
        expect(mocks.success).toHaveBeenCalledWith('Nuevo pedido disponible', 5000, 'Pedido #42')
        await tab('Pedidos Disponibles'); expect(mocks.ready).toHaveBeenCalledTimes(2)
    })
    it('also avoids hidden route-plan queries and reloads that tab when opened', async () => {
        render(); await flushPromises()
        await mocks.handlers.get('DeliveryRoutingPlanChanged')!()
        await mocks.handlers.get('RouteProposalClaimed')!()
        expect(mocks.getPlan).not.toHaveBeenCalled()
        await tab('Rutas sugeridas'); expect(mocks.getPlan).toHaveBeenCalledTimes(1)
        await mocks.handlers.get('DeliveryRoutingPlanChanged')!()
        expect(mocks.getPlan).toHaveBeenCalledTimes(2)
    })
    it('refreshes the visible snapshot after reconnecting instead of leaving missed events stale', async () => {
        render(); await flushPromises()
        mocks.connected.value = false; await nextTick(); mocks.connected.value = true; await flushPromises()
        expect(mocks.ready).toHaveBeenCalledTimes(2)
        await tab('En preparación')
        mocks.connected.value = false; mocks.connected.value = true; await flushPromises()
        expect(mocks.ready).toHaveBeenCalledTimes(2)
        expect(mocks.preparation).toHaveBeenCalledTimes(2)
    })
    it('subscribes before connecting and does not duplicate startup if connection is already established', async () => {
        mocks.connected.value = false; mocks.connectOnMount = true
        render(); await flushPromises()
        expect(mocks.trace.indexOf('OrderReady')).toBeLessThan(mocks.trace.indexOf('connect'))
        expect(mocks.ready).toHaveBeenCalledTimes(1)
    })
    it('does not show a late notification or retain handlers after unmount', async () => {
        render(); await flushPromises()
        const gate = deferred(); mocks.ready.mockReturnValueOnce(gate.promise)
        const readyHandler = mocks.handlers.get('OrderReady')!
        const pending = readyHandler({ id: 42 }); await flushPromises()
        wrapper!.unmount(); wrapper = undefined
        gate.resolve(); await pending
        expect(mocks.success).not.toHaveBeenCalled()
        expect(mocks.off).toHaveBeenCalledTimes(5)
        expect(mocks.off).toHaveBeenCalledWith('OrderReady', readyHandler)
        await readyHandler({ id: 43 })
        expect(mocks.ready).toHaveBeenCalledTimes(2)
    })
})
