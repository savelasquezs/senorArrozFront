import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrdersDataStore } from '../ordersData'
import type { OrderDetailView, OrderListItem, OrderStatus } from '@/types/order'
import type { Order } from '@/types/order'
import type { PagedResult } from '@/types/common'

const { orderApiMock } = vi.hoisted(() => ({
    orderApiMock: {
        getOrders: vi.fn(),
        fetchDetail: vi.fn(),
        updateOrder: vi.fn(),
        cancelOrder: vi.fn(),
        updateStatus: vi.fn(),
        fetchDeliveryReady: vi.fn(),
        selfAssignOrders: vi.fn(),
        fetchAssignedOrders: vi.fn(),
        searchOrders: vi.fn(),
    },
}))

vi.mock('@/services/MainAPI/orderApi', () => ({
    orderApi: orderApiMock,
}))

const makeListItem = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
    id: 1,
    branchId: 1,
    branchName: 'Centro',
    takenById: 1,
    takenByName: 'Cajero',
    customerId: 10,
    customerName: 'Ana',
    customerPhone: '300',
    addressId: 1,
    addressDescription: 'Calle 1',
    neighborhoodId: 1,
    neighborhoodName: 'Centro',
    deliveryManId: null,
    deliveryManName: null,
    guestName: null,
    type: 'delivery',
    typeDisplayName: 'Domicilio',
    deliveryFee: 2000,
    reservedFor: null,
    prepareAt: null,
    status: 'taken',
    statusDisplayName: 'Tomado',
    statusTimes: {},
    subtotal: 10000,
    total: 12000,
    discountTotal: 0,
    notes: null,
    cancelledReason: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    bankPayments: [],
    appPayments: [],
    totalDeposited: 0,
    ...overrides,
})

const makeDetail = (overrides: Partial<OrderDetailView> = {}): OrderDetailView => ({
    ...makeListItem(),
    orderDetails: [],
    ...overrides,
})

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 1,
    branchId: 1,
    branchName: 'Centro',
    takenById: 1,
    takenByName: 'Cajero',
    type: 'delivery',
    status: 'in_preparation',
    orderDetails: [],
    bankPayments: [],
    appPayments: [],
    subtotal: 10000,
    discountTotal: 0,
    total: 12000,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
})

describe('ordersData store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('fetches and stores the orders list', async () => {
        const store = useOrdersDataStore()
        const item = makeListItem()
        const payload: PagedResult<OrderListItem> = {
            items: [item],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        orderApiMock.getOrders.mockResolvedValue(payload as unknown as Awaited<ReturnType<typeof orderApiMock.getOrders>>)

        await store.fetch({ page: 1, pageSize: 10 })

        expect(store.list).toEqual(payload)
    })

    it('fetchById stores current detail', async () => {
        const store = useOrdersDataStore()
        const detail = makeDetail({ id: 5 })
        orderApiMock.fetchDetail.mockResolvedValue(detail)

        await store.fetchById(5)

        expect(store.current).toEqual(detail)
    })

    it('update merges list row and refreshes current via fetchDetail', async () => {
        const store = useOrdersDataStore()
        const existing = makeListItem({ id: 7, total: 1000 })
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        const detail = makeDetail({ id: 7, total: 2500 })
        store.current = detail

        const apiOrder = makeOrder({ id: 7, status: 'in_preparation', total: 2500 })
        orderApiMock.updateOrder.mockResolvedValue(apiOrder)
        orderApiMock.fetchDetail.mockResolvedValue({ ...detail, total: 2500 })

        await store.update(7, { notes: 'ok' } as never)

        expect(store.list?.items[0].total).toBe(2500)
        expect(store.list?.items[0].status).toBe('in_preparation')
        expect(orderApiMock.fetchDetail).toHaveBeenCalledWith(7)
        expect(store.current?.total).toBe(2500)
    })

    it('update keeps isLoading false (silent by default)', async () => {
        const store = useOrdersDataStore()
        store.list = {
            items: [makeListItem()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        orderApiMock.updateOrder.mockResolvedValue(makeOrder())
        orderApiMock.fetchDetail.mockResolvedValue(makeDetail())

        expect(store.isLoading).toBe(false)
        await store.update(1, {} as never)
        expect(store.isLoading).toBe(false)
    })

    it('remove cancels order, drops list row and clears current', async () => {
        const store = useOrdersDataStore()
        const row = makeListItem()
        store.list = {
            items: [row],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = makeDetail({ id: row.id })
        orderApiMock.cancelOrder.mockResolvedValue('ok')

        await store.remove(row.id)

        expect(store.list?.items).toEqual([])
        expect(store.list?.totalCount).toBe(0)
        expect(store.current).toBeNull()
    })

    it('updateStatus patches list and current', async () => {
        const store = useOrdersDataStore()
        const row = makeListItem({ status: 'ready' as OrderStatus })
        store.list = {
            items: [row],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = makeDetail({ id: 1, status: 'ready' as OrderStatus })
        orderApiMock.updateStatus.mockResolvedValue(
            makeOrder({ status: 'on_the_way', updatedAt: '2026-01-03T00:00:00Z' })
        )

        await store.updateStatus(1, 'on_the_way')

        expect(store.list?.items[0].status).toBe('on_the_way')
        expect(store.current?.status).toBe('on_the_way')
    })
})
