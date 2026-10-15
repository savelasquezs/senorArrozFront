import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrderSubmission } from '@/composables/useOrderSubmission'
import { useAuthStore } from '@/store/auth'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
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
        freeDeliveryRequested: false,
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
                freeDeliveryDiscount: 0,
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

    it('permite enviar un borrador para una sucursal distinta a la del usuario', () => {
        const { transformDraftToCreateDto } = useOrderSubmission()

        const dto = transformDraftToCreateDto(minimalDraft({ branchId: 12 }))

        expect(dto.branchId).toBe(12)
        expect(dto.takenById).toBe(99)
        expect(useAuthStore().branchId).toBe(5)
    })

    it('envía discount en línea como manual + domicilio gratis', () => {
        const { transformDraftToCreateDto } = useOrderSubmission()
        const dto = transformDraftToCreateDto(
            minimalDraft({
                orderItems: [
                    {
                        tempId: 'x',
                        productId: 1,
                        productName: 'P',
                        productPrice: 10000,
                        quantity: 1,
                        unitPrice: 10000,
                        discount: 500,
                        freeDeliveryDiscount: 1500,
                        subtotal: 8000,
                        notes: '',
                    },
                ],
            })
        )
        expect(dto.orderDetails[0]?.discount).toBe(2000)
    })

    it('reuses the same persisted POS UUID after ambiguous failed HTTP response', async () => {
        const store = useOrdersDraftsStore()
        const draft = minimalDraft({ posCreationKey: undefined })
        store.draftOrders.set(draft.tabId, draft)
        const send = vi.spyOn(store, 'create')
            .mockRejectedValueOnce(new Error('HTTP 409'))
            .mockResolvedValueOnce({ id: 700 } as any)
        const { submitOrder } = useOrderSubmission()

        await expect(submitOrder(draft)).rejects.toThrow('HTTP 409')
        const key = draft.posCreationKey
        expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
        expect(localStorage.getItem('senor-arroz-draft-orders')).toContain(key)

        await submitOrder(draft)
        expect(send).toHaveBeenCalledTimes(2)
        expect(send.mock.calls[0]![0].posCreationKey).toBe(key)
        expect(send.mock.calls[1]![0].posCreationKey).toBe(key)
        expect(store.ensurePosCreationKey(draft.tabId)).toBe(key)
    })

    it('assigns independent UUIDs to separate drafts and preserves an existing UUID', () => {
        const store = useOrdersDraftsStore()
        store.draftOrders.set('t1', minimalDraft({ tabId: 't1' }))
        store.draftOrders.set('t2', minimalDraft({ tabId: 't2' }))
        const first = store.ensurePosCreationKey('t1')
        const second = store.ensurePosCreationKey('t2')
        expect(first).not.toBe(second)
        expect(store.ensurePosCreationKey('t1')).toBe(first)
        const { transformDraftToCreateDto } = useOrderSubmission()
        expect(transformDraftToCreateDto(store.draftOrders.get('t1')!).posCreationKey).toBe(first)
    })

})
