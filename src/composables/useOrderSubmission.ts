// src/composables/useOrderSubmission.ts
import { useAuthStore } from '@/store/auth'
import { useOrdersStore } from '@/store/orders'
import type { DraftOrder, CreateOrderDto, CreateOrderDetailDto, CreateBankPaymentDto, CreateAppPaymentDto } from '@/types/order'

export function useOrderSubmission() {
    const authStore = useAuthStore()
    const ordersStore = useOrdersStore()

    /**
     * Transform DraftOrder to CreateOrderDto for backend submission
     */
    const transformDraftToCreateDto = (draft: DraftOrder): CreateOrderDto => {
        // Get user and branch info
        const takenById = authStore.user?.id
        const branchId = authStore.branchId

        if (!takenById || !branchId) {
            throw new Error('Usuario o sucursal no disponible')
        }

        // Transform order items to orderDetails
        const orderDetails: CreateOrderDetailDto[] = draft.orderItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            notes: item.notes || undefined
        }))

        // Transform bank payments
        const bankPayments: CreateBankPaymentDto[] | undefined =
            draft.bankPayments.length > 0
                ? draft.bankPayments.map(bp => ({
                    bankId: bp.bankId,
                    amount: bp.amount
                }))
                : undefined

        // Transform app payment (max 1)
        const appPayments: CreateAppPaymentDto[] | undefined =
            draft.appPayment
                ? [{
                    appId: draft.appPayment.appId,
                    amount: draft.appPayment.amount
                }]
                : undefined

        // Build the DTO
        const dto: CreateOrderDto = {
            branchId,
            takenById,
            type: draft.type,
            notes: draft.notes || undefined,
            guestName: draft.guestName || undefined,
            orderDetails,
            bankPayments,
            appPayments
        }

        // Add optional fields based on order type
        if (draft.customerId) {
            dto.customerId = draft.customerId
        }

        if (draft.addressId && draft.type === 'delivery') {
            dto.addressId = draft.addressId
        }

        if (draft.deliveryFee && draft.type === 'delivery') {
            dto.deliveryFee = draft.deliveryFee
        }

        if (draft.reservedFor && draft.type === 'reservation') {
            dto.reservedFor = draft.reservedFor
        }

        return dto
    }

    /**
     * Submit the current draft order
     */
    const submitOrder = async (draft: DraftOrder) => {
        const dto = transformDraftToCreateDto(draft)
        const createdOrder = await ordersStore.create(dto)
        return createdOrder
    }

    return {
        transformDraftToCreateDto,
        submitOrder
    }
}

