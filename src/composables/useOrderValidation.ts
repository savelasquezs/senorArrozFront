// src/composables/useOrderValidation.ts
import { computed, type ComputedRef } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { DraftOrder, ValidationResult } from '@/types/order'
import { sumOrderNonCashPayments } from '@/utils/orderCashToCollect'

export type UseOrderValidationReturn = {
    validateOrder: (order: DraftOrder) => ValidationResult
    isOrderValid: ComputedRef<boolean>
    orderErrors: ComputedRef<string[]>
    canSubmitOrder: ComputedRef<boolean>
    calculateTotalPayments: (order: DraftOrder) => number
}

export function useOrderValidation(): UseOrderValidationReturn {
    const ordersStore = useOrdersDraftsStore()

    /** Siempre el pedido activo del tab; no usar snapshot del setup (rompía la reactividad). */
    const currentOrder = computed(() => ordersStore.currentOrder)

    const validateOrder = (order: DraftOrder): ValidationResult => {
        const errors: string[] = []

        // Validaciones comunes a todos los tipos
        if (order.orderItems.length === 0) {
            errors.push('Debe agregar al menos un producto')
        }

        // Validaciones por tipo de orden
        if (order.type === 'delivery') {
            if (!order.customerId) {
                errors.push('Debe seleccionar un cliente para delivery')
            }
            if (!order.addressId) {
                errors.push('Debe seleccionar una dirección para delivery')
            }
        }

        if (order.type === 'reservation') {
            if (!order.reservedFor) {
                errors.push('Debe especificar fecha/hora de entrega para reserva')
            }
        }

        // Validación de guestName para delivery y reservation
        const requiresGuestName = order.type === 'delivery' || order.type === 'reservation'
        if (requiresGuestName && !order.guestName?.trim()) {
            errors.push('El nombre de quien recibe es obligatorio para pedidos de domicilio y reservaciones')
        }

        // Validaciones de pagos
        const totalPayments = calculateTotalPayments(order)
        if (totalPayments > order.total) {
            errors.push('El total de pagos excede el total del pedido')
        }

        return {
            isValid: errors.length === 0,
            errors,
        }
    }

    const calculateTotalPayments = (order: DraftOrder): number =>
        sumOrderNonCashPayments({
            bankPayments: order.bankPayments,
            appPayment: order.appPayment,
        })

    const isOrderValid = computed(() => {
        if (!currentOrder.value) return false
        return validateOrder(currentOrder.value).isValid
    })

    const orderErrors = computed(() => {
        if (!currentOrder.value) return []
        return validateOrder(currentOrder.value).errors
    })

    const canSubmitOrder = computed(() => {
        if (!currentOrder.value) return false
        const validation = validateOrder(currentOrder.value)
        return validation.isValid && currentOrder.value.orderItems.length > 0
    })

    return {
        validateOrder,
        isOrderValid,
        orderErrors,
        canSubmitOrder,
        calculateTotalPayments,
    }
}
