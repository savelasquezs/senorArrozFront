import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCustomersStore } from '../customers'
import type { Customer, CustomerAddress, Neighborhood } from '@/types/customer'
import type { ApiResponse, PagedResult } from '@/types/common'

const { customerApiMock } = vi.hoisted(() => ({
    customerApiMock: {
        getCustomers: vi.fn(),
        getCustomerById: vi.fn(),
        getCustomerByPhone: vi.fn(),
        createCustomer: vi.fn(),
        updateCustomer: vi.fn(),
        deleteCustomer: vi.fn(),
        getCustomerAddresses: vi.fn(),
        getCustomerAddressById: vi.fn(),
        createCustomerAddress: vi.fn(),
        updateCustomerAddress: vi.fn(),
        deleteCustomerAddress: vi.fn(),
        setPrimaryAddress: vi.fn(),
        getNeighborhoods: vi.fn(),
        createNeighborhood: vi.fn(),
    },
}))

vi.mock('@/services/MainAPI/customerApi', () => ({
    customerApi: customerApiMock,
}))

const makeCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    id: 1,
    branchId: 1,
    branchName: 'Centro',
    name: 'Laura Perez',
    email: 'laura@example.com',
    phone1: '3001234567',
    phone2: null,
    addressCount: 1,
    orderCount: 3,
    totalSpent: 150000,
    lastOrderAt: '2026-01-01T00:00:00Z',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
})

const makeAddress = (overrides: Partial<CustomerAddress> = {}): CustomerAddress => ({
    id: 1,
    customerId: 1,
    neighborhoodId: 1,
    neighborhoodName: 'Centro',
    description: 'Calle 1 #2-3',
    additionalInfo: null,
    deliveryFee: 3000,
    latitude: 4.61,
    longitude: -74.08,
    isPrimary: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
})

const makeNeighborhood = (overrides: Partial<Neighborhood> = {}): Neighborhood => ({
    id: 1,
    branchId: 1,
    name: 'Centro',
    deliveryFee: 3000,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
})

describe('customers store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('fetches and stores the customer list', async () => {
        const store = useCustomersStore()
        const payload: PagedResult<Customer> = {
            items: [makeCustomer()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        customerApiMock.getCustomers.mockResolvedValue({
            data: payload,
        } satisfies ApiResponse<PagedResult<Customer>>)

        await store.fetch({ page: 1, pageSize: 10 })

        expect(store.list).toEqual(payload)
        expect(store.error).toBeNull()
    })

    it('creates a customer and prepends it to the paged list', async () => {
        const store = useCustomersStore()
        store.list = {
            items: [makeCustomer()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        const created = makeCustomer({ id: 2, name: 'Carlos Diaz' })
        customerApiMock.createCustomer.mockResolvedValue({
            data: created,
        } satisfies ApiResponse<Customer>)

        const result = await store.create({ name: 'Carlos Diaz' } as never)

        expect(result).toEqual(created)
        expect(store.list.items[0]).toEqual(created)
        expect(store.list.totalCount).toBe(2)
    })

    it('updates the current customer and replaces it in the list', async () => {
        const store = useCustomersStore()
        const existing = makeCustomer()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = existing

        const updated = makeCustomer({ name: 'Laura Gomez' })
        customerApiMock.updateCustomer.mockResolvedValue({
            data: updated,
        } satisfies ApiResponse<Customer>)

        const result = await store.update(existing.id, { name: 'Laura Gomez' } as never)

        expect(result).toEqual(updated)
        expect(store.current).toEqual(updated)
        expect(store.list.items[0]).toEqual(updated)
    })

    it('removes a customer from the list and clears current when needed', async () => {
        const store = useCustomersStore()
        const existing = makeCustomer()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = existing

        customerApiMock.deleteCustomer.mockResolvedValue({
            data: 'ok',
        } satisfies ApiResponse<string>)

        await store.remove(existing.id)

        expect(store.list.items).toEqual([])
        expect(store.list.totalCount).toBe(0)
        expect(store.current).toBeNull()
    })

    it('loads addresses and updates the local address list', async () => {
        const store = useCustomersStore()
        const address = makeAddress()

        customerApiMock.getCustomerAddresses.mockResolvedValue({
            data: [address],
        } satisfies ApiResponse<CustomerAddress[]>)

        await store.fetchAddresses(1)

        expect(store.addresses).toEqual([address])
        expect(store.currentAddresses).toEqual([address])
    })

    it('sets the primary address locally after the API call', async () => {
        const store = useCustomersStore()
        const first = makeAddress({ id: 1, isPrimary: true })
        const second = makeAddress({ id: 2, isPrimary: false, description: 'Calle 5 #6-7' })
        store.addresses = [first, second]

        const updatedPrimary = { ...second, isPrimary: true }
        customerApiMock.setPrimaryAddress.mockResolvedValue({
            data: updatedPrimary,
        } satisfies ApiResponse<CustomerAddress>)

        const result = await store.setPrimaryAddress(1, 2)

        expect(result).toEqual(updatedPrimary)
        expect(store.addresses[0].isPrimary).toBe(false)
        expect(store.addresses[1]).toEqual(updatedPrimary)
    })

    it('loads neighborhoods only once through ensureNeighborhoodsLoaded', async () => {
        const store = useCustomersStore()
        const neighborhoods = [makeNeighborhood()]
        customerApiMock.getNeighborhoods.mockResolvedValue({
            data: neighborhoods,
        } satisfies ApiResponse<Neighborhood[]>)

        await store.ensureNeighborhoodsLoaded()
        await store.ensureNeighborhoodsLoaded()

        expect(customerApiMock.getNeighborhoods).toHaveBeenCalledTimes(1)
        expect(store.availableNeighborhoods).toEqual(neighborhoods)
    })

    it('stores the API error message on failure', async () => {
        const store = useCustomersStore()
        customerApiMock.getCustomers.mockRejectedValue(new Error('fallo clientes'))

        await expect(store.fetch()).rejects.toThrow('fallo clientes')
        expect(store.error).toBe('fallo clientes')
        expect(store.isLoading).toBe(false)
    })
})
