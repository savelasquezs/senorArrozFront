import { describe, expect, it } from 'vitest'
import type { OrderListItem } from '@/types/order'
import { deliverymenFromCompleteOrderPage } from '../orderDeliverymenOptions'

const allOrdersBody = {
    page: 1, pageSize: 100, sortBy: 'id', sortOrder: 'desc',
    excludeFutureReservations: true, appPaymentsUnsettledOnly: false,
    fromDate: '2026-10-12', toDate: '2026-10-12',
}
const order = (id: number, type: OrderListItem['type'], deliveryManId: number | null,
    deliveryManName: string | null = null) =>
    ({ id, type, deliveryManId, deliveryManName }) as OrderListItem

describe('deliverymenFromCompleteOrderPage', () => {
    it('reuses complete unfiltered local and remote pages without losing drivers', () => {
        const response = {
            items: [
                order(10, 'delivery', 8, 'Luis'), order(11, 'onsite', null),
                order(12, 'delivery', 7, 'Andrés'), order(13, 'delivery', 8, 'Luis'),
                order(14, 'delivery', null),
            ],
            totalCount: 5,
        }
        const expected = [{ value: 7, label: 'Andrés' }, { value: 8, label: 'Luis' }]
        expect(deliverymenFromCompleteOrderPage(allOrdersBody, response)).toEqual(expected)
        expect(deliverymenFromCompleteOrderPage({
            ...allOrdersBody, remoteOnly: true, branchId: 2,
        }, response)).toEqual(expected)
    })

    it('returns an empty list for an entirely loaded tab with no assigned drivers', () => {
        expect(deliverymenFromCompleteOrderPage(allOrdersBody, {
            items: [order(10, 'onsite', null)],
            totalCount: 1,
        })).toEqual([])
        expect(deliverymenFromCompleteOrderPage(allOrdersBody, {
            items: [], totalCount: 0,
        })).toEqual([])
    })

    it('falls back when additional pages might contain other deliverymen', () => {
        expect(deliverymenFromCompleteOrderPage(allOrdersBody, {
            items: [order(10, 'delivery', 8)],
            totalCount: 101,
        })).toBeNull()
        expect(deliverymenFromCompleteOrderPage({ ...allOrdersBody, page: 2 }, {
            items: [order(10, 'delivery', 8)],
            totalCount: 1,
        })).toBeNull()
    })

    it.each([
        { status: 'delivered' }, { type: 'onsite' },
        { searchTerm: 'Cliente' }, { totalDigitsPrefix: '20' },
        { deliveryManId: 8 }, { bankId: 7 }, { appId: 5 },
        { appPaymentsUnsettledOnly: true }, { transferVerificationMode: true },
        { neighborhoodId: 2 }, { minAmount: 3000 },
        { customerId: 4 }, { reservedFromDate: '2026-10-12' },
    ])('preserves exhaustive driver search whenever the main query is filtered: %o', filter => {
        expect(deliverymenFromCompleteOrderPage({
            ...allOrdersBody, ...filter,
        }, { items: [order(10, 'delivery', 8)], totalCount: 1 })).toBeNull()
    })

    it('uses a fallback label for assigned drivers with no display name', () => {
        expect(deliverymenFromCompleteOrderPage(allOrdersBody, {
            items: [order(10, 'delivery', 9, ' ')], totalCount: 1,
        })).toEqual([{ value: 9, label: 'Domiciliario #9' }])
    })
})
