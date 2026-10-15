import { describe, expect, it } from 'vitest'
import type { OrderDetailItem } from '@/types/order'
import { syncKitchenPageDetails } from '../kitchenPageDetails'

const line = (quantity: number, notes = '') => ({
    id: 10, orderId: 7, productId: 3, productName: 'Arroz',
    productDescription: null, quantity, unitPrice: 15000, discount: 0,
    subtotal: 15000, notes, productCategoryName: 'Arroces',
    createdAt: '', updatedAt: '',
}) satisfies OrderDetailItem

describe('syncKitchenPageDetails', () => {
    it('returns no HTTP fallback IDs for an embedded page and updates stale cache', () => {
        const cache = new Map<number, OrderDetailItem[]>([[7, [line(1, 'old')]]])
        expect(syncKitchenPageDetails([
            { id: 7, kitchenDetails: [line(3, 'no onion')] },
            { id: 8, kitchenDetails: [] },
        ], cache)).toEqual([])
        expect(cache.get(7)).toEqual([line(3, 'no onion')])
        expect(cache.get(8)).toEqual([])
    })

    it('falls back only for legacy orders missing from the cache, without duplicates', () => {
        const cache = new Map<number, OrderDetailItem[]>([[7, [line(1)]]])
        expect(syncKitchenPageDetails([
            { id: 7 },
            { id: 9 },
            { id: 9, kitchenDetails: null },
        ], cache)).toEqual([9])
    })

    it('does not reuse obsolete lines when API explicitly returns an empty array', () => {
        const cache = new Map<number, OrderDetailItem[]>([[7, [line(1)]]])
        expect(syncKitchenPageDetails([{ id: 7, kitchenDetails: [] }], cache)).toEqual([])
        expect(cache.get(7)).toEqual([])
    })
})
