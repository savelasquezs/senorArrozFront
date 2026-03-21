// src/composables/useOrderFilters.ts
import type { OrderListItem, OrderType, OrderStatus } from '@/types/order'

/**
 * Estado de filtros para órdenes (filtros locales sobre la página cargada).
 * bankId se aplica en el servidor vía searchOrders, no aquí.
 */
export interface OrderFilterState {
    search: string
    type: OrderType | null
    status: OrderStatus | null
    customer: string
}

/**
 * Composable para filtrar órdenes localmente
 */
export function useOrderFilters() {
    const filterBySearch = (orders: OrderListItem[], query: string): OrderListItem[] => {
        if (!query.trim()) return orders

        const searchLower = query.toLowerCase().trim()

        return orders.filter((order) => {
            if (order.id.toString().includes(searchLower)) return true
            if (order.customerName?.toLowerCase().includes(searchLower)) return true
            if (order.customerPhone?.toLowerCase().includes(searchLower)) return true
            if (order.guestName?.toLowerCase().includes(searchLower)) return true
            return false
        })
    }

    const filterByType = (orders: OrderListItem[], type: OrderType | null): OrderListItem[] => {
        if (!type) return orders
        return orders.filter((order) => order.type === type)
    }

    const filterByStatus = (
        orders: OrderListItem[],
        status: OrderStatus | null
    ): OrderListItem[] => {
        if (!status) return orders
        return orders.filter((order) => order.status === status)
    }

    const filterByCustomer = (orders: OrderListItem[], customerName: string): OrderListItem[] => {
        if (!customerName.trim()) return orders

        const searchLower = customerName.toLowerCase().trim()

        return orders.filter((order) => {
            if (order.customerName?.toLowerCase().includes(searchLower)) return true
            if (order.guestName?.toLowerCase().includes(searchLower)) return true
            return false
        })
    }

    const applyAllFilters = (
        orders: OrderListItem[],
        filters: OrderFilterState
    ): OrderListItem[] => {
        let filtered = orders

        if (filters.search) {
            filtered = filterBySearch(filtered, filters.search)
        }

        if (filters.type) {
            filtered = filterByType(filtered, filters.type)
        }

        if (filters.status) {
            filtered = filterByStatus(filtered, filters.status)
        }

        if (filters.customer) {
            filtered = filterByCustomer(filtered, filters.customer)
        }

        return filtered
    }

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
        applyAllFilters,
        sortOrders,
    }
}
