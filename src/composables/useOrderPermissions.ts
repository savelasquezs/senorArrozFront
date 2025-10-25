// src/composables/useOrderPermissions.ts
import { useAuthStore } from '@/store/auth'
import type { OrderListItem, OrderStatus, OrderType } from '@/types/order'

/**
 * Composable para manejar permisos de pedidos basados en rol y fecha
 */
export function useOrderPermissions() {
    const authStore = useAuthStore()

    /**
     * Verifica si el pedido fue creado el mismo día (hora local de Colombia)
     */
    const isSameDay = (orderDate: string): boolean => {
        const orderCreated = new Date(orderDate)
        const today = new Date()

        return (
            orderCreated.getFullYear() === today.getFullYear() &&
            orderCreated.getMonth() === today.getMonth() &&
            orderCreated.getDate() === today.getDate()
        )
    }

    /**
     * Verifica si el usuario puede editar datos básicos del pedido
     */
    const canEditOrder = (order: OrderListItem): boolean => {
        const { userRole } = authStore

        // Superadmin puede todo
        if (userRole === 'Superadmin') return true

        // Pedidos cancelados: solo Superadmin
        if (order.status === 'cancelled') return false

        // Admin: puede editar si es mismo día cuando está entregado
        if (userRole === 'Admin') {
            if (order.status === 'delivered') {
                return isSameDay(order.createdAt)
            }
            return true
        }

        // Cashier: solo puede editar pedidos NO entregados
        if (userRole === 'Cashier') {
            return order.status !== 'delivered'
        }

        return false
    }

    /**
     * Verifica si el usuario puede editar productos del pedido
     */
    const canEditProducts = (order: OrderListItem): boolean => {
        const { userRole } = authStore

        // Superadmin puede todo
        if (userRole === 'Superadmin') return true

        // Pedidos cancelados: solo Superadmin
        if (order.status === 'cancelled') return false

        // Admin: puede editar productos si es mismo día cuando está entregado
        if (userRole === 'Admin') {
            if (order.status === 'delivered') {
                return isSameDay(order.createdAt)
            }
            return true
        }

        // Cashier: NO puede modificar productos si está entregado
        if (userRole === 'Cashier') {
            return order.status !== 'delivered'
        }

        return false
    }

    /**
     * Verifica si el usuario puede editar pagos del pedido
     */
    const canEditPayments = (order: OrderListItem): boolean => {
        const { userRole } = authStore

        // Superadmin puede modificar pagos sin restricciones
        if (userRole === 'Superadmin') return true

        // Admin y Cashier: solo pueden modificar pagos del mismo día
        if (userRole === 'Admin' || userRole === 'Cashier') {
            return isSameDay(order.createdAt)
        }

        return false
    }

    /**
     * Verifica si el usuario puede verificar pagos bancarios
     */
    const canVerifyPayments = (): boolean => {
        const { userRole } = authStore
        return userRole === 'Superadmin' || userRole === 'Admin'
    }

    /**
     * Verifica si el usuario puede liquidar app payments
     */
    const canSettleAppPayments = (): boolean => {
        const { userRole } = authStore
        return userRole === 'Superadmin' || userRole === 'Admin'
    }

    /**
     * Verifica si el usuario puede cancelar el pedido
     */
    const canCancel = (order: OrderListItem): boolean => {
        const { userRole } = authStore

        // Solo Admin y Superadmin pueden cancelar
        if (userRole !== 'Admin' && userRole !== 'Superadmin') return false

        // Solo se pueden cancelar pedidos del mismo día
        return isSameDay(order.createdAt)
    }

    /**
     * Obtiene el siguiente estado permitido según el estado actual y tipo de pedido
     * Devuelve null si no hay siguiente estado o si el usuario no tiene permisos
     */
    const getNextAllowedStatus = (
        currentStatus: OrderStatus,
        orderType: OrderType
    ): OrderStatus | null => {
        const { userRole } = authStore

        // Pedidos cancelados o entregados no pueden avanzar
        if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
            return null
        }

        // Mapeo de transiciones según tipo de pedido
        const transitions: Record<OrderStatus, OrderStatus | null> = {
            taken: 'in_preparation',
            in_preparation: 'ready',
            ready: orderType === 'onsite' ? 'delivered' : 'on_the_way', // onsite salta on_the_way
            on_the_way: 'delivered',
            delivered: null,
            cancelled: null,
        }

        const nextStatus = transitions[currentStatus]
        if (!nextStatus) return null

        // Kitchen solo puede avanzar hasta ready
        if (userRole === 'Kitchen') {
            if (currentStatus === 'in_preparation') {
                return 'ready' // Kitchen solo: in_preparation -> ready
            }
            return null // Kitchen no puede cambiar otros estados
        }

        // Deliveryman solo puede cambiar ready->on_the_way y on_the_way->delivered
        if (userRole === 'Deliveryman') {
            if (currentStatus === 'ready' && nextStatus === 'on_the_way') {
                return 'on_the_way'
            }
            if (currentStatus === 'on_the_way' && nextStatus === 'delivered') {
                return 'delivered'
            }
            return null
        }

        // Cashier puede avanzar hacia adelante pero no retroceder
        // (esto se maneja en canChangeStatus)

        return nextStatus
    }

    /**
     * Verifica si el usuario puede cambiar el pedido a un nuevo estado
     */
    const canChangeStatus = (order: OrderListItem, newStatus: OrderStatus): boolean => {
        const { userRole } = authStore
        const currentStatus = order.status

        // Superadmin puede cambiar a cualquier estado (incluso retroceder)
        if (userRole === 'Superadmin') return true

        // No se puede cambiar desde cancelled o delivered (excepto Superadmin)
        if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
            return false
        }

        // Admin puede cambiar a cualquier estado (excepto desde cancelled/delivered)
        if (userRole === 'Admin') return true

        // Kitchen solo puede cambiar entre taken, in_preparation y ready
        if (userRole === 'Kitchen') {
            const allowedTransitions = [
                ['taken', 'in_preparation'],
                ['in_preparation', 'ready'],
            ]
            return allowedTransitions.some(
                ([from, to]) => from === currentStatus && to === newStatus
            )
        }

        // Deliveryman solo puede cambiar ready->on_the_way y on_the_way->delivered
        if (userRole === 'Deliveryman') {
            const allowedTransitions = [
                ['ready', 'on_the_way'],
                ['on_the_way', 'delivered'],
            ]
            return allowedTransitions.some(
                ([from, to]) => from === currentStatus && to === newStatus
            )
        }

        // Cashier solo puede avanzar hacia adelante (no retroceder)
        if (userRole === 'Cashier') {
            const statusOrder: OrderStatus[] = [
                'taken',
                'in_preparation',
                'ready',
                'on_the_way',
                'delivered',
            ]
            const currentIndex = statusOrder.indexOf(currentStatus)
            const newIndex = statusOrder.indexOf(newStatus)

            // Solo puede avanzar, no retroceder
            return newIndex > currentIndex
        }

        return false
    }

    /**
     * Obtiene todos los estados a los que se puede transicionar desde el estado actual
     */
    const getAllowedStatusTransitions = (currentStatus: OrderStatus): OrderStatus[] => {
        const { userRole } = authStore
        const allStatuses: OrderStatus[] = [
            'taken',
            'in_preparation',
            'ready',
            'on_the_way',
            'delivered',
        ]

        // Superadmin puede ir a cualquier estado
        if (userRole === 'Superadmin') {
            return allStatuses.filter((s) => s !== currentStatus)
        }

        // Pedidos cancelados o entregados no pueden cambiar (excepto Superadmin)
        if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
            return []
        }

        // Admin puede ir a cualquier estado (excepto desde cancelled/delivered)
        if (userRole === 'Admin') {
            return allStatuses.filter((s) => s !== currentStatus)
        }

        // Kitchen solo puede ir a in_preparation y ready
        if (userRole === 'Kitchen') {
            if (currentStatus === 'taken') return ['in_preparation']
            if (currentStatus === 'in_preparation') return ['ready']
            return []
        }

        // Cashier solo puede avanzar hacia adelante
        if (userRole === 'Cashier') {
            const statusOrder: OrderStatus[] = [
                'taken',
                'in_preparation',
                'ready',
                'on_the_way',
                'delivered',
            ]
            const currentIndex = statusOrder.indexOf(currentStatus)
            return statusOrder.filter((_, index) => index > currentIndex)
        }

        return []
    }

    return {
        isSameDay,
        canEditOrder,
        canEditProducts,
        canEditPayments,
        canVerifyPayments,
        canSettleAppPayments,
        canChangeStatus,
        canCancel,
        getNextAllowedStatus,
        getAllowedStatusTransitions,
    }
}

