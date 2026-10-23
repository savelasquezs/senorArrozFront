import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderItems } from '../useOrderItems'

const deps = vi.hoisted(() => ({ store: { currentTabId: 'other', draftOrders: new Map<string, any>(), saveToLocalStorage: vi.fn() } }))
vi.mock('@/store/ordersDrafts', () => ({ useOrdersDraftsStore: () => deps.store }))
vi.mock('@/composables/useOrderTabs', () => ({ useOrderTabs: () => ({ createNewTab: vi.fn() }) }))
vi.mock('@/composables/useOrderBenefitResolver', () => ({ useOrderBenefitResolver: () => ({ resolveBenefits: vi.fn() }) }))

describe('product notes in draft tabs', () => {
    beforeEach(() => {
        deps.store.draftOrders.clear()
        deps.store.saveToLocalStorage.mockClear()
        deps.store.draftOrders.set('source', {
            total: 20500, freeDeliveryRequested: true,
            orderItems: [
                { tempId: 'rice', quantity: 2, unitPrice: 10000, discount: 500, freeDeliveryDiscount: 500, subtotal: 19000, notes: 'Original' },
                { tempId: 'gift', quantity: 1, unitPrice: 0, subtotal: 0, isDailyPromotionGift: true, notes: 'Promo' },
            ],
        })
        deps.store.draftOrders.set('other', { orderItems: [{ tempId: 'rice', notes: 'Otra pestaña' }] })
    })

    it.each(['Separar y rotular\nSin salsas', ''])('changes only the chosen note in its originating tab: %s', notes => {
        const before = structuredClone(deps.store.draftOrders.get('source'))
        useOrderItems().updateNotes('rice', notes, 'source')
        const after = deps.store.draftOrders.get('source')
        expect(after).toEqual({ ...before, updatedAt: expect.any(Date), orderItems: [{ ...before.orderItems[0], notes }, before.orderItems[1]] })
        expect(deps.store.draftOrders.get('other').orderItems[0].notes).toBe('Otra pestaña')
        expect(deps.store.saveToLocalStorage).toHaveBeenCalledOnce()
    })

    it('allows a preparation note on a gift without changing the benefit', () => {
        useOrderItems().updateNotes('gift', 'Empacar aparte', 'source')
        expect(deps.store.draftOrders.get('source').orderItems[1]).toEqual({ tempId: 'gift', quantity: 1, unitPrice: 0, subtotal: 0, isDailyPromotionGift: true, notes: 'Empacar aparte' })
    })

    it('reports a removed product instead of saving to another tab', () => {
        expect(() => useOrderItems().updateNotes('missing', 'Nota', 'source')).toThrow('El producto ya no está')
        expect(deps.store.saveToLocalStorage).not.toHaveBeenCalled()
    })
})
