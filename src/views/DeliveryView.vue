<template>
    <MainLayout>
        <div class="p-3 md:p-6 space-y-4 md:space-y-6">

            <!-- Header -->
            <div class="flex items-center justify-between gap-3">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Domicilios</h1>
                    <p class="text-sm md:text-base text-gray-600 mt-1">Gestión de entregas</p>
                </div>

                <div class="flex items-center gap-2">
                    <div :class="[
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                        isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    ]">
                        <span :class="['w-1.5 h-1.5 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></span>
                        <span class="hidden sm:inline">{{ isConnected ? 'Conectado' : 'Desconectado' }}</span>
                    </div>

                    <BaseButton @click="refreshData" variant="outline" size="sm" :loading="isLoading">
                        <ArrowPathIcon class="w-4 h-4" />
                    </BaseButton>
                </div>
            </div>

            <!-- Acceso rápido: historial vive en el menú lateral (domiciliario) -->
            <div class="flex gap-2 flex-wrap">
                <button
                    @click="goToRoute"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                    <TruckIcon class="w-4 h-4" />
                    En ruta
                    <span v-if="deliveryStore.ordersOnTheWay.length > 0"
                        class="py-0.5 px-1.5 rounded-full text-xs bg-emerald-200 text-emerald-800">
                        {{ deliveryStore.ordersOnTheWay.length }}
                    </span>
                </button>
            </div>

            <!-- Tabs: Disponibles y En preparación (ocultos en vista de ruta) -->
            <template v-if="activeTab !== 'route'">
                <!-- Mobile -->
                <div class="grid grid-cols-3 gap-2 md:hidden">
                    <button @click="activeTab = 'available'" :class="[
                        'py-3 px-4 rounded-lg font-medium text-sm transition-colors text-center',
                        activeTab === 'available' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                    ]">
                        Disponibles
                        <span v-if="deliveryStore.availableOrders.length > 0"
                            class="ml-1.5 py-0.5 px-1.5 rounded-full text-xs"
                            :class="activeTab === 'available' ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'">
                            {{ deliveryStore.availableOrders.length }}
                        </span>
                    </button>

                    <button @click="activeTab = 'preparation'" :class="[
                        'py-3 px-2 rounded-lg font-medium text-sm transition-colors text-center',
                        activeTab === 'preparation' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                    ]">
                        Prep.
                        <span v-if="deliveryStore.preparationOrders.length > 0"
                            class="ml-1 py-0.5 px-1 rounded-full text-[10px] leading-none"
                            :class="activeTab === 'preparation' ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'">
                            {{ deliveryStore.preparationOrders.length }}
                        </span>
                    </button>
                    <button type="button" @click="activeTab = 'analytics'" :class="[
                        'py-3 px-2 rounded-lg font-medium text-sm transition-colors text-center',
                        activeTab === 'analytics' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                    ]">
                        Métricas
                    </button>
                </div>

                <!-- Desktop -->
                <div class="hidden md:block border-b border-gray-200">
                    <nav class="-mb-px flex flex-wrap gap-x-8 gap-y-2">
                        <button @click="activeTab = 'available'" :class="[
                            'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                            activeTab === 'available'
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        ]">
                            Pedidos Disponibles
                            <span v-if="deliveryStore.availableOrders.length > 0"
                                class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600">
                                {{ deliveryStore.availableOrders.length }}
                            </span>
                        </button>

                        <button @click="activeTab = 'preparation'" :class="[
                            'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                            activeTab === 'preparation'
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        ]">
                            En preparación
                            <span v-if="deliveryStore.preparationOrders.length > 0"
                                class="ml-2 py-0.5 px-2 rounded-full text-xs bg-amber-100 text-amber-700">
                                {{ deliveryStore.preparationOrders.length }}
                            </span>
                        </button>
                        <button type="button" @click="activeTab = 'analytics'" :class="[
                            'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                            activeTab === 'analytics'
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        ]">
                            Rendimiento
                        </button>
                    </nav>
                </div>
            </template>

            <!-- Contenido tabs principales -->
            <div v-if="activeTab === 'available'">
                <DeliveryCardGrid ref="cardGridRef" :orders="deliveryStore.availableOrders" @assign="handleAssign" />
            </div>

            <div v-else-if="activeTab === 'preparation'">
                <DeliveryCardGrid :orders="deliveryStore.preparationOrders" :allow-assignment="false" />
            </div>

            <div v-else-if="activeTab === 'analytics'" class="space-y-4">
                <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                    <DashboardPeriodPanel v-model="analyticsDateRange" />
                    <div class="max-w-xs">
                        <label class="block text-xs font-medium text-gray-600 mb-1" for="analytics-branch-filter"
                            >Sucursal (opcional)</label
                        >
                        <select
                            id="analytics-branch-filter"
                            class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            :value="analyticsBranchId === null ? '' : String(analyticsBranchId)"
                            @change="onAnalyticsBranchChange"
                        >
                            <option value="">Todas las sucursales</option>
                            <option
                                v-for="b in historyModalBranchTabs"
                                :key="b.branchId"
                                :value="String(b.branchId)"
                            >
                                {{ b.branchName }}
                            </option>
                        </select>
                        <p class="mt-1 text-[11px] text-gray-500">
                            Mismos atajos de fecha que el dashboard administrativo. Datos solo de tus entregas.
                        </p>
                    </div>
                </div>
                <div
                    v-if="deliveryAnalyticsLoading"
                    class="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
                >
                    Cargando métricas…
                </div>
                <div
                    v-else-if="deliveryAnalyticsError"
                    class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    {{ deliveryAnalyticsError }}
                </div>
                <DeliveryPerformancePanel
                    v-else
                    v-model:branch-id="analyticsBranchId"
                    v-model:delivery-evolution-driver-id="analyticsDriverId"
                    :show-branch-filter="false"
                    :show-driver-filter="false"
                    :show-prep-time-gauge="false"
                    :show-financial-delivery-metrics="false"
                    :date-range-from-sidebar="false"
                    :card-title="'Tu rendimiento'"
                    :branch-options="analyticsBranchOptions"
                    :date-range="analyticsDateRange"
                    :avg-prep-minutes="deliveryAnalyticsResolved.avgPrepMinutes"
                    :avg-delivery-minutes="deliveryAnalyticsResolved.avgDeliveryMinutes"
                    :deliverymen="deliveryAnalyticsResolved.deliverymen"
                    :evolution-labels="deliveryAnalyticsResolved.evolutionLabels"
                    :evolution-data="deliveryAnalyticsResolved.evolutionDeliveries"
                    :evolution-fee-data="deliveryAnalyticsResolved.evolutionFees"
                    :evolution-sales-totals="deliveryAnalyticsResolved.evolutionSalesTotals"
                    :period-fee-to-sales-percent="deliveryAnalyticsResolved.periodFeeToSalesPercent"
                    :route-metrics="deliveryAnalyticsResolved.routeMetrics"
                />
            </div>

            <!-- Vista "En ruta" (scroll vertical si hay muchos pedidos) -->
            <div v-else-if="activeTab === 'route'" class="min-w-0">
                <div class="flex items-center gap-3 mb-4">
                    <button
                        @click="activeTab = 'available'"
                        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeftIcon class="w-4 h-4" />
                        Volver
                    </button>
                    <h2 class="text-base font-semibold text-gray-900">Pedidos en ruta</h2>
                </div>

                <div class="max-h-[min(75vh,42rem)] overflow-y-auto overflow-x-hidden min-w-0 pr-1">
                    <RouteOrderManager
                        :orders="routeOrders"
                        :planning-warnings-text="routePlanningWarningsText"
                        @route-optimized="handleRouteOptimized"
                        @delivered="handleOrderDelivered"
                    />
                </div>
            </div>
        </div>

        <!-- Modal: Mi historial -->
        <BaseDialog v-model="showHistoryModal" title="Mi Historial" size="xl">
            <p class="text-xs text-gray-500 mb-2">
                Pedidos <span class="font-medium text-gray-700">entregados</span> en el rango de fechas (por sucursal).
            </p>
            <div v-if="historyModalBranchTabs.length > 0"
                class="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100 shrink-0">
                <button
                    v-for="b in historyModalBranchTabs"
                    :key="b.branchId"
                    type="button"
                    @click="selectHistoryBranch(b.branchId)"
                    :class="[
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        deliveryStore.historySelectedBranchId === b.branchId
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    ]"
                >
                    {{ b.branchName }}
                    <span
                        :class="[
                            'ml-1.5 text-xs rounded-full px-1.5 py-0.5',
                            deliveryStore.historySelectedBranchId === b.branchId
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-gray-600',
                        ]"
                    >{{ b.orderCount }}</span>
                </button>
            </div>
            <DeliveryHistoryTable
                :orders="deliveryStore.historyOrders"
                :total-count="deliveryStore.historyTotalCount"
                :page="deliveryStore.historyPage"
                :page-size="deliveryStore.historyPageSize"
                :from-date="deliveryStore.historyFromDate"
                :to-date="deliveryStore.historyToDate"
                :neighborhood-id="deliveryStore.historyNeighborhoodId"
                :neighborhood-options="deliveryStore.historyNeighborhoodOptions"
                @page-change="handleHistoryPageChange"
                @filter-change="handleHistoryFilterChange"
                @update:neighborhood-id="handleHistoryNeighborhoodChange"
                @order-delivered="handleOrderDelivered"
            />
        </BaseDialog>

        <ConfirmAssignmentModal
            :is-open="showConfirmModal"
            :orders="ordersToAssign"
            @close="closeConfirmModal"
            @assigned="handleAssigned"
        />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { useSignalR } from '@/composables/useSignalR'
