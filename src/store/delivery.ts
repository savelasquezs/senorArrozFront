// src/store/delivery.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { orderApi } from '@/services/MainAPI/orderApi'
import type { OrderListItem } from '@/types/order'

export const useDeliveryStore = defineStore('delivery', () => {
    // ===== Estado separado para cada vista =====
    const availableOrders = ref<OrderListItem[]>([])
    const availableTotalCount = ref(0)
    const availablePage = ref(1)
    const availablePageSize = ref(100)

    const historyOrders = ref<OrderListItem[]>([])
    const historyTotalCount = ref(0)
    const historyPage = ref(1)
    const historyPageSize = ref(10)

    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // ===== Acciones =====

    // Cargar pedidos disponibles (ready, sin asignar)
    const loadAvailableOrders = async (branchId?: number) => {
        console.log('🔄 Loading available orders...', { branchId })
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.fetchDeliveryReady({
                branchId,
                page: availablePage.value,
                pageSize: availablePageSize.value
            })
            console.log('📦 Available orders received:', response.items.length, response)
            availableOrders.value = response.items
            availableTotalCount.value = response.totalCount
        } catch (err: any) {
            error.value = err.message
            console.error('❌ Error loading available orders:', err)
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Cargar historial (TODOS los estados asignados: ready, on_the_way, delivered)
    const loadHistory = async (deliveryManId: number) => {
        isLoading.value = true
        error.value = null
        try {
            // Usar fetchAssignedOrders que trae TODOS los estados
            const response = await orderApi.fetchAssignedOrders(deliveryManId, {
                page: historyPage.value,
                pageSize: historyPageSize.value
            })
            // Ordenar por ID descendente (más recientes primero)
            historyOrders.value = [...response.items].sort((a, b) => b.id - a.id)
            historyTotalCount.value = response.totalCount
        } catch (err: any) {
            error.value = err.message
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Asignar pedidos (actualización optimista)
    const assignOrders = async (orderIds: number[], password: string) => {
        isLoading.value = true
        error.value = null
        try {
            const assigned = await orderApi.selfAssignOrders({ orderIds, password })

            // Remover pedidos asignados de lista disponible
            availableOrders.value = availableOrders.value.filter(o => !orderIds.includes(o.id))
            availableTotalCount.value -= assigned.length

            return assigned
        } catch (err: any) {
            error.value = err.message
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Actualizar paginación
    const setHistoryPage = (page: number) => {
        historyPage.value = page
    }

    // Limpiar estado
    const clear = () => {
        availableOrders.value = []
        availableTotalCount.value = 0
        historyOrders.value = []
        historyTotalCount.value = 0
        error.value = null
    }

    return {
        // Estado
        availableOrders,
        availableTotalCount,
        historyOrders,
        historyTotalCount,
        historyPage,
        historyPageSize,
        isLoading,
        error,

        // Acciones
        loadAvailableOrders,
        loadHistory,
        assignOrders,
        setHistoryPage,
        clear
    }
})

