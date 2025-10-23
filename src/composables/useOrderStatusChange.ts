import { ref } from 'vue'
import type { OrderListItem, OrderStatus, Order } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { useToast } from '@/composables/useToast'

export function useOrderStatusChange() {
    const permissions = useOrderPermissions()
    const { success, error } = useToast()

    // Estado compartido
    const pendingStatusChange = ref<OrderStatus | null>(null)
    const showAssignDeliveryModal = ref(false)

    /**
     * Valida y ejecuta el cambio de estado
     * Retorna true si se debe abrir modal de domiciliario
     */
    const handleStatusChange = async (
        order: OrderListItem,
        newStatus: OrderStatus,
        onSuccess?: (updatedOrder: Order) => void
    ): Promise<boolean> => {
        // ✅ Validar permisos
        if (!permissions.canChangeStatus(order, newStatus)) {
            error('Sin permisos', 'No tienes permiso para cambiar el estado')
            return false
        }

        // ✅ REGLA: delivery necesita domiciliario antes de on_the_way
        if (
            order.type === 'delivery' &&
            newStatus === 'on_the_way' &&
            !order.deliveryManId
        ) {
            // Guardar estado pendiente y señalar que se debe abrir modal
            pendingStatusChange.value = newStatus
            showAssignDeliveryModal.value = true
            return true // Indica que se debe abrir modal
        }

        // Ejecutar cambio de estado directamente
        await executeStatusChange(order.id, newStatus, onSuccess)
        return false
    }

    /**
     * Ejecuta el cambio de estado
     */
    const executeStatusChange = async (
        orderId: number,
        newStatus: OrderStatus,
        onSuccess?: (updatedOrder: Order) => void
    ): Promise<void> => {
        try {
            const updatedOrder = await orderApi.updateStatus(orderId, newStatus)
            const orderAny = updatedOrder as any
            success(
                'Estado actualizado',
                5000,
                `Pedido cambiado a ${orderAny.statusDisplayName || newStatus}`
            )

            // Limpiar estado pendiente
            pendingStatusChange.value = null
            showAssignDeliveryModal.value = false

            // Callback con el pedido actualizado para actualización optimista
            if (onSuccess) {
                onSuccess(updatedOrder)
            }
        } catch (err: any) {
            error('Error al cambiar estado', err.message)
        }
    }

    /**
     * Limpia el estado pendiente
     */
    const clearPendingStatusChange = () => {
        pendingStatusChange.value = null
        showAssignDeliveryModal.value = false
    }

    return {
        pendingStatusChange,
        showAssignDeliveryModal,
        handleStatusChange,
        executeStatusChange,
        clearPendingStatusChange,
    }
}