import { useToast } from '@/composables/useToast'
import type { DeliverymanHistoryBranchSummary, OrderListItem } from '@/types/order'
import MainLayout from '@/components/layout/MainLayout.vue'
import DeliveryCardGrid from '@/components/delivery/DeliveryCardGrid.vue'
import DeliveryHistoryTable from '@/components/delivery/DeliveryHistoryTable.vue'
import ConfirmAssignmentModal from '@/components/delivery/ConfirmAssignmentModal.vue'
import RouteOrderManager from '@/components/delivery/RouteOrderManager.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import {
    ArrowPathIcon,
    ArrowLeftIcon,
    TruckIcon,
} from '@heroicons/vue/24/outline'
import {
    defaultDateRangeToday,
    DashboardPeriodPanel,
    DeliveryPerformancePanel,
    type DeliveryBranchOption,
} from '@/components/dashboard'
import { useDeliverySelfAnalytics } from '@/composables/dashboard/useDeliverySelfAnalytics'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const deliveryStore = useDeliveryStore()
const { success, error } = useToast()

const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5000/hubs/orders'
const { isConnected, on } = useSignalR(SIGNALR_HUB_URL)

const activeTab = ref<'available' | 'preparation' | 'analytics' | 'route'>('available')
const isLoading = ref(false)
const showConfirmModal = ref(false)
const showHistoryModal = ref(false)
const ordersToAssign = ref<OrderListItem[]>([])
const routeOrders = ref<OrderListItem[]>([])

