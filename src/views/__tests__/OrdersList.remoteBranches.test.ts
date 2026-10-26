import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import OrdersList from '@/views/OrdersList.vue'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import ReservationsTable from '@/components/reservations/ReservationsTable.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const mocks = vi.hoisted(() => ({
    search: vi.fn(), deliverymen: vi.fn(), branches: vi.fn(), options: vi.fn(), payment: vi.fn(), toast: vi.fn(), replace: vi.fn(),
    changes: {
        changed: null as null | ((event: any) => void),
        resume: null as null | (() => void),
    },
    banksLoaded: vi.fn().mockResolvedValue(undefined),
    appsLoaded: vi.fn().mockResolvedValue(undefined),
}))
const state = reactive({ role: 'Cashier', branchId: 1, query: {} as Record<string, string> })
const localBanks = [{ id: 101, name: 'Banco Origen', branchId: 1, active: true }]
const localApps = [{ id: 301, name: 'App Origen', branchId: 1, active: true }]
vi.mock('vue-router', () => ({ useRoute: () => ({ get query() { return state.query } }), useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ get userRole() { return state.role }, get branchId() { return state.branchId }, isSuperadmin: false }) }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1 }) }))
vi.mock('@/store/banks', () => ({ useBanksStore: () => ({ options: localBanks, list: null, ensureListLoaded: mocks.banksLoaded }) }))
vi.mock('@/store/apps', () => ({ useAppsStore: () => ({ options: localApps, list: null, ensureListLoaded: mocks.appsLoaded }) }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { searchOrders: mocks.search, getDeliverymanOptions: mocks.deliverymen } }))
vi.mock('@/services/MainAPI/orderManagementApi', () => ({ orderManagementApi: { remoteBranches: mocks.branches, options: mocks.options } }))
vi.mock('@/services/MainAPI/bankPaymentApi', () => ({ bankPaymentApi: { createBankPayment: mocks.payment } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: mocks.toast }) }))
vi.mock('@/composables/useOrderPermissions', () => ({ useOrderPermissions: () => ({
    getNextAllowedStatus: vi.fn(), canChangeStatus: () => true, canVerifyPayments: () => true, canUnverifyPayments: () => true,
}) }))
vi.mock('@/composables/useOrderManagementUpdates', () => ({ useOrderManagementUpdates: (changed: any, resume: any) => {
    mocks.changes.changed = changed
    mocks.changes.resume = resume
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
    vi.clearAllMocks()
    state.role = 'Cashier'; state.branchId = 1; state.query = {}
    mocks.branches.mockResolvedValue([{ id: 2, name: 'Manrique', sampleOrderId: 20 }])
    mocks.options.mockResolvedValue({ branchId: 2, branchName: 'Manrique', banks: [{ id: 202, name: 'Banco Destino', active: true }], apps: [], deliverymen: [], maxFreeDeliveryDiscount: 3000 })
    mocks.search.mockImplementation(async body => paged(body.remoteOnly ? [remote] : [local]))
    mocks.deliverymen.mockResolvedValue([{ value: 17, label: 'Kevin' }])
    mocks.payment.mockResolvedValue({ id: 500, bankId: 202, orderId: 20, amount: 30000 })
    mocks.replace.mockImplementation(async ({ query }) => { state.query = query })
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })

describe('remote order workspaces', () => {
    it('uses payment catalogs for local shortcuts and filters before visiting administrative lists', async () => {
        mountView(); await flushPromises()
        expect(wrapper.findComponent(OrdersTable).props('quickBanks')).toEqual(localBanks)
        await wrapper.findAll('button').find(button => button.text() === 'Ver filtros avanzados')!.trigger('click')
        const selects = wrapper.findAllComponents(BaseSelect)
        expect(selects.find(select => select.attributes('placeholder') === 'Banco (pagos)')?.props('options'))
            .toContainEqual({ value: 101, label: 'Banco Origen' })
        expect(selects.find(select => select.attributes('placeholder') === 'App (pagos)')?.props('options'))
            .toContainEqual({ value: 301, label: 'App Origen' })
    })

    it('registers only the remaining balance through a local bank shortcut', async () => {
        const partiallyPaid = { ...local, bankPayments: [{ id: 8, bankId: 101, amount: 10000 }] }
        mocks.search.mockResolvedValue(paged([partiallyPaid]))
        mocks.payment.mockResolvedValue({ id: 501, bankId: 101, orderId: 10, amount: 20000 })
        mountView(); await flushPromises()
        wrapper.findComponent(OrdersTable).vm.$emit('quick-bank-transfer', partiallyPaid, 101)
        await flushPromises()
        expect(mocks.payment).toHaveBeenCalledWith({ orderId: 10, bankId: 101, amount: 20000 }, partiallyPaid)
        expect(wrapper.findComponent(OrdersTable).props('orders')[0].bankPayments).toHaveLength(2)
    })

    it('shows local rows while bank options are still pending', async () => {
        mocks.banksLoaded.mockReturnValueOnce(new Promise(() => {}))
        mountView(); await flushPromises()
        expect(mocks.search).toHaveBeenCalledOnce()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
    })

    it('aborts the table transport when its owner unmounts', async () => {
        mocks.search.mockReturnValueOnce(new Promise(() => {}))
        mountView(); await flushPromises()
        const signal = mocks.search.mock.calls[0]![1] as AbortSignal
        expect(signal.aborted).toBe(false)
        wrapper.unmount()
        expect(signal.aborted).toBe(true)
    })

    it('makes only one orders/search call per complete local and remote tab', async () => {
        const withDriver = (o: typeof local) => ({
            ...o, deliveryManId: 17, deliveryManName: 'Kevin',
        })
        mocks.search.mockImplementation(async body => paged(
            body.remoteOnly ? [withDriver(remote)] : [withDriver(local)],
        ))
        mountView(); await flushPromises()
        expect(mocks.search).toHaveBeenCalledTimes(1)
        expect(mocks.search.mock.calls[0]![0].type).toBeUndefined()
        await clickTab('Pedidos de Manrique')
        expect(mocks.search).toHaveBeenCalledTimes(2)
        expect(mocks.search.mock.calls[1]![0]).toMatchObject({ remoteOnly: true, branchId: 2 })
        await clickTab('Pedidos del día')
        expect(mocks.search).toHaveBeenCalledTimes(3)
    })

    it('uses projected deliverymen without downloading all order pages', async () => {
        mocks.search.mockImplementation(async body => body.type === 'delivery'
            ? paged([{ ...local, deliveryManId: 17, deliveryManName: 'Kevin' }])
            : { ...paged([local]), totalCount: 150 })
        mountView(); await flushPromises()
        expect(mocks.search).toHaveBeenCalledTimes(1)
        expect(mocks.deliverymen).toHaveBeenCalledOnce()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
    })

    it('coalesces identical in-flight deliverymen searches during an overlapping date refresh', async () => {
        let finishDeliverymen!: (value: any) => void
        mocks.search.mockResolvedValue({ ...paged([local]), totalCount: 150 })
        mocks.deliverymen.mockImplementation(() => new Promise(resolve => { finishDeliverymen = resolve }))
        mountView()
        await flushPromises()

        // The first page is incomplete; the dropdown requests a full deliverymen
        // search. A second refresh with the same date must join that HTTP request.
        expect(mocks.deliverymen).toHaveBeenCalledOnce()
        wrapper.findComponent(BaseSelect).vm.$emit('update:modelValue', 'today')
        await flushPromises()
        expect(mocks.deliverymen).toHaveBeenCalledOnce()

        finishDeliverymen([{ value: 17, label: 'Kevin' }])
        await flushPromises()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
    })

    it('shares catalog requests with MainLayout using the actual branch scope', async () => {
        mountView(); await flushPromises()
        expect(mocks.banksLoaded).toHaveBeenCalledWith(1)
        expect(mocks.appsLoaded).toHaveBeenCalledWith(1)
        expect(mocks.branches).toHaveBeenCalledTimes(1)
    })

    it('does not reload fresh order data just because a tab loses and regains focus', async () => {
        mountView(); await flushPromises()
        const searchesBefore = mocks.search.mock.calls.length
        const branchesBefore = mocks.branches.mock.calls.length
        vi.useFakeTimers()
        mocks.changes.resume!()
        await vi.advanceTimersByTimeAsync(850)
        expect(mocks.search.mock.calls.length).toBe(searchesBefore)
        expect(mocks.branches.mock.calls.length).toBe(branchesBefore)
    })

    it('keeps all order rows visible on a later background refresh', async () => {
        mountView(); await flushPromises()
        const before = mocks.search.mock.calls.length
        let resolveSearch!: (value: any) => void
        mocks.search.mockImplementation(() => new Promise(resolve => { resolveSearch = resolve }))
        vi.useFakeTimers()
        await vi.advanceTimersByTimeAsync(31_000)
        mocks.changes.resume!()
        await vi.advanceTimersByTimeAsync(650)
        expect(mocks.search).toHaveBeenCalledTimes(before + 1)
        expect(wrapper.findComponent(OrdersTable).props('loading')).toBe(false)
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
        resolveSearch(paged([local]))
        await flushPromises()
        expect(mocks.branches).toHaveBeenCalledTimes(1)
    })

    it('ignores unrelated remote events while monitoring local orders', async () => {
        mountView(); await flushPromises()
        const before = mocks.search.mock.calls.length
        vi.useFakeTimers()
        mocks.changes.changed!({ orderId: 20, branchId: 2, originBranchId: 1, managementVersion: 2 })
        await vi.advanceTimersByTimeAsync(750)
        expect(mocks.search).toHaveBeenCalledTimes(before)
        expect(mocks.branches).toHaveBeenCalledTimes(1)
    })

    it('reuses the normal table and sends source-filtered destination queries without changing the session', async () => {
        mountView(); await flushPromises()
        expect(wrapper.findComponent(OrdersTable).props('orders')).toEqual([local])
        await clickTab('Pedidos de Manrique')
        const table = wrapper.findComponent(OrdersTable)
        expect(table.props('orders')).toEqual([remote])
        expect(table.props('quickBanks')).toEqual([{ id: 202, name: 'Banco Destino', active: true }])
        expect(table.props('detailQuery')).toEqual({ remoteBranchId: '2' })
        expect(mocks.search).toHaveBeenLastCalledWith(expect.objectContaining({ remoteOnly: true, branchId: 2 }), expect.any(AbortSignal))
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
    it('requests active reservations from the server and preserves server totals across pages', async () => {
        const active = { ...local, id: 71, type: 'reservation', status: 'taken' }
        mocks.search.mockImplementation(async body => body.type === 'reservation'
            ? { items: [active], totalCount: 301, totalPages: 3, page: 1, pageSize: 150 }
            : paged([local]))
        mountView(); await flushPromises(); await clickTab('Reservas')
        expect(mocks.search).toHaveBeenLastCalledWith(expect.objectContaining({
            type: 'reservation', activeReservationsOnly: true, page: 1, pageSize: 150,
        }))
        expect(wrapper.findComponent(ReservationsTable).props('reservations')).toEqual([active])
        expect(wrapper.text()).toContain('de 301 reservas')
        expect(wrapper.text()).toContain('Página 1 de 3')
        const options = wrapper.findComponent(BaseSelect).props('options') as Array<{ value: string }>
        expect(options.some(option => option.value === 'reservation')).toBe(false)
    })

    it('retains explicit All and Delivered status searches without the active filter', async () => {
        mountView(); await flushPromises(); await clickTab('Reservas')
        const status = wrapper.findComponent(BaseSelect)
        status.vm.$emit('update:modelValue', '__all__'); await flushPromises()
        expect(mocks.search.mock.lastCall![0]).toMatchObject({ type: 'reservation', activeReservationsOnly: false })
        expect(mocks.search.mock.lastCall![0].status).toBeUndefined()
        status.vm.$emit('update:modelValue', 'delivered'); await flushPromises()
        expect(mocks.search.mock.lastCall![0]).toMatchObject({
            type: 'reservation', activeReservationsOnly: false, status: 'delivered', page: 1,
        })
    })

    it('searches across all reservation pages on the server with debounce', async () => {
        const serverMatch = { ...local, id: 42, type: 'reservation', status: 'taken', guestName: 'OTHER' }
        mocks.search.mockImplementation(async body => body.type === 'reservation'
            ? { items: [serverMatch], totalCount: 1 } : paged([local]))
        mountView(); await flushPromises(); await clickTab('Reservas')
        const before = mocks.search.mock.calls.length
        vi.useFakeTimers()
        const search = wrapper.findComponent(BaseInput)
        search.vm.$emit('update:modelValue', 'cliente de otra página')
        search.vm.$emit('input')
        await vi.advanceTimersByTimeAsync(330)
        await flushPromises()
        expect(mocks.search.mock.calls.length).toBe(before + 1)
        expect(mocks.search.mock.lastCall![0]).toMatchObject({
            type: 'reservation', searchTerm: 'cliente de otra página', page: 1,
        })
        // No se vuelve a filtrar localmente una página que ya filtró PostgreSQL.
        expect(wrapper.findComponent(ReservationsTable).props('reservations')).toEqual([serverMatch])
    })

    it('ignores an obsolete reservation response after changing status', async () => {
        let resolveOld!: (value: any) => void
        const updated = { ...local, id: 99, type: 'reservation', status: 'delivered' }
        const older = { ...local, id: 88, type: 'reservation', status: 'taken' }
        mocks.search.mockImplementation(body => {
            if (body.type !== 'reservation') return Promise.resolve(paged([local]))
            return body.status === 'delivered' ? Promise.resolve(paged([updated]))
                : new Promise(resolve => { resolveOld = resolve })
        })
        mountView(); await flushPromises(); await clickTab('Reservas')
        wrapper.findComponent(BaseSelect).vm.$emit('update:modelValue', 'delivered')
        await flushPromises()
        expect(wrapper.findComponent(ReservationsTable).props('reservations')).toEqual([updated])
        resolveOld(paged([older])); await flushPromises()
        expect(wrapper.findComponent(ReservationsTable).props('reservations')).toEqual([updated])
    })

})
