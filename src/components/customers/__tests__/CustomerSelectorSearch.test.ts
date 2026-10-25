import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CustomerSelector from '../CustomerSelector.vue'
import CustomerSection from '../CustomerSection.vue'
import type { Customer } from '@/types/customer'
import type { CustomerSuggestion, CustomerSuggestionPage } from '@/services/MainAPI/customerLookupApi'

const mocks = vi.hoisted(() => ({
    search: vi.fn(), getCustomer: vi.fn(), create: vi.fn(), showError: vi.fn(), success: vi.fn(),
    auth: null as unknown as { user: { id: number; role: string; branchId: number; accountType: string } | null },
    branch: null as unknown as { selectedBranchId: number },
}))
vi.mock('@/services/MainAPI/customerLookupApi', () => ({ customerLookupApi: { search: mocks.search, getCustomer: mocks.getCustomer } }))
vi.mock('@/store/customers', () => ({ useCustomersStore: () => ({ create: mocks.create }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: mocks.success, error: mocks.showError }) }))
vi.mock('@/store/auth', async () => {
    const { reactive } = await import('vue')
    mocks.auth = reactive({ user: { id: 7, role: 'Superadmin', branchId: 1, accountType: 'personal' } })
    return { useAuthStore: () => mocks.auth }
})
vi.mock('@/store/branchContext', async () => {
    const { reactive } = await import('vue'); mocks.branch = reactive({ selectedBranchId: 1 })
    return { useBranchContextStore: () => mocks.branch }
})
vi.mock('@/store/ordersDrafts', () => ({ useOrdersDraftsStore: () => ({}) }))
vi.mock('@/composables/useOrderTabs', () => ({ useOrderTabs: () => ({ updateOrderType: vi.fn() }) }))

