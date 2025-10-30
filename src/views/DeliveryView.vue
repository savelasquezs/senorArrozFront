<template>
    <MainLayout>
        <div class="p-3 md:p-6 space-y-4 md:space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Domicilios</h1>
                    <p class="text-sm md:text-base text-gray-600 mt-1">Gestión de entregas</p>
                </div>

                <div class="hidden md:flex items-center gap-4">
                    <div :class="[
                        'flex items-center gap-2 px-3 py-1 rounded-lg text-sm',
                        isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    ]">
                        <span :class="['w-2 h-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></span>
                        {{ isConnected ? 'Conectado' : 'Desconectado' }}
                    </div>

                    <BaseButton @click="refreshData" variant="outline" size="sm" :loading="isLoading">
                        <span class="flex items-center gap-2">
                            <ArrowPathIcon class="w-4 h-4" />
                            Actualizar
                        </span>
                    </BaseButton>
                </div>

                <!-- Mobile: Status indicador pequeño -->
                <div class="md:hidden flex items-center gap-2">
                    <div :class="[
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                        isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    ]">
                        <span :class="['w-1.5 h-1.5 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></span>
                        {{ isConnected ? 'Conectado' : 'Desconectado' }}
                    </div>
                </div>
            </div>

            <!-- Mobile: Tabs en grid -->
            <div class="grid grid-cols-3 gap-2 md:hidden">
                <button @click="activeTab = 'available'" :class="[
                    'py-3 px-4 rounded-lg font-medium text-sm transition-colors text-center',
                    activeTab === 'available'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                ]">
                    <span>Disponibles</span>
                    <span v-if="deliveryStore.availableOrders.length > 0"
                        class="ml-2 py-0.5 px-2 rounded-full text-xs bg-white/20 text-white">
                        {{ deliveryStore.availableOrders.length }}
                    </span>
                </button>

                <button @click="activeTab = 'history'" :class="[
                    'py-3 px-4 rounded-lg font-medium text-sm transition-colors text-center',
                    activeTab === 'history'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                ]">
                    Historial
                    <span v-if="deliveryStore.historyTotalCount > 0"
                        class="ml-2 py-0.5 px-2 rounded-full text-xs bg-white/20 text-white">
                        {{ deliveryStore.historyTotalCount }}
                    </span>
                </button>
                <button @click="activeTab = 'map'" :class="[
                    'py-3 px-4 rounded-lg font-medium text-sm transition-colors text-center',
                    activeTab === 'map'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                ]">
                    Mapas
                </button>
            </div>

            <!-- Desktop: Tabs tradicionales -->
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

                    <button @click="activeTab = 'history'" :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'history'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        Mi Historial
                        <span v-if="deliveryStore.historyTotalCount > 0"
                            class="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600">
                            {{ deliveryStore.historyTotalCount }}
                        </span>
                    </button>
                    <button @click="activeTab = 'map'" :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'map'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        Mapas
                    </button>
                </nav>
            </div>

            <div v-if="activeTab === 'available'">
                <DeliveryCardGrid ref="cardGridRef" :orders="deliveryStore.availableOrders" @assign="handleAssign" />
            </div>

            <div v-else-if="activeTab === 'history'">
                <DeliveryHistoryTable :orders="deliveryStore.historyOrders"
                    :total-count="deliveryStore.historyTotalCount" :page="deliveryStore.historyPage"
                    :page-size="deliveryStore.historyPageSize" @page-change="handleHistoryPageChange"
                    @filter-change="handleHistoryFilterChange" @order-delivered="handleOrderDelivered" />
            </div>
            <div v-else-if="activeTab === 'map'">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                    <div class="lg:col-span-2">
                        <DeliveryMap ref="mapRef" :orders="mapOrders" @route-calculated="handleRouteCalculated" />
                    </div>
                    <div class="lg:col-span-1">
                        <RouteOrderManager :orders="mapOrders" @route-optimized="handleRouteOptimized"
                            @geocode-requested="handleGeocodeRequested" />
                    </div>
                </div>
            </div>
        </div>

        <ConfirmAssignmentModal :is-open="showConfirmModal" :orders="ordersToAssign" @close="closeConfirmModal"
            @assigned="handleAssigned" />
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
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import DeliveryMap from '@/components/delivery/DeliveryMap.vue'
import RouteOrderManager from '@/components/delivery/RouteOrderManager.vue'

const router = useRouter()
const authStore = useAuthStore()
const deliveryStore = useDeliveryStore()
const { success, error } = useToast()

