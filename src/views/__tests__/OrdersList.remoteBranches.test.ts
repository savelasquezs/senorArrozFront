import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OrdersList from '@/views/OrdersList.vue'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue'

const mocks = vi.hoisted(() => ({
    search: vi.fn(), branches: vi.fn(), options: vi.fn(), payment: vi.fn(), toast: vi.fn(), replace: vi.fn(),
    changes: { changed: null as null | ((event: any) => void) },
}))
const state = reactive({ role: 'Cashier', branchId: 1, query: {} as Record<string, string> })
const localBanks = [{ id: 101, name: 'Banco Origen', branchId: 1, active: true }]
vi.mock('vue-router', () => ({ useRoute: () => ({ get query() { return state.query } }), useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ get userRole() { return state.role }, get branchId() { return state.branchId }, isSuperadmin: false }) }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1 }) }))
vi.mock('@/store/banks', () => ({ useBanksStore: () => ({ list: { items: localBanks }, ensureListLoaded: async () => {} }) }))
vi.mock('@/store/apps', () => ({ useAppsStore: () => ({ list: { items: [] }, ensureListLoaded: async () => {} }) }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { searchOrders: mocks.search } }))
vi.mock('@/services/MainAPI/orderManagementApi', () => ({ orderManagementApi: { remoteBranches: mocks.branches, options: mocks.options } }))
vi.mock('@/services/MainAPI/bankPaymentApi', () => ({ bankPaymentApi: { createBankPayment: mocks.payment } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: mocks.toast }) }))
vi.mock('@/composables/useOrderPermissions', () => ({ useOrderPermissions: () => ({
    getNextAllowedStatus: vi.fn(), canChangeStatus: () => true, canVerifyPayments: () => true, canUnverifyPayments: () => true,
}) }))
vi.mock('@/composables/useOrderManagementUpdates', () => ({ useOrderManagementUpdates: (changed: any) => {
    mocks.changes.changed = changed
    return { isPageVisible: ref(true), isOnline: ref(true) }
} }))
const local = { id: 10, branchId: 1, branchName: 'Santander', type: 'delivery', status: 'taken',
    managementVersion: 1, total: 30000, bankPayments: [], appPayments: [], createdAt: '2026-10-12T15:00:00Z' }
const remote = { ...local, id: 20, branchId: 2, branchName: 'Manrique', originBranchId: 1, managementVersion: 7 }
const paged = (items: any[]) => ({ items, totalCount: items.length })
let wrapper: VueWrapper
function mountView() {
    wrapper = shallowMount(OrdersList, { global: { stubs: {
        MainLayout: { template: '<div><slot /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
        BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>' },
    } } })
    return wrapper
}
async function clickTab(label: string) {
    const button = wrapper.findAll('button').find(b => b.text() === label)
    expect(button, `Tab ${label}`).toBeTruthy()
    await button!.trigger('click'); await flushPromises()
}
beforeEach(() => {
    state.role = 'Cashier'; state.branchId = 1; state.query = {}
    mocks.branches.mockResolvedValue([{ id: 2, name: 'Manrique', sampleOrderId: 20 }])
    mocks.options.mockResolvedValue({ branchId: 2, branchName: 'Manrique', banks: [{ id: 202, name: 'Banco Destino', active: true }], apps: [], deliverymen: [], maxFreeDeliveryDiscount: 3000 })
    mocks.search.mockImplementation(async body => paged(body.remoteOnly ? [remote] : [local]))
    mocks.payment.mockResolvedValue({ id: 500, bankId: 202, orderId: 20, amount: 30000 })
    mocks.replace.mockImplementation(async ({ query }) => { state.query = query })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })

describe('remote order workspaces', () => {
    it('reuses the normal table and sends source-filtered destination queries without changing the session', async () => {
        mountView(); await flushPromises()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
        await clickTab('Pedidos de Manrique')
        const table = wrapper.findComponent(OrdersTable)
        expect(table.props('orders')).toEqual([remote])
        expect(table.props('quickBanks')).toEqual([{ id: 202, name: 'Banco Destino', active: true }])
        expect(table.props('detailQuery')).toEqual({ remoteBranchId: '2' })
        expect(mocks.search).toHaveBeenLastCalledWith(expect.objectContaining({ remoteOnly: true, branchId: 2 }))
        expect(mocks.options).toHaveBeenCalledWith(20)
        expect(state.branchId).toBe(1)
        expect(localBanks[0]!.id).toBe(101)
        await clickTab('Pedidos del día')
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
        expect(mocks.search.mock.lastCall![0]).not.toHaveProperty('remoteOnly')
        expect(wrapper.findComponent(OrdersTable).props('quickBanks')[0].id).toBe(101)
    })
    it('supports returning directly from a remote order detail', async () => {
        state.query = { remoteBranchId: '2' }
        mountView(); await flushPromises()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([remote])
        expect(mocks.search.mock.calls.every(([body]) => body.remoteOnly === true)).toBe(true)
    })
    it('does not turn an unknown remote tab into a misleading local list', async () => {
        state.query = { remoteBranchId: '99' }
        mountView(); await flushPromises()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([])
        expect(mocks.search).not.toHaveBeenCalled()
        expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })
    it('does not expose remote tabs to kitchen staff', async () => {
        state.role = 'Kitchen'
        mountView(); await flushPromises()
        expect(mocks.branches).not.toHaveBeenCalled()
        expect(wrapper.text()).not.toContain('Pedidos de Manrique')
    })
    it('passes the clicked order snapshot to remote quick payment writes', async () => {
        state.query = { remoteBranchId: '2' }
        mountView(); await flushPromises()
        wrapper.findComponent(OrdersTable).vm.$emit('quick-bank-transfer', remote, 202)
        await flushPromises()
        expect(mocks.payment).toHaveBeenCalledWith({ orderId: 20, bankId: 202, amount: 30000 }, remote)
        expect(remote.managementVersion).toBe(7)
    })
    it('does not auto-replace the version in an open editor on another branch update', async () => {
        mountView(); await flushPromises(); await clickTab('Pedidos de Manrique')
        wrapper.findComponent(OrdersTable).vm.$emit('edit-customer', remote)
        await flushPromises()
        vi.useFakeTimers()
        const previousReads = mocks.search.mock.calls.length
        mocks.changes.changed!({ orderId: 20, managementVersion: 8 })
        await vi.advanceTimersByTimeAsync(550)
        expect(mocks.search.mock.calls.length).toBe(previousReads)
        expect(wrapper.findComponent(EditCustomerModal).props('order').managementVersion).toBe(7)
        wrapper.findComponent(EditCustomerModal).vm.$emit('close')
        await vi.advanceTimersByTimeAsync(550)
        expect(mocks.search.mock.calls.length).toBeGreaterThan(previousReads)
    })
    it('does not let a late remote response overwrite the local tab', async () => {
        mountView(); await flushPromises()
        let finishRemote!: (value: any) => void
        mocks.search.mockImplementation(body => body.remoteOnly
            ? new Promise(resolve => { finishRemote = resolve })
            : Promise.resolve(paged([local])))
        const remoteButton = wrapper.findAll('button').find(b => b.text() === 'Pedidos de Manrique')!
        await remoteButton.trigger('click'); await flushPromises()
        await clickTab('Pedidos del día')
        finishRemote(paged([remote])); await flushPromises()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
    })
})
