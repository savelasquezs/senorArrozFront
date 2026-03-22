// src/store/delivery.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { orderApi } from '@/services/MainAPI/orderApi'
import type { OrderListItem } from '@/types/order'

/** Fecha local YYYY-MM-DD (no UTC) para alinear con el calendario del domiciliario */
function localDateString(d = new Date()): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export const useDeliveryStore = defineStore('delivery', () => {
    // ===== Estado separado para cada vista =====
    const availableOrders = ref<OrderListItem[]>([])
    const availableTotalCount = ref(0)
    const availablePage = ref(1)
    const availablePageSize = ref(100)

    const preparationOrders = ref<OrderListItem[]>([])
    const preparationTotalCount = ref(0)
    const preparationPage = ref(1)
    const preparationPageSize = ref(100)

    const historyOrders = ref<OrderListItem[]>([])
    const historyTotalCount = ref(0)
    const historyPage = ref(1)
    const historyPageSize = ref(100)
    /** Rango del modal "Mi historial" (por defecto: hoy local) */
    const historyFromDate = ref(localDateString())
    const historyToDate = ref(localDateString())

    /** Pedidos asignados sin filtro de fecha — para "En ruta" y contadores */
    const routeAssignedOrders = ref<OrderListItem[]>([])

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

    // Cargar pedidos en preparación (solo lectura para domiciliarios)
    const loadPreparationOrders = async (branchId?: number) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.searchOrders({
                branchId,
                type: 'delivery',
                status: 'in_preparation',
                page: preparationPage.value,
                pageSize: preparationPageSize.value
            })
            preparationOrders.value = response.items
            preparationTotalCount.value = response.totalCount
        } catch (err: any) {
            error.value = err.message
            throw err
        } finally {
            isLoading.value = false
        }
    }

    // Historial del modal: filtrado por historyFromDate / historyToDate (default hoy)
    const loadHistory = async (deliveryManId: number) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.fetchAssignedOrders(deliveryManId, {
                page: historyPage.value,
                pageSize: historyPageSize.value,
                fromDate: historyFromDate.value,
                toDate: historyToDate.value,
            })
            historyOrders.value = [...response.items].sort((a, b) => b.id - a.id)
            historyTotalCount.value = response.totalCount
        } catch (err: any) {
            error.value = err.message
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /** Sin rango de fechas: incluye pedidos en ruta aunque CreatedAt sea de otro día */
    const loadRouteAssignedOrders = async (deliveryManId: number) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.fetchAssignedOrders(deliveryManId, {
                page: 1,
                pageSize: 200,
            })
            routeAssignedOrders.value = [...response.items].sort((a, b) => b.id - a.id)
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

    const setHistoryDateRange = (from: string, to: string) => {
        historyFromDate.value = from
        historyToDate.value = to
    }

    // Limpiar estado
    const clear = () => {
        availableOrders.value = []
        availableTotalCount.value = 0
        preparationOrders.value = []
        preparationTotalCount.value = 0
        historyOrders.value = []
        historyTotalCount.value = 0
        routeAssignedOrders.value = []
        historyFromDate.value = localDateString()
        historyToDate.value = localDateString()
        error.value = null
    }

    // Pedidos en camino (lista sin filtro de fecha)
    const ordersOnTheWay = computed(() =>
        routeAssignedOrders.value.filter((o) => o.status === 'on_the_way' || (o as any).status === 'onTheWay')
    )

    return {
        // Estado
        availableOrders,
        availableTotalCount,
        preparationOrders,
        preparationTotalCount,
        historyOrders,
        historyTotalCount,
        historyPage,
        historyPageSize,
        historyFromDate,
        historyToDate,
        routeAssignedOrders,
        isLoading,
        error,

        // Acciones
        loadAvailableOrders,
        loadPreparationOrders,
        loadHistory,
        loadRouteAssignedOrders,
        assignOrders,
        setHistoryPage,
        setHistoryDateRange,
        clear,
        ordersOnTheWay
    }
})

