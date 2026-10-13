import { describe, expect, it, vi } from 'vitest'
import { useOrderValidation } from '../useOrderValidation'
import type { DraftOrder } from '@/types/order'

vi.mock('@/store/ordersDrafts', () => ({
    useOrdersDraftsStore: () => ({ currentOrder: null }),
}))

const createDraft = (type: DraftOrder['type'], branchId: number, guestName: string | null): DraftOrder => ({
    type, branchId, workspaceBranchId: 1, guestName,
    customerId: null, addressId: null, reservedFor: null,
    orderItems: [{ productId: 1, quantity: 1, unitPrice: 10000 }],
    bankPayments: [], appPayment: null, total: 10000,
} as unknown as DraftOrder)

describe('pickup name validation for every branch', () => {
    const { validateOrder } = useOrderValidation()

    it.each([1, 2])('rejects onsite pickups without a name for destination branch %i', branchId => {
        const result = validateOrder(createDraft('onsite', branchId, '   '))
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Debe indicar el nombre de quien recoge')
    })

    it.each([1, 2])('accepts unregistered onsite pickup with name at destination branch %i', branchId => {
        const result = validateOrder(createDraft('onsite', branchId, 'Carlos Pérez'))
        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual([])
    })

    it('still requires a customer and address for delivery orders', () => {
        const result = validateOrder(createDraft('delivery', 2, 'Carlos'))
        expect(result.errors).toEqual(expect.arrayContaining([
            'Debe seleccionar un cliente para delivery',
            'Debe seleccionar una dirección para delivery',
        ]))
    })
})
