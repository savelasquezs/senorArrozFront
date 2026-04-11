// src/store/delivery.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { orderApi } from '@/services/MainAPI/orderApi'
import { deliverymanApi } from '@/services/MainAPI/deliverymanApi'
import type {
    DeliverymanHistoryBranchSummary,
    DeliverymanHistoryNeighborhood,
    OrderListItem,
} from '@/types/order'

/** Historial del modal: solo pedidos entregados (enum API .NET) */
const HISTORY_STATUS_DELIVERED = 'Delivered'

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

    /** Pestañas por sucursal (historial con fechas) */
    const historyBranchSummaries = ref<DeliverymanHistoryBranchSummary[]>([])
    const historySelectedBranchId = ref<number | null>(null)
    /** Filtro y opciones de barrio (historial; alineadas al periodo y sucursal activa) */
    const historyNeighborhoodId = ref<number | null>(null)
    const historyNeighborhoodOptions = ref<DeliverymanHistoryNeighborhood[]>([])

    /** Pedidos asignados sin filtro de fecha — para "En ruta" y contadores */
    const routeAssignedOrders = ref<OrderListItem[]>([])

    /** Incrementa al pedir "Mi historial" desde el sidebar (DeliveryView reacciona y abre el modal). */
    const historyModalRequestId = ref(0)

    const isLoading = ref(false)
    const error = ref<string | null>(null)

    /** Día bloqueado (liquidación total) según API; solo aplica a domiciliario. */
    const myDayBlocked = ref(false)

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

    const historyBadgeCount = computed(() =>
        historyBranchSummaries.value.reduce((acc, s) => acc + s.orderCount, 0)
    )

    /** Resumen por sucursal para el mismo rango de fechas del historial */
    const loadHistoryBranchSummaries = async (deliveryManId: number) => {
        const rows = await orderApi.fetchAssignedOrdersBranchSummary(deliveryManId, {
            fromDate: historyFromDate.value,
            toDate: historyToDate.value,
            status: HISTORY_STATUS_DELIVERED,
            includeOnsiteActiveInHistory: true,
        })
        historyBranchSummaries.value = rows
    }

    const loadHistoryNeighborhoods = async (deliveryManId: number, branchId: number) => {
        const rows = await orderApi.fetchDeliverymanHistoryNeighborhoods(deliveryManId, {
            fromDate: historyFromDate.value,
            toDate: historyToDate.value,
            branchId,
            status: HISTORY_STATUS_DELIVERED,
        })
        historyNeighborhoodOptions.value = rows
        if (
            historyNeighborhoodId.value != null &&
            !rows.some((r) => r.id === historyNeighborhoodId.value)
        ) {
            historyNeighborhoodId.value = null
        }
    }

    function resolveHistoryBranchId(userBranchId: number, resetTab: boolean): number {
        const summaries = historyBranchSummaries.value
        if (
            !resetTab &&
            historySelectedBranchId.value != null &&
            summaries.some((s) => s.branchId === historySelectedBranchId.value)
        ) {
            return historySelectedBranchId.value
        }
        if (summaries.some((s) => s.branchId === userBranchId)) return userBranchId
        if (summaries.length > 0) return summaries[0].branchId
        return userBranchId
    }

    /** Lista paginada del historial para la sucursal activa en pestaña */
    const loadHistoryOrders = async (deliveryManId: number, branchId: number) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.fetchAssignedOrders(deliveryManId, {
                page: historyPage.value,
                pageSize: historyPageSize.value,
                fromDate: historyFromDate.value,
                toDate: historyToDate.value,
                branchId,
                status: HISTORY_STATUS_DELIVERED,
                includeOnsiteActiveInHistory: true,
                neighborhoodId: historyNeighborhoodId.value ?? undefined,
            })
            historySelectedBranchId.value = branchId
            historyOrders.value = [...response.items].sort((a, b) => b.id - a.id)
            historyTotalCount.value = response.totalCount
        } catch (err: any) {
            error.value = err.message
            throw err
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Carga resumen + listado del historial.
     * @param resetTab Si true (cambio de fechas), vuelve a la sucursal de trabajo si tiene datos; si no, a la primera con datos.
     */
    const loadHistory = async (deliveryManId: number, userBranchId: number, resetTab = false) => {
        error.value = null
        try {
            if (resetTab) historyNeighborhoodId.value = null
            await loadHistoryBranchSummaries(deliveryManId)
            const branchId = resolveHistoryBranchId(userBranchId, resetTab)
            await loadHistoryNeighborhoods(deliveryManId, branchId)
            await loadHistoryOrders(deliveryManId, branchId)
        } catch (err: any) {
            error.value = err.message
            throw err
        }
    }

    /** Solo cambiar sucursal (pestaña); mantiene fechas y reinicia a página 1 antes de llamar desde la vista */
    const loadHistoryForBranch = async (deliveryManId: number, branchId: number) => {
        historyNeighborhoodId.value = null
        await loadHistoryNeighborhoods(deliveryManId, branchId)
        await loadHistoryOrders(deliveryManId, branchId)
    }

    /** Sin rango de fechas: incluye pedidos en ruta aunque CreatedAt sea de otro día */
    const loadMyDayState = async () => {
        try {
            const r = await deliverymanApi.getMyDayState()
            myDayBlocked.value = r.dayBlocked
        } catch {
            myDayBlocked.value = false
        }
    }

    const loadRouteAssignedOrders = async (deliveryManId: number) => {
        isLoading.value = true
        error.value = null
        try {
            const response = await orderApi.fetchAssignedOrders(deliveryManId, {
                page: 1,
                pageSize: 200,
                status: 'OnTheWay',
                type: 'Delivery',
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

    const setHistoryNeighborhoodId = (id: number | null) => {
        historyNeighborhoodId.value = id
    }

    const requestHistoryModalFromSidebar = () => {
        historyModalRequestId.value += 1
    }

    // Limpiar estado
    const clear = () => {
        availableOrders.value = []
        availableTotalCount.value = 0
        preparationOrders.value = []
        preparationTotalCount.value = 0
        historyOrders.value = []
        historyTotalCount.value = 0
        historyBranchSummaries.value = []
        historySelectedBranchId.value = null
        historyNeighborhoodId.value = null
        historyNeighborhoodOptions.value = []
        historyModalRequestId.value = 0
        routeAssignedOrders.value = []
        historyFromDate.value = localDateString()
        historyToDate.value = localDateString()
        error.value = null
        myDayBlocked.value = false
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
        historyBranchSummaries,
        historySelectedBranchId,
        historyNeighborhoodId,
        historyNeighborhoodOptions,
        historyBadgeCount,
        historyModalRequestId,
        routeAssignedOrders,
        isLoading,
        error,
        myDayBlocked,

        // Acciones
        loadMyDayState,
        loadAvailableOrders,
        loadPreparationOrders,
        loadHistory,
        loadHistoryOrders,
        loadHistoryNeighborhoods,
        loadHistoryForBranch,
        loadRouteAssignedOrders,
        assignOrders,
        setHistoryPage,
        setHistoryDateRange,
        setHistoryNeighborhoodId,
        requestHistoryModalFromSidebar,
        clear,
        ordersOnTheWay
    }
})

