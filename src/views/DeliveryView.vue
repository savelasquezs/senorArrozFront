<template>
    <MainLayout>
        <div class="p-6 space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Domicilios</h1>
                    <p class="text-gray-600 mt-1">Gestión de entregas</p>
                </div>

                <div class="flex items-center gap-4">
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
            </div>

            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8">
                    <button @click="activeTab = 'available'" :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'available'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        Pedidos Disponibles
                        <span v-if="availableOrders.length > 0"
                            class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600">
                            {{ availableOrders.length }}
                        </span>
                    </button>

                    <button @click="activeTab = 'history'" :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'history'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        Mi Historial
                        <span v-if="historyTotalCount > 0"
                            class="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600">
                            {{ historyTotalCount }}
                        </span>
                    </button>
                </nav>
            </div>

            <div v-if="activeTab === 'available'">
                <DeliveryCardGrid ref="cardGridRef" :orders="availableOrders" @assign="handleAssign" />
            </div>

            <div v-else-if="activeTab === 'history'">
                <DeliveryHistoryTable :orders="historyOrders" :total-count="historyTotalCount" :page="historyPage"
                    :page-size="historyPageSize" @page-change="handleHistoryPageChange"
                    @filter-change="handleHistoryFilterChange" />
            </div>
        </div>

        <ConfirmAssignmentModal :is-open="showConfirmModal" :orders="ordersToAssign" @close="closeConfirmModal"
            @assigned="handleAssigned" />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useOrdersDataStore } from '@/store/ordersData'
import { useSignalR } from '@/composables/useSignalR'
import { useToast } from '@/composables/useToast'
import type { OrderListItem } from '@/types/order'
import MainLayout from '@/components/layout/MainLayout.vue'
import DeliveryCardGrid from '@/components/delivery/DeliveryCardGrid.vue'
import DeliveryHistoryTable from '@/components/delivery/DeliveryHistoryTable.vue'
import ConfirmAssignmentModal from '@/components/delivery/ConfirmAssignmentModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'

interface HistoryFilters {
    fromDate: string
    toDate: string
    neighborhoodId: number | null
}

const router = useRouter()
const authStore = useAuthStore()
const ordersStore = useOrdersDataStore()
const { success, error } = useToast()

const SIGNALR_HUB_URL = 'http://localhost:5257/hubs/orders'
const { isConnected, on, connection } = useSignalR(SIGNALR_HUB_URL)

const activeTab = ref<'available' | 'history'>('available')
const isLoading = ref(false)
const showConfirmModal = ref(false)
const ordersToAssign = ref<OrderListItem[]>([])
const historyPage = ref(1)
const historyPageSize = ref(10)
const historyFilters = ref<HistoryFilters>({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    neighborhoodId: null
})

const cardGridRef = ref<InstanceType<typeof DeliveryCardGrid> | null>(null)

const availableOrders = computed(() => ordersStore.list?.items.filter(o =>
    o.type === 'delivery' &&
    o.status === 'ready' &&
    !o.deliveryManId
) || [])
const historyOrders = computed(() => ordersStore.list?.items || [])
const historyTotalCount = computed(() => ordersStore.list?.totalCount || 0)

const loadAvailableOrders = async () => {
    try {
        isLoading.value = true
        await ordersStore.fetchDeliveryReady({
            branchId: authStore.user?.branchId,
            page: 1,
            pageSize: 100
        })
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
        await ordersStore.fetchDeliveryHistory({
            deliveryManId: authStore.user.id,
            fromDate: historyFilters.value.fromDate,
            toDate: historyFilters.value.toDate,
            neighborhoodId: historyFilters.value.neighborhoodId,
            page: historyPage.value,
            pageSize: historyPageSize.value
        })
    } catch (err: any) {
        error('Error al cargar historial', err.message)
    } finally {
        isLoading.value = false
    }
}

const handleOrderReady = async (orderData: any) => {
    console.log('Pedido listo:', orderData)
    if (orderData.type === 'delivery') {
        await loadAvailableOrders()
        success('Nuevo pedido disponible', 5000, `Pedido #${orderData.id}`)
    }
}

const handleAssign = (orderIds: number[]) => {
    ordersToAssign.value = availableOrders.value.filter(o => orderIds.includes(o.id))
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
    historyPage.value = page
    await loadHistory()
}

const handleHistoryFilterChange = async (filters: HistoryFilters) => {
    historyFilters.value = filters
    historyPage.value = 1
    await loadHistory()
}

onMounted(async () => {
    if (authStore.userRole !== 'Deliveryman' && authStore.userRole !== 'Admin' && authStore.userRole !== 'Superadmin') {
        router.push('/')
        return
    }

    await loadAvailableOrders()

    // Suscribirse al grupo de SignalR para delivery
    if (connection.value && authStore.user?.branchId) {
        await connection.value.invoke('AddToGroup', `Branch_${authStore.user.branchId}_Delivery`)
        console.log(`SignalR: Suscrito a grupo Branch_${authStore.user.branchId}_Delivery`)
    }

    on('OrderReady', handleOrderReady)
})
</script>