/** Misma ruta para todos los pedidos en ruta: un solo bloque de avisos del API. */
const routePlanningWarningsText = computed(
    () =>
        routeOrders.value.find((o) => o.deliveryRoutePlanningWarnings)?.deliveryRoutePlanningWarnings ?? null
)

const cardGridRef = ref<InstanceType<typeof DeliveryCardGrid> | null>(null)

const userBranchId = () => authStore.user?.branchId ?? 0

/**
 * Pestañas por nombre de sucursal. Incluye la sucursal actual del domiciliario aunque no tenga entregas en el rango
 * (para ver lista vacía y mantener la tab por defecto coherente).
 */
const historyModalBranchTabs = computed((): DeliverymanHistoryBranchSummary[] => {
    const summaries = deliveryStore.historyBranchSummaries
    const uid = userBranchId()
    const uname = (authStore.branchName || '').trim() || (uid > 0 ? `Sucursal #${uid}` : '')
    const sorted = [...summaries].sort((a, b) =>
        a.branchName.localeCompare(b.branchName, 'es', { sensitivity: 'base' })
    )
    if (uid > 0 && uname && !sorted.some((s) => s.branchId === uid)) {
        return [{ branchId: uid, branchName: uname, orderCount: 0 }, ...sorted]
    }
    if (sorted.length > 0) return sorted
    if (uid > 0 && uname) return [{ branchId: uid, branchName: uname, orderCount: 0 }]
    return []
})

