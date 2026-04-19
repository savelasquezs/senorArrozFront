import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrderSubmission } from '@/composables/useOrderSubmission'
import { useAuthStore } from '@/store/auth'
import { UserRole } from '@/types/auth'
import type { DraftOrder } from '@/types/order'

function minimalDraft(overrides: Partial<DraftOrder>): DraftOrder {
    const now = new Date()
    return {
        tabId: 't1',
        tabName: 'Pedido 1',
        type: 'onsite',
        customerId: null,
        customerName: null,
        customerPhone: null,
        guestName: 'Test',
        addressId: null,
        addressDescription: null,
        deliveryFee: 0,
        reservedFor: null,
        prepareAt: null,
        isLater: false,
        notes: '',
        orderItems: [
            {
                tempId: 'x',
                productId: 1,
                productName: 'P',
                productPrice: 1000,
                quantity: 1,
                unitPrice: 1000,
                discount: 0,
                subtotal: 1000,
                notes: '',
            },
        ],
        bankPayments: [],
        appPayment: null,
        subtotal: 1000,
        total: 1000,
        discountTotal: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    }
}

describe('useOrderSubmission', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        const auth = useAuthStore()
        auth.user = {
            id: 99,
            name: 'Test',
            email: 't@test.com',
            phone: '',
            active: true,
            role: UserRole.CASHIER,
            branchId: 5,
            branchName: 'S1',
        }
    })

    it('incluye addressId y deliveryFee cuando reserva tiene dirección seleccionada', () => {
        const { transformDraftToCreateDto } = useOrderSubmission()
        const reservedFor = new Date('2026-05-01T18:00:00.000Z')
        const dto = transformDraftToCreateDto(
            minimalDraft({
                type: 'reservation',
                customerId: 10,
                addressId: 42,
                deliveryFee: 3500,
                reservedFor,
                guestName: 'Ana',
            })
        )

        expect(dto.type).toBe('reservation')
        expect(dto.addressId).toBe(42)
        expect(dto.deliveryFee).toBe(3500)
        expect(dto.reservedFor).toEqual(reservedFor)
    })

    it('no incluye addressId ni deliveryFee en reserva sin dirección', () => {
        const { transformDraftToCreateDto } = useOrderSubmission()
        const reservedFor = new Date('2026-05-01T18:00:00.000Z')
        const dto = transformDraftToCreateDto(
            minimalDraft({
                type: 'reservation',
                guestName: 'Ana',
                reservedFor,
                addressId: null,
                deliveryFee: 0,
            })
        )

        expect(dto.type).toBe('reservation')
        expect(dto.addressId).toBeUndefined()
        expect(dto.deliveryFee).toBeUndefined()
    })
})
