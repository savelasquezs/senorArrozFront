// src/store/ordersData.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useCustomersStore } from './customers'
import { orderApi } from '@/services/MainAPI/orderApi'
import { getOrderStatusDisplayName } from '@/composables/useFormatting'
import type {
    Order,
    OrderFilters,
    UpdateOrderDto,
    OrderStatus,
} from '@/types/order'
import type {
    Customer,
} from '@/types/customer'
import type {
    User,
} from '@/types/user'
import type {
    PagedResult,
} from '@/types/common'

export const useOrdersDataStore = defineStore('ordersData', () => {
    // ===== Estado =====
    const list = ref<PagedResult<Order> | null>(null)
    const current = ref<Order | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const customers = ref<Customer[]>([])
    const users = ref<User[]>([])

    // ===== Acciones (COPIAR EXACTO) =====

    // Main CRUD - COPIAR líneas 168-258
    const fetch = async (filters?: OrderFilters) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.getOrders(filters)
            list.value = response as PagedResult<Order>
        } catch (error: any) {
            error.value = error.message || 'Error de conexión'
        } finally {
            isLoading.value = false
        }
    }

    const fetchById = async (id: number) => {
        isLoading.value = true
        error.value = null
        try {
            current.value = await orderApi.getOrderById(id)
        } catch (error: any) {
            error.value = error.message || 'Error de conexión'
        } finally {
            isLoading.value = false
        }
    }

    const update = async (id: number, payload: UpdateOrderDto) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.updateOrder(id, payload)
            console.log('response', response)
            // Update item in list
            if (list.value) {
                const index = list.value.items.findIndex(item => item.id === id)
                if (index !== -1) {
                    // ✅ INCLUIR TOTALES DEL BACKEND
                    list.value.items[index] = {
                        ...list.value.items[index],
                        ...response, // Esto incluye subtotal, discountTotal, total
                        // Mantener campos específicos de la lista si es necesario
                        statusDisplayName: (response as any).statusDisplayName || getOrderStatusDisplayName(response.status)
                    } as any
                }
            }

            // Update current if it's the same order
            if (current.value?.id === id) {
                current.value = response // El backend ya incluye todos los campos
            }

            return response
        } catch (error: any) {
            error.value = error.message || 'Error de conexión'
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const remove = async (id: number) => {
        isLoading.value = true
        error.value = null
        try {
            await orderApi.cancelOrder(id)
            // Remove from list
            if (list.value) {
                list.value.items = list.value.items.filter(item => item.id !== id)
                list.value.totalCount--
            }
            // Clear current if it was the deleted order
            if (current.value?.id === id) {
                current.value = null
            }
        } catch (error: any) {
            error.value = error.message || 'Error de conexión'
            throw error
        } finally {
            isLoading.value = false
        }
    }

    // ✅ NUEVO: Método genérico para actualizar status
    const updateStatus = async (id: number, status: OrderStatus) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.updateStatus(id, status)


            // ✅ Actualización optimista en list
            if (list.value) {
                const index = list.value.items.findIndex(item => item.id === id)
                if (index !== -1) {
                    list.value.items[index] = {
                        ...list.value.items[index],
                        status,
                        statusDisplayName: getOrderStatusDisplayName(status),
                        // ✅ INCLUIR TOTALES SI EL BACKEND LOS DEVUELVE
                        ...(response.subtotal !== undefined && { subtotal: response.subtotal }),
                        ...(response.discountTotal !== undefined && { discountTotal: response.discountTotal }),
                        ...(response.total !== undefined && { total: response.total }),
                        updatedAt: response.updatedAt
                    } as any
                }
            }

            // ✅ Actualización optimista en current
            if (current.value?.id === id) {
                current.value = {
                    ...current.value,
                    status,
                    // ✅ INCLUIR TOTALES SI EL BACKEND LOS DEVUELVE
                    ...(response.subtotal !== undefined && { subtotal: response.subtotal }),
                    ...(response.discountTotal !== undefined && { discountTotal: response.discountTotal }),
                    ...(response.total !== undefined && { total: response.total }),
                    updatedAt: response.updatedAt
                }
            }

            return response
        } catch (err: any) {
            error.value = err.message || 'Error al actualizar estado'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Clear - COPIAR líneas 357-360
    const clear = () => {
        current.value = null
        error.value = null
    }

    // Load data - ADAPTAR
    const loadCustomers = async () => {
        const customersStore = useCustomersStore()
        await customersStore.fetch({ page: 1, pageSize: 1000 })
        customers.value = customersStore.list?.items || []
    }

    const loadUsers = async () => {
        // Implementar si existe userApi
        try {
            // const response = await userApi.getUsers({ page: 1, pageSize: 1000 })
            // users.value = response.data.items
        } catch (err) {
            console.error('Error loading users:', err)
        }
    }

    return {
        // Estado
        list,
        current,
        isLoading,
        error,
        customers,
        users,
        // Acciones
        fetch,
        fetchById,
        update,
        updateStatus, // ✅ NUEVO
        remove,
        clear,
        loadCustomers,
        loadUsers
    }
})