const analyticsDateRange = ref<[Date, Date]>(defaultDateRangeToday())
const analyticsBranchId = ref<number | null>(null)
const analyticsDriverId = ref<number | 'all'>('all')
const deliveryAnalytics = useDeliverySelfAnalytics(analyticsDateRange, analyticsBranchId)
const deliveryAnalyticsLoading = deliveryAnalytics.loading
const deliveryAnalyticsError = deliveryAnalytics.error
const deliveryAnalyticsResolved = deliveryAnalytics.resolvedPayload

const analyticsBranchOptions = computed((): DeliveryBranchOption[] =>
    historyModalBranchTabs.value.map((b) => ({ id: b.branchId, name: b.branchName })),
)

function onAnalyticsBranchChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value
    analyticsBranchId.value = v === '' ? null : Number(v)
}

// ─── Carga de datos ───────────────────────────────────────────

const loadAvailableOrders = async () => {
    try {
        isLoading.value = true
        await deliveryStore.loadAvailableOrders(authStore.user?.branchId)
    } catch (err: any) {
        error('Error al cargar pedidos disponibles', err.message)
    } finally {
        isLoading.value = false
    }
}

const loadPreparationOrders = async () => {
    try {
        isLoading.value = true
        await deliveryStore.loadPreparationOrders(authStore.user?.branchId)
    } catch (err: any) {
        error('Error al cargar pedidos en preparación', err.message)
    } finally {
        isLoading.value = false
    }
}

/** Historial del modal (resumen por sucursal + listado de la pestaña activa) */
const loadHistoryModal = async (resetTabToLaborBranch = false) => {
    if (!authStore.user?.id) return
    try {
        isLoading.value = true
        await deliveryStore.loadHistory(authStore.user.id, userBranchId(), resetTabToLaborBranch)
    } catch (err: any) {
        error('Error al cargar historial', err.message)
    } finally {
        isLoading.value = false
    }
}

const selectHistoryBranch = async (branchId: number) => {
    if (!authStore.user?.id || deliveryStore.historySelectedBranchId === branchId) return
    try {
        isLoading.value = true
        deliveryStore.setHistoryPage(1)
        await deliveryStore.loadHistoryForBranch(authStore.user.id, branchId)
    } catch (err: any) {
        error('Error al cargar historial', err.message)
    } finally {
        isLoading.value = false
    }
}

/** Pedidos asignados sin filtro de fecha (en ruta, badges) */
const loadRouteAssigned = async () => {
    if (!authStore.user?.id) return
    try {
        await deliveryStore.loadRouteAssignedOrders(authStore.user.id)
    } catch (err: any) {
        error('Error al cargar pedidos en ruta', err.message)
    }
}

// ─── Acciones rápidas ─────────────────────────────────────────

const openHistoryModal = async () => {
    showHistoryModal.value = true
    await loadHistoryModal(false)
}

const goToRoute = async () => {
    activeTab.value = 'route'
    await loadRouteAssigned()
    routeOrders.value = [...deliveryStore.ordersOnTheWay]
}

// ─── SignalR ──────────────────────────────────────────────────

const handleOrderReady = async (orderData: any) => {
    await loadAvailableOrders()
    success('Nuevo pedido disponible', 5000, `Pedido #${orderData.id}`)
}

const handleOrderAssigned = async (_orderData: any) => {
    await loadAvailableOrders()
}

const handleOrderModifiedSignalR = async (payload: any) => {
    const data = payload?.order ?? payload
    const uid = authStore.user?.id
    if (!data?.id || data.deliveryManId == null || uid == null || Number(data.deliveryManId) !== Number(uid)) return

    await loadRouteAssigned()
    if (activeTab.value === 'route') {
        routeOrders.value = [...deliveryStore.ordersOnTheWay]
    }
    const kindLabel =
        payload?.modificationKind === 'schedule'
            ? 'Cambio de horario'
            : payload?.modificationKind === 'content'
              ? 'Cambios en el pedido'
              : 'Actualización'
    success(`${kindLabel}`, 6000, `Pedido #${data.id} — revisa detalles y total`)
}

// ─── Asignación ───────────────────────────────────────────────

const handleAssign = (orderIds: number[]) => {
    ordersToAssign.value = deliveryStore.availableOrders.filter((o: OrderListItem) => orderIds.includes(o.id))
    showConfirmModal.value = true
}

