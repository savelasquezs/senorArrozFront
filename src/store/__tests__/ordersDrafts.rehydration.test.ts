import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../auth'
import { useOrdersDraftsStore } from '../ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'
import type { Customer } from '@/types/customer'

const requests = vi.hoisted(() => ({
    getCustomerById: vi.fn(),
    getCustomerAddresses: vi.fn(),
}))

vi.mock('@/services/MainAPI/customerApi', () => ({ customerApi: requests }))

const customer = (id: number, addresses: Customer['addresses'] | null = []): Customer => ({
    id,
    branchId: 1,
    name: `Cliente sintético ${id}`,
    active: true,
    createdAt: '',
    updatedAt: '',
    ...(addresses === null ? {} : { addresses }),
}) as Customer

function addDraftForCustomer(id: number) {
    const store = useOrdersDraftsStore()
    useOrderTabs().createNewTab()
    const tabId = store.currentTabId!
    store.draftOrders.set(tabId, { ...store.draftOrders.get(tabId)!, customerId: id })
    return store
}

describe('M09-F03: rehydrating customers from persisted POS drafts', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
        requests.getCustomerById.mockReset()
        requests.getCustomerAddresses.mockReset()
        useAuthStore().user = { id: 7, branchId: 1, role: 'Admin' } as never
    })

    it('does not make a second HTTP request for an existing customer with no addresses', async () => {
        requests.getCustomerById.mockResolvedValue({ isSuccess: true, data: customer(10, []) })
        const store = addDraftForCustomer(10)

        await store.rehydrateCustomersFromDrafts()

        expect(requests.getCustomerById).toHaveBeenCalledExactlyOnceWith(10)
        expect(requests.getCustomerAddresses).not.toHaveBeenCalled()
        expect(store.customers.find(c => c.id === 10)?.addresses).toEqual([])
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

        expect(requests.getCustomerAddresses).toHaveBeenCalledExactlyOnceWith(15)
        expect(store.customers.find(c => c.id === 15)?.addresses).toEqual([address])
    })

    it('requests each unique customer once across multiple tabs, with zero extra address requests', async () => {
        requests.getCustomerById.mockImplementation(async (id: number) => ({ isSuccess: true, data: customer(id, []) }))
        const store = addDraftForCustomer(10)
        addDraftForCustomer(10)
        addDraftForCustomer(11)
        addDraftForCustomer(12)

        await store.rehydrateCustomersFromDrafts()

        expect(requests.getCustomerById).toHaveBeenCalledTimes(3)
        expect(requests.getCustomerById.mock.calls.map(call => call[0]).sort()).toEqual([10, 11, 12])
        expect(requests.getCustomerAddresses).not.toHaveBeenCalled()
        expect(store.customers).toHaveLength(3)
    })
})
