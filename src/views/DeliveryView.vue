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

            <!-- Accesos rápidos debajo del título -->
            <div class="flex gap-2 flex-wrap">
                <button
                    @click="openHistoryModal"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                    <ClipboardDocumentListIcon class="w-4 h-4" />
                    Mi historial
                    <span v-if="deliveryStore.historyTotalCount > 0"
                        class="py-0.5 px-1.5 rounded-full text-xs bg-blue-200 text-blue-800">
                        {{ deliveryStore.historyTotalCount }}
                    </span>
                </button>

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

            <DeliveryBranchContactCard v-if="authStore.isDeliveryman" />

            <!-- Tabs: Disponibles y En preparación (ocultos en vista de ruta) -->
            <template v-if="activeTab !== 'route'">
                <!-- Mobile -->
                <div class="grid grid-cols-2 gap-2 md:hidden">
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
                        'py-3 px-4 rounded-lg font-medium text-sm transition-colors text-center',
                        activeTab === 'preparation' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                    ]">
                        En preparación
                        <span v-if="deliveryStore.preparationOrders.length > 0"
                            class="ml-1.5 py-0.5 px-1.5 rounded-full text-xs"
                            :class="activeTab === 'preparation' ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'">
                            {{ deliveryStore.preparationOrders.length }}
                        </span>
                    </button>
                </div>

                <!-- Desktop -->
                <div class="hidden md:block border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8">
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
                        @route-optimized="handleRouteOptimized"
                        @delivered="handleOrderDelivered"
                    />
                </div>
            </div>
        </div>

        <!-- Modal: Mi historial -->
        <BaseDialog v-model="showHistoryModal" title="Mi Historial" size="xl">
            <DeliveryHistoryTable
                :orders="deliveryStore.historyOrders"
                :total-count="deliveryStore.historyTotalCount"
                :page="deliveryStore.historyPage"
                :page-size="deliveryStore.historyPageSize"
                :from-date="deliveryStore.historyFromDate"
                :to-date="deliveryStore.historyToDate"
                @page-change="handleHistoryPageChange"
                @filter-change="handleHistoryFilterChange"
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
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useDeliveryStore } from '@/store/delivery'
import { useSignalR } from '@/composables/useSignalR'
import { useToast } from '@/composables/useToast'
import type { OrderListItem } from '@/types/order'
import MainLayout from '@/components/layout/MainLayout.vue'
import DeliveryCardGrid from '@/components/delivery/DeliveryCardGrid.vue'
import DeliveryHistoryTable from '@/components/delivery/DeliveryHistoryTable.vue'
import ConfirmAssignmentModal from '@/components/delivery/ConfirmAssignmentModal.vue'
import RouteOrderManager from '@/components/delivery/RouteOrderManager.vue'
import DeliveryBranchContactCard from '@/components/delivery/DeliveryBranchContactCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import {
    ArrowPathIcon,
    ArrowLeftIcon,
    ClipboardDocumentListIcon,
    TruckIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const deliveryStore = useDeliveryStore()
const { success, error } = useToast()

const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5000/hubs/orders'
const { isConnected, on } = useSignalR(SIGNALR_HUB_URL)

const activeTab = ref<'available' | 'preparation' | 'route'>('available')
const isLoading = ref(false)
const showConfirmModal = ref(false)
const showHistoryModal = ref(false)
const ordersToAssign = ref<OrderListItem[]>([])
const routeOrders = ref<OrderListItem[]>([])

const cardGridRef = ref<InstanceType<typeof DeliveryCardGrid> | null>(null)

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

/** Historial del modal (filtrado por fechas en el store) */
const loadHistoryModal = async () => {
    if (!authStore.user?.id) return
    try {
        isLoading.value = true
        await deliveryStore.loadHistory(authStore.user.id)
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
    await loadHistoryModal()
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
    } else if (activeTab.value === 'route') {
        await loadRouteAssigned()
        routeOrders.value = [...deliveryStore.ordersOnTheWay]
    }
}

// ─── Historial ────────────────────────────────────────────────

const handleHistoryPageChange = async (page: number) => {
    deliveryStore.setHistoryPage(page)
    await loadHistoryModal()
}

const handleHistoryFilterChange = async (filters: {
    fromDate: string
    toDate: string
    neighborhoodId: number | null
}) => {
    deliveryStore.setHistoryDateRange(filters.fromDate, filters.toDate)
    deliveryStore.setHistoryPage(1)
    await loadHistoryModal()
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
    }
})

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
            await deliveryStore.loadHistory(authStore.user.id)
        } catch {
            /* badge sin datos si falla */
        }
    }
    on('OrderReady', handleOrderReady)
    on('OrderAssigned', handleOrderAssigned)
})
</script>
