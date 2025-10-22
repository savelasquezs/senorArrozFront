// src/composables/useOrderValidation.ts
import { computed } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { DraftOrder, ValidationResult } from '@/types/order'

export function useOrderValidation(order?: DraftOrder) {
    const ordersStore = useOrdersDraftsStore()

    const currentOrder = computed(() => order || ordersStore.currentOrder)

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
            errors
        }
    }

    const calculateTotalPayments = (order: DraftOrder): number => {
        const bankTotal = order.bankPayments.reduce((sum, payment) => sum + payment.amount, 0)
        const appTotal = order.appPayment ? order.appPayment.amount : 0
        return bankTotal + appTotal
    }

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
        calculateTotalPayments
    }
}
