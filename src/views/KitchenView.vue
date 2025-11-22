<template>
    <MainLayout>
        <div class="p-6 space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Cocina</h1>
                    <p class="text-gray-600 mt-1">Gestión de pedidos en preparación</p>
                </div>

                <div class="flex items-center gap-4">
                    <div :class="[
                        'flex items-center gap-2 px-3 py-1 rounded-lg text-sm',
                        isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    ]">
                        <span :class="['w-2 h-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500']"></span>
                        {{ isConnected ? 'Conectado' : 'Desconectado' }}
                    </div>

                    <button @click="toggleSound" :class="[
                        'p-2 rounded-lg transition-colors',
                        soundEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                    ]">
                        <component :is="soundEnabled ? SpeakerWaveIcon : SpeakerXMarkIcon" class="w-6 h-6" />
                    </button>

                    <BaseButton @click="refreshOrders" variant="outline" size="sm" :loading="isLoading">
                        <span class="flex items-center gap-2">
                            <ArrowPathIcon class="w-4 h-4" />
                            Actualizar
                        </span>
                    </BaseButton>
                </div>
            </div>

            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8">
                    <button @click="activeTab = 'active'" :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'active'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        Pedidos Activos
                        <span v-if="activeOrders.length > 0"
                            class="ml-2 py-0.5 px-2 rounded-full text-xs bg-emerald-100 text-emerald-600">
                            {{ activeOrders.length }}
                        </span>
                    </button>

                    <button @click="activeTab = 'ready'" :class="[
                        'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                        activeTab === 'ready'
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    ]">
                        Pedidos Listos
                        <span v-if="readyOrders.length > 0"
                            class="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-600">
                            {{ readyOrders.length }}
                        </span>
                    </button>
                </nav>
            </div>

            <div v-if="activeTab === 'active'">
                <OrderCardGrid ref="cardGridRef" :orders="activeOrders" :order-items-map="orderItemsMap"
                    @change-status="handleChangeStatus" />
            </div>

            <div v-else-if="activeTab === 'ready'">
                <ReadyOrdersTable :orders="readyOrders" :order-items-map="orderItemsMap" @reprint="handleReprint" />
            </div>
        </div>

        <ConfirmStatusChangeModal :is-open="showConfirmModal" :orders="ordersToConfirm" :order-items-map="orderItemsMap"
            @close="closeConfirmModal" @updated="handleModalUpdated" />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useOrdersDataStore } from '@/store/ordersData'
import { useSignalR } from '@/composables/useSignalR'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { useToast } from '@/composables/useToast'
import { KitchenService } from '@/services/domain/KitchenService'
import type { OrderListItem, OrderDetailItem, OrderStatus } from '@/types/order'
import MainLayout from '@/components/layout/MainLayout.vue'
import OrderCardGrid from '@/components/kitchen/OrderCardGrid.vue'
import ReadyOrdersTable from '@/components/kitchen/ReadyOrdersTable.vue'
import ConfirmStatusChangeModal from '@/components/kitchen/ConfirmStatusChangeModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowPathIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const ordersStore = useOrdersDataStore()
const { success, error } = useToast()
const { speak } = useTextToSpeech()

const SIGNALR_HUB_URL = import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5000/hubs/orders'
const { isConnected, on } = useSignalR(SIGNALR_HUB_URL)

const activeTab = ref<'active' | 'ready'>('active')
const soundEnabled = ref(true)
const isLoading = ref(false)
const showConfirmModal = ref(false)
const ordersToConfirm = ref<OrderListItem[]>([])
const orderItemsMap = ref(new Map<number, OrderDetailItem[]>())
const cardGridRef = ref<InstanceType<typeof OrderCardGrid> | null>(null)

const allOrders = computed(() => ordersStore.list?.items || [])
const activeOrders = computed(() => allOrders.value.filter(o => o.status === 'taken' || o.status === 'in_preparation'))
const readyOrders = computed(() => allOrders.value.filter(o => o.status === 'ready'))

const loadOrders = async () => {
    try {
        isLoading.value = true
        await ordersStore.fetch({
            branchId: authStore.user?.branchId,
            page: 1,
            pageSize: 100
        })
        await loadOrderDetails()
    } catch (err: any) {
        error('Error al cargar pedidos', err.message)
    } finally {
        isLoading.value = false
    }
}

const loadOrderDetails = async () => {
    for (const order of allOrders.value) {
        if (!orderItemsMap.value.has(order.id)) {
            try {
                await ordersStore.fetchById(order.id)
                if (ordersStore.current) {
                    orderItemsMap.value.set(order.id, ordersStore.current.orderDetails || [])
                }
            } catch (err) {
                console.error(`Error loading details for order ${order.id}:`, err)
            }
        }
    }
}

const handleNewOrder = async (orderData: any) => {
    console.log('Nuevo pedido recibido:', orderData)
    await loadOrders()

    if (soundEnabled.value) {
        const order = allOrders.value.find(o => o.id === orderData.id)
        if (order && order.status === 'taken') {
            try {
                await ordersStore.fetchById(order.id)
                if (ordersStore.current) {
                    const products = ordersStore.current.orderDetails.map(item => ({
                        name: item.productName,
                        quantity: item.quantity
                    }))
                    const speechText = KitchenService.generateOrderSpeechText(order, products)
                    speak(speechText)
                }
            } catch (err) {
                console.error('Error loading order details for TTS:', err)
            }
        }
    }
}

const handleReservationReady = async (orderData: any) => {
    console.log('Reserva próxima:', orderData)
    await loadOrders()
}

const handleChangeStatus = (orderIds: number[], newStatus: OrderStatus) => {
    const selectedOrders = allOrders.value.filter(o => orderIds.includes(o.id))

    if (newStatus === 'ready') {
        ordersToConfirm.value = selectedOrders
        showConfirmModal.value = true
    } else {
        executeStatusChange(orderIds, newStatus)
    }
}

const executeStatusChange = async (orderIds: number[], newStatus: OrderStatus) => {
    try {
        isLoading.value = true

        for (const orderId of orderIds) {
            await ordersStore.updateStatus(orderId, newStatus)
        }

        success(`${orderIds.length} pedido(s) actualizado(s)`)
        await loadOrders()

        if (cardGridRef.value) {
            cardGridRef.value.clearSelection()
        }
    } catch (err: any) {
        error('Error al cambiar estado', err.message)
    } finally {
        isLoading.value = false
    }
}

const handleModalUpdated = async () => {
    await loadOrders()
    if (cardGridRef.value) {
        cardGridRef.value.clearSelection()
    }
}

const closeConfirmModal = () => {
    showConfirmModal.value = false
    ordersToConfirm.value = []
}

const refreshOrders = async () => {
    await loadOrders()
}

const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
}

const handleReprint = (orderId: number) => {
    console.log('TODO: Reimprimir pedido:', orderId)
    success('Función de impresión pendiente de configuración')
}

onMounted(async () => {
    if (authStore.userRole !== 'Kitchen' && authStore.userRole !== 'Admin' && authStore.userRole !== 'Superadmin') {
        router.push('/')
        return
    }

    await loadOrders()

    on('NewOrder', handleNewOrder)
    on('ReservationReady', handleReservationReady)
})
</script>