const SIGNALR_HUB_URL = 'http://localhost:5257/hubs/orders'
const { isConnected, on } = useSignalR(SIGNALR_HUB_URL)

const activeTab = ref<'available' | 'history' | 'map'>('available')
const isLoading = ref(false)
const showConfirmModal = ref(false)
const ordersToAssign = ref<OrderListItem[]>([])

const cardGridRef = ref<InstanceType<typeof DeliveryCardGrid> | null>(null)

// Mapa: lista local ordenable
const mapOrders = ref<OrderListItem[]>([])
interface DeliveryMapExposed {
    recalculateRoute: (orderIds?: number[]) => Promise<void>
    geocodeOrderById: (orderId: number) => void
}

const mapRef = ref<DeliveryMapExposed | null>(null)

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

const loadHistory = async () => {
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

const handleOrderReady = async (orderData: any) => {
    console.log('🔔 SignalR OrderReady recibido:', orderData)
    console.log('Tipo de pedido:', orderData.type || 'NO DEFINIDO')

    // Recargar siempre que llegue el evento (el backend ya filtra por tipo delivery)
    await loadAvailableOrders()
    success('Nuevo pedido disponible', 5000, `Pedido #${orderData.id}`)
}

const handleAssign = (orderIds: number[]) => {
    ordersToAssign.value = deliveryStore.availableOrders.filter((o: OrderListItem) => orderIds.includes(o.id))
    showConfirmModal.value = true
}

const handleAssigned = async () => {
    await loadAvailableOrders()
    if (cardGridRef.value) {
        cardGridRef.value.clearSelection()
    }
}

const closeConfirmModal = () => {
    showConfirmModal.value = false
    ordersToAssign.value = []
}

const refreshData = async () => {
    if (activeTab.value === 'available') {
        await loadAvailableOrders()
    } else {
        await loadHistory()
    }
}

const handleHistoryPageChange = async (page: number) => {
    deliveryStore.setHistoryPage(page)
    await loadHistory()
}

const handleHistoryFilterChange = async () => {
    // Note: Filters are not used for history (shows all assigned states)
    deliveryStore.setHistoryPage(1)
    await loadHistory()
}

const handleOrderDelivered = async () => {
    // Recargar historial para reflejar el cambio de estado
    await loadHistory()
}

const handleRouteCalculated = (_waypointOrder: number[]) => {
    // Placeholder: reordenamiento visual gestionado dentro del componente Map
}

const handleRouteOptimized = (orderIds: number[]) => {
    const idToOrder = new Map(mapOrders.value.map(o => [o.id, o]))
    const reordered: OrderListItem[] = []
    orderIds.forEach(id => {
        const found = idToOrder.get(id)
        if (found) reordered.push(found)
    })
    mapOrders.value.forEach(o => {
        if (!orderIds.includes(o.id)) reordered.push(o)
    })
    mapOrders.value = reordered
    mapRef.value?.recalculateRoute(orderIds)
}

const handleGeocodeRequested = (orderId: number) => {
    mapRef.value?.geocodeOrderById(orderId)
}

// Watch para cargar datos cuando cambias de tab
watch(activeTab, async (newTab) => {
    console.log('🔄 Tab changed:', newTab)
    if (newTab === 'available') {
        console.log('📦 Loading available orders...')
        await loadAvailableOrders()
        console.log('✅ Available orders loaded:', deliveryStore.availableOrders.length)
    } else if (newTab === 'history') {
        console.log('📚 Loading history...')
        await loadHistory()
        console.log('✅ History loaded:', deliveryStore.historyOrders.length)
    } else if (newTab === 'map') {
        await loadHistory()
        mapOrders.value = [...deliveryStore.ordersOnTheWay]
        // Solo recalcular si hay coordenadas disponibles
        const hasCoords = mapOrders.value.some(o => typeof (o as any).latitude === 'number' && typeof (o as any).longitude === 'number')
        if (hasCoords) setTimeout(() => mapRef.value?.recalculateRoute(), 0)
    }
})

onMounted(async () => {
    if (authStore.userRole !== 'Deliveryman' && authStore.userRole !== 'Admin' && authStore.userRole !== 'Superadmin') {
        router.push('/')
        return
    }

    await loadAvailableOrders()

    // Escuchar eventos de SignalR
    on('OrderReady', handleOrderReady)

    console.log('✅ SignalR: Escuchando evento OrderReady para domicilios')
})
</script>
