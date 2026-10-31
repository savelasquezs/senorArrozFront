import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../auth'
import { useOrdersDraftsStore } from '../ordersDrafts'
import { useBranchContextStore } from '../branchContext'
import { useOrderTabs } from '@/composables/useOrderTabs'
import type { Customer } from '@/types/customer'

const requests = vi.hoisted(() => ({ getCustomerById: vi.fn(), getCustomerAddresses: vi.fn() }))
vi.mock('@/services/MainAPI/customerApi', () => ({ customerApi: requests }))
const customer = (id: number, addresses: Customer['addresses'] | null = []): Customer => ({
    id, branchId: 1, name: `Cliente sintético ${id}`, active: true, createdAt: '', updatedAt: '',
    ...(addresses === null ? {} : { addresses }),
}) as Customer
const response = (id = 10) => ({ isSuccess: true, data: customer(id) })
function deferred<T>() {
    let resolve!: (value: T) => void, reject!: (error: Error) => void
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
function addDraftForCustomer(id: number, addressId?: number) {
    const store = useOrdersDraftsStore()
    useOrderTabs().createNewTab()
    const tabId = store.currentTabId!
    store.draftOrders.set(tabId, { ...store.draftOrders.get(tabId)!, customerId: id,
        ...(addressId ? { addressId, addressDescription: `Dirección ${addressId}`, deliveryFee: addressId * 100 } : {}),
    })
    return store
}

describe('M09-F03: rehydrating customers from persisted POS drafts', () => {
    beforeEach(() => {
        localStorage.clear()
        setActivePinia(createPinia())
        requests.getCustomerById.mockReset()
        requests.getCustomerAddresses.mockReset()
        useAuthStore().user = { id: 7, branchId: 1, role: 'Admin' } as never
    })
    afterEach(() => { disposePinia(getActivePinia()!) })

    it('does not make a second HTTP request for an existing customer with no addresses', async () => {
        requests.getCustomerById.mockResolvedValue(response())
        const store = addDraftForCustomer(10)
        await store.rehydrateCustomersFromDrafts()
        expect(requests.getCustomerById).toHaveBeenCalledExactlyOnceWith(10, expect.any(AbortSignal))
        expect(requests.getCustomerAddresses).not.toHaveBeenCalled()
        expect(store.customers.find(c => c.id === 10)?.addresses).toEqual([])
        expect(store.customerHydrationIncomplete).toBe(false)
    })
    it('does not duplicate address loading for a complete customer with addresses', async () => {
        const address = { id: 20, customerId: 10, address: 'Dirección sintética', neighborhoodId: 1 }
        requests.getCustomerById.mockResolvedValue({ isSuccess: true, data: customer(10, [address] as Customer['addresses']) })
        const store = addDraftForCustomer(10)
        await store.rehydrateCustomersFromDrafts()
        expect(requests.getCustomerAddresses).not.toHaveBeenCalled()
        expect(store.customers.find(c => c.id === 10)?.addresses).toEqual([address])
    })
    it('retains the compatibility fallback when an older response omits addresses', async () => {
        const address = { id: 30, customerId: 15, address: 'Dirección heredada', neighborhoodId: 1 }
        requests.getCustomerById.mockResolvedValue({ isSuccess: true, data: customer(15, null) })
        requests.getCustomerAddresses.mockResolvedValue({ isSuccess: true, data: [address] })
        const store = addDraftForCustomer(15)
        await store.rehydrateCustomersFromDrafts()
        expect(requests.getCustomerAddresses).toHaveBeenCalledExactlyOnceWith(15, expect.any(AbortSignal))
        expect(store.customers.find(c => c.id === 15)?.addresses).toEqual([address])
    })
    it('requests each unique customer once across multiple tabs', async () => {
        requests.getCustomerById.mockImplementation(async (id: number) => response(id))
        const store = addDraftForCustomer(10)
        addDraftForCustomer(10); addDraftForCustomer(11); addDraftForCustomer(12)
        await store.rehydrateCustomersFromDrafts()
        expect(requests.getCustomerById).toHaveBeenCalledTimes(3)
        expect(requests.getCustomerById.mock.calls.map(call => call[0]).sort()).toEqual([10, 11, 12])
        expect(requests.getCustomerAddresses).not.toHaveBeenCalled()
        expect(store.customers).toHaveLength(3)
    })
    it('shares a restoration in flight between consumers', async () => {
        const gate = deferred<ReturnType<typeof response>>()
        requests.getCustomerById.mockReturnValue(gate.promise)
        const store = addDraftForCustomer(10)
        const first = store.rehydrateCustomersFromDrafts(), second = store.rehydrateCustomersFromDrafts()
        expect(requests.getCustomerById).toHaveBeenCalledTimes(1)
        expect(store.customerHydrationPending).toBe(true)
        gate.resolve(response()); await Promise.all([first, second])
        expect(store.customers).toHaveLength(1)
        expect(store.customerHydrationPending).toBe(false)
    })
    it('logout aborts and never creates a provisional customer from a late failure', async () => {
        const gate = deferred<ReturnType<typeof response>>()
        requests.getCustomerById.mockReturnValue(gate.promise)
        const store = addDraftForCustomer(10), work = store.rehydrateCustomersFromDrafts()
        const signal = requests.getCustomerById.mock.calls[0]![1] as AbortSignal
        useAuthStore().user = null
        expect(signal.aborted).toBe(true)
        gate.reject(new Error('old network failure')); await work
        expect(store.customers).toEqual([])
        expect(store.customerHydrationPending).toBe(false)
    })
    it('a replacement identity cannot receive the prior request result', async () => {
        const old = deferred<ReturnType<typeof response>>()
        requests.getCustomerById.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...response(), data: { ...customer(10), name: 'Actual' } })
        const store = addDraftForCustomer(10), work = store.rehydrateCustomersFromDrafts()
        useAuthStore().user = { ...useAuthStore().user!, id: 8 }
        await store.rehydrateCustomersFromDrafts()
        old.resolve(response()); await work
        expect(store.customers[0]!.name).toBe('Actual')
    })
    it('clearing drafts prevents pending reads from repopulating the customer list', async () => {
        const gate = deferred<ReturnType<typeof response>>()
        requests.getCustomerById.mockReturnValue(gate.promise)
        const store = addDraftForCustomer(10), work = store.rehydrateCustomersFromDrafts()
        store.draftOrders.clear(); store.customers = []
        gate.resolve(response()); await work; await flushPromises()
        expect(store.customers).toEqual([])
        expect(requests.getCustomerById).toHaveBeenCalledTimes(1)
    })
    it('aborts old workspace reads while retaining the drafts themselves', async () => {
        const gate = deferred<ReturnType<typeof response>>()
        requests.getCustomerById.mockReturnValue(gate.promise)
        const store = addDraftForCustomer(10), work = store.rehydrateCustomersFromDrafts()
        const signal = requests.getCustomerById.mock.calls[0]![1] as AbortSignal
        useBranchContextStore().selectedBranchId = 2
        expect(signal.aborted).toBe(true)
        gate.resolve(response()); await work
        expect(store.customers).toEqual([])
        expect(store.draftOrders.size).toBe(1)
    })
    it('collects every distinct saved address and replaces the provisional snapshot after retry', async () => {
        requests.getCustomerById.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response())
        const store = addDraftForCustomer(10, 20)
        addDraftForCustomer(10, 30); addDraftForCustomer(10, 20)
        const saved = JSON.stringify([...store.draftOrders.values()])
        await store.rehydrateCustomersFromDrafts()
        expect(store.customers[0]!.addresses!.map(address => address.id)).toEqual([20, 30])
        expect(store.customers[0]!.addresses!.every(address => !address.branchServices?.length)).toBe(true)
        expect(store.customerHydrationIncomplete).toBe(true)
        await store.rehydrateCustomersFromDrafts()
        expect(store.customers[0]!.name).toBe('Cliente sintético 10')
        expect(store.customers[0]!.addresses).toEqual([])
        expect(store.customerHydrationIncomplete).toBe(false)
        expect(JSON.stringify([...store.draftOrders.values()])).toBe(saved)
    })
    it('does not overwrite an in-place local edit with a late snapshot', async () => {
        const gate = deferred<ReturnType<typeof response>>()
        requests.getCustomerById.mockReturnValue(gate.promise)
        const store = addDraftForCustomer(10)
        store.customers = [customer(10)]
        const work = store.rehydrateCustomersFromDrafts()
        store.customers[0]!.name = 'Edición local'
        gate.resolve(response()); await work
        expect(store.customers[0]!.name).toBe('Edición local')
    })
    it('does not overwrite a customer selected while the restoration was pending', async () => {
        const gate = deferred<ReturnType<typeof response>>()
        requests.getCustomerById.mockReturnValue(gate.promise)
        const store = addDraftForCustomer(10), work = store.rehydrateCustomersFromDrafts()
        store.ensureCustomerInList({ ...customer(10), name: 'Seleccionado ahora' })
        gate.resolve(response()); await work
        expect(store.customers[0]!.name).toBe('Seleccionado ahora')
    })
    it.each([401, 403, 404])('does not reconstruct denied or deleted data after HTTP %s', async status => {
        requests.getCustomerById.mockRejectedValue(Object.assign(new Error('denied'), { status }))
        const store = addDraftForCustomer(10, 20)
        await store.rehydrateCustomersFromDrafts()
        expect(store.customers).toEqual([])
        expect(store.customerHydrationIncomplete).toBe(true)
    })
    it('does not apply an address fallback after the store is disposed', async () => {
        const gate = deferred<{ isSuccess: boolean; data: Customer['addresses'] }>()
        requests.getCustomerById.mockResolvedValue({ isSuccess: true, data: customer(10, null) })
        requests.getCustomerAddresses.mockReturnValue(gate.promise)
        const store = addDraftForCustomer(10), work = store.rehydrateCustomersFromDrafts()
        await flushPromises()
        const signal = requests.getCustomerAddresses.mock.calls[0]![1] as AbortSignal
        store.$dispose(); gate.resolve({ isSuccess: true, data: [] }); await work
        expect(signal.aborted).toBe(true)
        expect(store.customers).toEqual([])
    })
    it('a failed compatibility read remains provisional and retryable', async () => {
        requests.getCustomerById.mockResolvedValueOnce({ isSuccess: true, data: customer(10, null) }).mockResolvedValueOnce(response())
        requests.getCustomerAddresses.mockRejectedValue(new Error('offline'))
        const store = addDraftForCustomer(10, 20)
        await store.rehydrateCustomersFromDrafts()
        expect(store.customers[0]!.addresses![0]!.id).toBe(20)
        expect(store.customerHydrationIncomplete).toBe(true)
        await store.rehydrateCustomersFromDrafts()
        expect(store.customerHydrationIncomplete).toBe(false)
    })
})
