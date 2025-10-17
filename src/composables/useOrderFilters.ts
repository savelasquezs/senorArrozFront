// src/composables/useOrderFilters.ts
import type { OrderListItem, OrderType, OrderStatus } from '@/types/order'

/**
 * Estado de filtros para órdenes
 */
export interface OrderFilterState {
    search: string
    type: OrderType | null
    status: OrderStatus | null
    customer: string
    deliveryman: string
}

/**
 * Composable para filtrar órdenes localmente
 */
export function useOrderFilters() {
    /**
     * Filtra órdenes por búsqueda general
     * Busca en: ID, nombre cliente, teléfono cliente, guestName
     */
    const filterBySearch = (orders: OrderListItem[], query: string): OrderListItem[] => {
        if (!query.trim()) return orders

        const searchLower = query.toLowerCase().trim()

        return orders.filter((order) => {
            // Buscar en ID
            if (order.id.toString().includes(searchLower)) return true

            // Buscar en nombre de cliente
            if (order.customerName?.toLowerCase().includes(searchLower)) return true

            // Buscar en teléfono de cliente
            if (order.customerPhone?.toLowerCase().includes(searchLower)) return true

            // Buscar en guestName
            if (order.guestName?.toLowerCase().includes(searchLower)) return true

            return false
        })
    }

    /**
     * Filtra órdenes por tipo de pedido
     */
    const filterByType = (orders: OrderListItem[], type: OrderType | null): OrderListItem[] => {
        if (!type) return orders
        return orders.filter((order) => order.type === type)
    }

    /**
     * Filtra órdenes por estado
     */
    const filterByStatus = (
        orders: OrderListItem[],
        status: OrderStatus | null
    ): OrderListItem[] => {
        if (!status) return orders
        return orders.filter((order) => order.status === status)
    }

    /**
     * Filtra órdenes por nombre de cliente
     */
    const filterByCustomer = (orders: OrderListItem[], customerName: string): OrderListItem[] => {
        if (!customerName.trim()) return orders

        const searchLower = customerName.toLowerCase().trim()

        return orders.filter((order) => {
            if (order.customerName?.toLowerCase().includes(searchLower)) return true
            if (order.guestName?.toLowerCase().includes(searchLower)) return true
            return false
        })
    }

    /**
     * Filtra órdenes por nombre de domiciliario
     */
    const filterByDeliveryman = (
        orders: OrderListItem[],
        deliverymanName: string
    ): OrderListItem[] => {
        if (!deliverymanName.trim()) return orders

        const searchLower = deliverymanName.toLowerCase().trim()

        return orders.filter((order) => {
            return order.deliveryManName?.toLowerCase().includes(searchLower) || false
        })
    }

    /**
     * Aplica todos los filtros al mismo tiempo
     */
    const applyAllFilters = (
        orders: OrderListItem[],
        filters: OrderFilterState
    ): OrderListItem[] => {
        let filtered = orders

        // Aplicar búsqueda general
        if (filters.search) {
            filtered = filterBySearch(filtered, filters.search)
        }

        // Aplicar filtro de tipo
        if (filters.type) {
            filtered = filterByType(filtered, filters.type)
        }

        // Aplicar filtro de estado
        if (filters.status) {
            filtered = filterByStatus(filtered, filters.status)
        }

        // Aplicar filtro de cliente
        if (filters.customer) {
            filtered = filterByCustomer(filtered, filters.customer)
        }

        // Aplicar filtro de domiciliario
        if (filters.deliveryman) {
            filtered = filterByDeliveryman(filtered, filters.deliveryman)
        }

        return filtered
    }

    /**
     * Ordena órdenes por una columna específica
     */
    const sortOrders = (
        orders: OrderListItem[],
        sortBy: 'id' | 'total' | 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc'
    ): OrderListItem[] => {
        return [...orders].sort((a, b) => {
            let comparison = 0

            switch (sortBy) {
                case 'id':
                    comparison = a.id - b.id
                    break
                case 'total':
                    comparison = a.total - b.total
                    break
                case 'createdAt':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
            }

            return sortOrder === 'asc' ? comparison : -comparison
        })
    }

    return {
        filterBySearch,
        filterByType,
        filterByStatus,
        filterByCustomer,
        filterByDeliveryman,
        applyAllFilters,
        sortOrders,
    }
}

