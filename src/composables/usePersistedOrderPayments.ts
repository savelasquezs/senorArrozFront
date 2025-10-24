import { computed } from 'vue'
import type { Ref } from 'vue'
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi'
import { appPaymentApi } from '@/services/MainAPI/appPaymentApi'
import { useToast } from '@/composables/useToast'
import type { OrderDetailView } from '@/types/order'

export function usePersistedOrderPayments(
    order: Ref<OrderDetailView | null>,
    onUpdate: (updatedOrder: Partial<OrderDetailView>) => void
) {
    const { success, error } = useToast()

    // Computed - Calcular totales
    const totalBankPayments = computed(() => {
        if (!order.value) return 0
        return order.value.bankPayments.reduce((sum, p) => sum + p.amount, 0)
    })

    const totalAppPayments = computed(() => {
        if (!order.value) return 0
        return order.value.appPayments.reduce((sum, p) => sum + p.amount, 0)
    })

    const totalPayments = computed(() => totalBankPayments.value + totalAppPayments.value)

    const cashAmount = computed(() => {
        if (!order.value) return 0
        return Math.max(0, order.value.total - totalPayments.value)
    })

    const canAddPayments = computed(() => cashAmount.value > 0)

    const hasSinglePayment = computed(() => {
        if (!order.value) return false
        return (order.value.bankPayments.length + order.value.appPayments.length) === 1
    })

    // Calcular monto sugerido (primer pago = total, subsecuentes = restante)
    const getSuggestedAmount = () => {
        if (!order.value) return 0
        const paymentsCount = order.value.bankPayments.length + order.value.appPayments.length
        return paymentsCount === 0 ? order.value.total : cashAmount.value
    }

    // CRUD App Payments
    const addAppPayment = async (appId: number, amount: number) => {
        if (!order.value) return null

        if (order.value.appPayments.length > 0) {
            error('Límite alcanzado', 'Solo se permite un pago por app por pedido')
            return null
        }

        try {
            const created = await appPaymentApi.createAppPayment({
                orderId: order.value.id,
                appId,
                amount
            })

            success('Pago agregado', 5000, 'Pago por app agregado exitosamente')

            // Actualización optimista
            onUpdate({
                appPayments: [...order.value.appPayments, created as any]
            })

            return created
        } catch (err: any) {
            error('Error', err.message)
            return null
        }
    }

    const updateAppPayment = async (paymentId: number, amount: number) => {
        if (!order.value) return null

        try {
            const updated = await appPaymentApi.update(paymentId, amount)
            success('Pago actualizado', 5000, 'Monto actualizado exitosamente')

            // Actualización optimista
            const newPayments = order.value.appPayments.map(p =>
                p.id === paymentId ? updated as any : p
            )
            onUpdate({ appPayments: newPayments })

            return updated
        } catch (err: any) {
            error('Error', err.message)
            return null
        }
    }

    const removeAppPayment = async (paymentId: number) => {
        if (!order.value) return false

        try {
            await appPaymentApi.deletePayment(paymentId)
            success('Pago eliminado', 5000, 'Pago por app eliminado')

            // Actualización optimista
            onUpdate({
                appPayments: order.value.appPayments.filter(p => p.id !== paymentId)
            })

            return true
        } catch (err: any) {
            error('Error', err.message)
            return false
        }
    }

    // CRUD Bank Payments
    const addBankPayment = async (bankId: number, amount: number) => {
        if (!order.value) return null

        try {
            const created = await bankPaymentApi.createBankPayment({
                orderId: order.value.id,
                bankId,
                amount
            })

            success('Pago agregado', 5000, 'Pago bancario agregado exitosamente')

            // Actualización optimista
            onUpdate({
                bankPayments: [...order.value.bankPayments, created as any]
            })

            return created
        } catch (err: any) {
            error('Error', err.message)
            return null
        }
    }

    const updateBankPayment = async (paymentId: number, amount: number) => {
        if (!order.value) return null

        try {
            const updated = await bankPaymentApi.update(paymentId, amount)
            success('Pago actualizado', 5000, 'Monto actualizado exitosamente')

            // Actualización optimista
            const newPayments = order.value.bankPayments.map(p =>
                p.id === paymentId ? updated as any : p
            )
            onUpdate({ bankPayments: newPayments })

            return updated
        } catch (err: any) {
            error('Error', err.message)
            return null
        }
    }

    const removeBankPayment = async (paymentId: number) => {
        if (!order.value) return false

        try {
            await bankPaymentApi.deletePayment(paymentId)
            success('Pago eliminado', 5000, 'Pago bancario eliminado')

            // Actualización optimista
            onUpdate({
                bankPayments: order.value.bankPayments.filter(p => p.id !== paymentId)
            })

            return true
        } catch (err: any) {
            error('Error', err.message)
            return false
        }
    }

    // Auto-ajuste de pago único cuando cambia el total
    const autoAdjustSinglePayment = async () => {
        if (!order.value || !hasSinglePayment.value) return

        // Caso 1: Es un bank payment
        if (order.value.bankPayments.length === 1) {
            const payment = order.value.bankPayments[0]
            await updateBankPayment(payment.id, order.value.total)
        }

        // Caso 2: Es un app payment
        if (order.value.appPayments.length === 1) {
            const payment = order.value.appPayments[0]
            await updateAppPayment(payment.id, order.value.total)
        }
    }

    return {
        totalBankPayments,
        totalAppPayments,
        totalPayments,
        cashAmount,
        canAddPayments,
        hasSinglePayment,
        getSuggestedAmount,
        addAppPayment,
        updateAppPayment,
        removeAppPayment,
        addBankPayment,
        updateBankPayment,
        removeBankPayment,
        autoAdjustSinglePayment,
    }
}