function suggestion(name = 'Nuevo', id = 1): CustomerSuggestion {
    return { id, name, branchId: 1, phone1: '3001234567', billingCompanies: [] }
}
function page(items: CustomerSuggestion[] = [], pageNumber = 1, hasMore = false): CustomerSuggestionPage {
    return { items, page: pageNumber, hasMore }
}
function deferred<T>() {
    let resolve!: (value: T) => void, reject!: (error: Error) => void
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
const wrappers: VueWrapper[] = []
const stubs = { BaseInput: false, BaseButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' } }
function render(props: { branchId?: number; allowCreate?: boolean } = { branchId: 1 }) {
    const wrapper = shallowMount(CustomerSelector, { props, global: { stubs } })
    wrappers.push(wrapper); return wrapper
}
async function type(wrapper: VueWrapper, query: string) { await wrapper.get('input').setValue(query) }
async function search(wrapper: VueWrapper, query = '300') {
    await type(wrapper, query); vi.advanceTimersByTime(400); await flushPromises()
}
function button(wrapper: VueWrapper, label: string) { return wrapper.findAll('button').find(b => b.text() === label)! }
function unmount(wrapper: VueWrapper) { wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1) }

describe('M06-F01 customer lookup', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.auth.user = { id: 7, role: 'Superadmin', branchId: 1, accountType: 'personal' }
        mocks.branch.selectedBranchId = 1
        mocks.search.mockResolvedValue(page())
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers() })

    it('does not search or offer creation with fewer than two characters', async () => {
        const wrapper = render(); await type(wrapper, '300'); vi.advanceTimersByTime(200)
        await type(wrapper, '3'); vi.advanceTimersByTime(500); await flushPromises()
        expect(mocks.search).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('al menos 2 caracteres')
        expect(wrapper.text()).not.toContain('No se encontró cliente')
        expect(wrapper.text()).not.toContain('Crear Cliente')
    })
    it('shows waiting/loading instead of a false empty result, then allows creation', async () => {
        const pending = deferred<CustomerSuggestionPage>(); mocks.search.mockReturnValue(pending.promise)
        const wrapper = render(); await type(wrapper, 'Ana')
        expect(wrapper.text()).toContain('Buscando clientes')
        expect(wrapper.text()).not.toContain('Crear Cliente')
        vi.advanceTimersByTime(400); await flushPromises()
        expect(wrapper.text()).not.toContain('No se encontró cliente')
        pending.resolve(page()); await flushPromises()
        expect(wrapper.text()).toContain('No se encontró cliente')
        expect(wrapper.text()).toContain('Crear Cliente')
    })
    it('shows a recoverable error, not an invitation to create a customer', async () => {
        mocks.search.mockRejectedValueOnce(new Error('HTTP failure')).mockResolvedValueOnce(page([suggestion()]))
        const wrapper = render(); await search(wrapper)
        expect(wrapper.text()).toContain('No se pudieron buscar')
        expect(wrapper.text()).not.toContain('Crear Cliente')
        await button(wrapper, 'Reintentar').trigger('click'); vi.advanceTimersByTime(400); await flushPromises()
        expect(wrapper.text()).toContain('Nuevo'); expect(wrapper.text()).not.toContain('No se pudieron buscar')
    })
    it('aborts an older request and rejects its late response even if transport ignores cancellation', async () => {
        const old = deferred<CustomerSuggestionPage>(), recent = deferred<CustomerSuggestionPage>()
        mocks.search.mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise)
        const wrapper = render(); await search(wrapper, '300')
        const signal = mocks.search.mock.calls[0]![3] as AbortSignal
        await search(wrapper, '301'); expect(signal.aborted).toBe(true)
        recent.resolve(page([suggestion('Nuevo')])); await flushPromises()
        old.resolve(page([suggestion('Anterior')])); await flushPromises()
        expect(wrapper.text()).toContain('Nuevo'); expect(wrapper.text()).not.toContain('Anterior')
    })
    it('clearing the query aborts HTTP and prevents results from returning', async () => {
        const old = deferred<CustomerSuggestionPage>(); mocks.search.mockReturnValue(old.promise)
        const wrapper = render(); await search(wrapper)
        const signal = mocks.search.mock.calls[0]![3] as AbortSignal
        await type(wrapper, ''); expect(signal.aborted).toBe(true)
        old.resolve(page([suggestion('Anterior')])); await flushPromises()
        expect(wrapper.text()).not.toContain('Anterior'); expect(wrapper.text()).not.toContain('No se encontró cliente')
    })
    it('reissues with a changed explicit branch and ignores stale errors', async () => {
        const old = deferred<CustomerSuggestionPage>(); mocks.search.mockReturnValueOnce(old.promise).mockResolvedValueOnce(page([suggestion()]))
        const wrapper = render(); await search(wrapper)
        await wrapper.setProps({ branchId: 2 }); vi.advanceTimersByTime(400); await flushPromises()
        expect(mocks.search.mock.calls[1]!.slice(0, 3)).toEqual(['300', 2, 1])
        old.reject(new Error('obsolete')); await flushPromises()
        expect(wrapper.text()).toContain('Nuevo'); expect(wrapper.text()).not.toContain('No se pudieron buscar')
        expect(mocks.showError).not.toHaveBeenCalled()
    })
    it('CustomerSection follows the session branch but does not substitute the delivery destination', async () => {
        const wrapper = shallowMount(CustomerSection, {
            props: { orderType: 'delivery', mode: 'draft', operationBranchId: 17 },
            global: { stubs: { ...stubs, CustomerSelector: false } },
        }); wrappers.push(wrapper)
        await search(wrapper, 'Ana')
        expect(mocks.search.mock.calls[0]!.slice(0, 3)).toEqual(['Ana', 1, 1])
        const selector = wrapper.getComponent(CustomerSelector)
        expect(selector.props('initialAddressBranchId')).toBe(17)
        await wrapper.setProps({ operationBranchId: 22 }); vi.advanceTimersByTime(500); await flushPromises()
        expect(mocks.search).toHaveBeenCalledTimes(1)
        expect(selector.props('initialAddressBranchId')).toBe(22)
        mocks.branch.selectedBranchId = 2; await nextTick(); vi.advanceTimersByTime(400); await flushPromises()
        expect(mocks.search.mock.calls[1]!.slice(0, 3)).toEqual(['Ana', 2, 1])
    })
    it('a cashier uses the assigned branch rather than a stale global selection', async () => {
        mocks.auth.user!.role = 'Cashier'; mocks.branch.selectedBranchId = 2
        const wrapper = render({}); await search(wrapper)
        expect(mocks.search.mock.calls[0]![1]).toBe(1)
    })
    it('logout invalidates lookup and a different identity starts a new request', async () => {
        const old = deferred<CustomerSuggestionPage>(); mocks.search.mockReturnValueOnce(old.promise).mockResolvedValue(page([suggestion()]))
        const wrapper = render(); await search(wrapper)
        mocks.auth.user = null; await nextTick(); old.resolve(page([suggestion('Anterior')])); await flushPromises()
        expect(wrapper.text()).not.toContain('Anterior')
        mocks.auth.user = { id: 8, role: 'Cashier', branchId: 1, accountType: 'personal' }
        vi.advanceTimersByTime(400); await flushPromises(); expect(mocks.search).toHaveBeenCalledTimes(2)
    })
    it('loads a complete customer once before emitting selection', async () => {
        mocks.search.mockResolvedValue(page([suggestion()]))
        const complete = { ...suggestion(), active: true, createdAt: '', updatedAt: '',
            addresses: [{ id: 9, address: 'Synthetic address', isPrimary: true }], loyaltyRewardDueOnCurrentOrder: true } as Customer
        const detail = deferred<Customer>(); mocks.getCustomer.mockReturnValue(detail.promise)
        const wrapper = render(); await search(wrapper)
        const choice = wrapper.get('[aria-label="Seleccionar Nuevo"]')
        await choice.trigger('click'); await choice.trigger('click')
        expect(wrapper.emitted('customerSelected')).toBeUndefined(); expect(mocks.getCustomer).toHaveBeenCalledTimes(1)
        detail.resolve(complete); await flushPromises()
        expect(wrapper.emitted('customerSelected')?.[0]?.[0]).toEqual(complete)
        expect(wrapper.get('input').element.value).toBe('')
    })
    it('changing the query during selection cancels hydration and cannot emit the old customer', async () => {
        mocks.search.mockResolvedValue(page([suggestion()]))
        const pending = deferred<Customer>(); mocks.getCustomer.mockReturnValue(pending.promise)
        const wrapper = render(); await search(wrapper); await wrapper.get('[aria-label="Seleccionar Nuevo"]').trigger('click')
        const signal = mocks.getCustomer.mock.calls[0]![1] as AbortSignal
        await type(wrapper, 'Otra'); expect(signal.aborted).toBe(true)
        pending.resolve({ ...suggestion(), active: true } as Customer); await flushPromises()
        expect(wrapper.emitted('customerSelected')).toBeUndefined()
    })
    it('selection failure is retryable and an inactive customer is never selected', async () => {
        mocks.search.mockResolvedValue(page([suggestion()])); mocks.getCustomer.mockResolvedValue({ ...suggestion(), active: false })
        const wrapper = render(); await search(wrapper); await wrapper.get('[aria-label="Seleccionar Nuevo"]').trigger('click'); await flushPromises()
        expect(wrapper.emitted('customerSelected')).toBeUndefined(); expect(wrapper.text()).toContain('No se pudo cargar el cliente')
        expect(wrapper.get('[aria-label="Seleccionar Nuevo"]').attributes('disabled')).toBeUndefined()
    })
    it('unmount cancels outstanding requests without late errors', async () => {
        const pending = deferred<CustomerSuggestionPage>(); mocks.search.mockReturnValue(pending.promise)
        const wrapper = render(); await search(wrapper); const signal = mocks.search.mock.calls[0]![3] as AbortSignal
        unmount(wrapper); expect(signal.aborted).toBe(true)
        pending.reject(new Error('closed')); await flushPromises(); expect(mocks.showError).not.toHaveBeenCalled()
    })
    it('pasting a formatted phone replaces the selection and issues one normalized lookup', async () => {
        const wrapper = render(); const input = wrapper.get('input')
        await input.setValue('replace'); input.element.setSelectionRange(0, 7)
        const paste = new Event('paste', { bubbles: true, cancelable: true })
        Object.defineProperty(paste, 'clipboardData', { value: { getData: () => '+57 (300) 123-4567' } })
        input.element.dispatchEvent(paste); await nextTick(); vi.advanceTimersByTime(400); await flushPromises()
        expect(paste.defaultPrevented).toBe(true)
        expect(mocks.search).toHaveBeenCalledTimes(1); expect(mocks.search.mock.calls[0]![0]).toBe('3001234567')
    })
    it('loads more matches without truncation and preserves results when the next page fails', async () => {
        mocks.search.mockResolvedValueOnce(page([suggestion('Uno', 1)], 1, true))
            .mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(page([suggestion('Dos', 2)], 2, false))
        const wrapper = render(); await search(wrapper)
        await button(wrapper, 'Ver más coincidencias').trigger('click'); await flushPromises()
        expect(wrapper.text()).toContain('Uno'); expect(wrapper.text()).not.toContain('Crear Cliente')
        await button(wrapper, 'Reintentar').trigger('click'); await flushPromises()
        expect(mocks.search.mock.calls[2]![2]).toBe(2)
        expect(wrapper.text()).toContain('Uno'); expect(wrapper.text()).toContain('Dos')
        expect(wrapper.text()).not.toContain('Ver más coincidencias')
    })
    it('Rappi-style lookup cannot offer customer creation', async () => {
        const wrapper = render({ branchId: 1, allowCreate: false }); await search(wrapper)
        expect(wrapper.text()).toContain('No se encontró cliente'); expect(wrapper.text()).not.toContain('Crear Cliente')
    })
})