const handleAssigned = async () => {
    await loadAvailableOrders()
    cardGridRef.value?.clearSelection()
    if (authStore.user?.id) {
        await loadRouteAssigned()
        if (showHistoryModal.value) {
            await loadHistoryModal()
        }
        if (activeTab.value === 'route') {
            routeOrders.value = [...deliveryStore.ordersOnTheWay]
        }
    }
}

const closeConfirmModal = () => {
    showConfirmModal.value = false
    ordersToAssign.value = []
}

// ─── Refresco ─────────────────────────────────────────────────

const refreshData = async () => {
    if (activeTab.value === 'available') {
        await loadAvailableOrders()
    } else if (activeTab.value === 'preparation') {
        await loadPreparationOrders()
    } else if (activeTab.value === 'analytics') {
        await deliveryAnalytics.refresh()
    } else if (activeTab.value === 'route') {
        await loadRouteAssigned()
        routeOrders.value = [...deliveryStore.ordersOnTheWay]
    }
}

// ─── Historial ────────────────────────────────────────────────

const handleHistoryPageChange = async (page: number) => {
    if (!authStore.user?.id) return
    deliveryStore.setHistoryPage(page)
    const branchId = deliveryStore.historySelectedBranchId ?? userBranchId()
    try {
        isLoading.value = true
        await deliveryStore.loadHistoryOrders(authStore.user.id, branchId)
    } catch (err: any) {
        error('Error al cargar historial', err.message)
    } finally {
        isLoading.value = false
    }
}

const handleHistoryFilterChange = async (filters: { fromDate: string; toDate: string }) => {
    deliveryStore.setHistoryDateRange(filters.fromDate, filters.toDate)
    deliveryStore.setHistoryPage(1)
    await loadHistoryModal(true)
}

const handleHistoryNeighborhoodChange = async (id: number | null) => {
    if (!authStore.user?.id) return
    deliveryStore.setHistoryNeighborhoodId(id)
    deliveryStore.setHistoryPage(1)
    const branchId = deliveryStore.historySelectedBranchId ?? userBranchId()
    try {
        isLoading.value = true
        await deliveryStore.loadHistoryOrders(authStore.user.id, branchId)
    } catch (err: any) {
        error('Error al cargar historial', err.message)
    } finally {
        isLoading.value = false
    }
}

// ─── En ruta ─────────────────────────────────────────────────

const handleOrderDelivered = async () => {
    await loadRouteAssigned()
    if (showHistoryModal.value) {
        await loadHistoryModal()
    }
    routeOrders.value = [...deliveryStore.ordersOnTheWay]
}

const handleRouteOptimized = (orderIds: number[]) => {
    const idToOrder = new Map(routeOrders.value.map(o => [o.id, o]))
    const reordered: OrderListItem[] = []
    orderIds.forEach(id => {
        const found = idToOrder.get(id)
        if (found) reordered.push(found)
    })
    routeOrders.value.forEach(o => {
        if (!orderIds.includes(o.id)) reordered.push(o)
    })
    routeOrders.value = reordered
}

// ─── Watch tabs ───────────────────────────────────────────────

watch(activeTab, async (newTab) => {
    if (newTab === 'available') {
        await loadAvailableOrders()
    } else if (newTab === 'preparation') {
        await loadPreparationOrders()
    } else if (newTab === 'analytics') {
        await deliveryAnalytics.refresh()
    }
})

/** Abrir historial desde el sidebar (incluye montaje en /delivery con id ya incrementado). */
watch(
    () => deliveryStore.historyModalRequestId,
    async () => {
        if (!authStore.isDeliveryman || route.path !== '/delivery') return
        if (deliveryStore.historyModalRequestId === 0) return
        await openHistoryModal()
    },
    { immediate: true }
)

onMounted(async () => {
    if (
        authStore.userRole !== 'Deliveryman' &&
        authStore.userRole !== 'Admin' &&
        authStore.userRole !== 'Superadmin'
    ) {
        router.push('/')
        return
    }

    await loadAvailableOrders()
    await loadRouteAssigned()
    // Precarga conteo/lista del día para el badge "Mi historial" (mismo rango que el modal)
    if (authStore.user?.id) {
        try {
            await deliveryStore.loadHistory(authStore.user.id, userBranchId(), true)
        } catch {
            /* badge sin datos si falla */
        }
    }
    on('OrderReady', handleOrderReady)
    on('OrderAssigned', handleOrderAssigned)
    on('OrderModified', handleOrderModifiedSignalR)
})
</script>
