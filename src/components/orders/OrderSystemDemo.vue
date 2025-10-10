<template>
    <div class="order-system-demo">
        <!-- Header -->
        <div class="demo-header">
            <h1 class="demo-title">Sistema de Pedidos - Demo</h1>
            <p class="demo-description">Sistema de múltiples tabs con persistencia localStorage</p>
        </div>

        <!-- Order Tabs -->
        <OrderTabs />

        <!-- Main Content -->
        <div v-if="currentOrder" class="main-content">
            <!-- Order Header -->
            <div class="order-header-section">
                <div class="order-info">
                    <h2 class="order-title">{{ currentOrder.tabName }}</h2>
                    <div class="order-meta">
                        <span class="order-type">{{ getOrderTypeLabel(currentOrder.type) }}</span>
                        <span v-if="currentOrder.customerName" class="customer-info">
                            Cliente: {{ currentOrder.customerName }}
                        </span>
                    </div>
                </div>
                <div class="order-totals">
                    <div class="total-line">
                        <span>Total:</span>
                        <span class="total-amount">{{ formatCurrency(currentOrder.total) }}</span>
                    </div>
                </div>
            </div>

            <!-- Order Items -->
            <div class="order-items-section">
                <OrderItemList :tab-id="currentTabId" @add-products="handleAddProducts" @edit-item="handleEditItem" />
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <BaseButton @click="addSampleProduct" variant="outline" size="sm">
                    <span class="flex items-center">
                        <PlusIcon class="w-4 h-4 mr-2" />
                        Agregar Producto de Prueba
                    </span>
                </BaseButton>
                <BaseButton @click="clearCurrentOrder" variant="outline" size="sm" class="text-red-600">
                    <span class="flex items-center">
                        <TrashIcon class="w-4 h-4 mr-2" />
                        Limpiar Pedido
                    </span>
                </BaseButton>
            </div>
        </div>

        <!-- No Order State -->
        <div v-else class="no-order-state">
            <div class="no-order-content">
                <ShoppingCartIcon class="w-16 h-16 text-gray-400 mb-4" />
                <h3 class="no-order-title">No hay pedidos activos</h3>
                <p class="no-order-description">Crea un nuevo pedido para comenzar</p>
                <BaseButton @click="createNewOrder" variant="primary" class="mt-4">
                    <span class="flex items-center">
                        <PlusIcon class="w-4 h-4 mr-2" />
                        Crear Nuevo Pedido
                    </span>
                </BaseButton>
            </div>
        </div>

        <!-- Debug Info -->
        <div class="debug-info">
            <details class="debug-panel">
                <summary class="debug-summary">Debug Info</summary>
                <div class="debug-content">
                    <div class="debug-section">
                        <h4>Estado Actual:</h4>
                        <pre>{{ JSON.stringify({
                            currentTabId,
                            totalTabs: draftOrders.size,
                            canAddNewTab,
                            currentOrderItems: currentOrder?.orderItems.length || 0
                        }, null, 2) }}</pre>
                    </div>
                    <div class="debug-section">
                        <h4>LocalStorage:</h4>
                        <pre>{{ localStorageData }}</pre>
                    </div>
                </div>
            </details>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useFormatting } from '@/composables/useFormatting'
import { useOrderPersistence } from '@/composables/useOrderPersistence'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import OrderTabs from '@/components/orders/OrderTabs.vue'
import OrderItemList from '@/components/orders/OrderItemList.vue'

// Icons
import {
    PlusIcon,
    TrashIcon,
    ShoppingCartIcon
} from '@heroicons/vue/24/outline'

// Composables
const { formatCurrency } = useFormatting()
const { ordersStore } = useOrderPersistence()

// State
const localStorageData = ref('')

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const currentTabId = computed(() => ordersStore.currentTabId)
const draftOrders = computed(() => ordersStore.draftOrders)
const canAddNewTab = computed(() => ordersStore.canAddNewTab)

// Methods
const getOrderTypeLabel = (type: string) => {
    const labels = {
        onsite: 'En el Local',
        delivery: 'Domicilio',
        reservation: 'Reserva'
    }
    return labels[type as keyof typeof labels] || type
}

const createNewOrder = () => {
    ordersStore.createNewTab()
}

const addSampleProduct = () => {
    // Producto de prueba
    const sampleProduct = {
        id: Date.now(),
        name: 'Producto de Prueba',
        price: 15000,
        categoryId: 1,
        categoryName: 'General',
        active: true
    }

    ordersStore.addProduct(sampleProduct, 1)
}

const clearCurrentOrder = () => {
    if (!currentOrder.value) return

    const confirmed = confirm(`¿Estás seguro de que quieres limpiar "${currentOrder.value.tabName}"? Se eliminarán todos los productos.`)
    if (confirmed) {
        currentOrder.value.orderItems.forEach(item => {
            ordersStore.removeItem(item.tempId)
        })
    }
}

const handleAddProducts = () => {
    // Aquí se integraría con el selector de productos
    console.log('Agregar productos desde catálogo')
}

const handleEditItem = (itemTempId: string) => {
    // Aquí se abriría el modal de edición de item
    console.log('Editar item:', itemTempId)
}

const updateLocalStorageData = () => {
    try {
        const stored = localStorage.getItem('senor-arroz-draft-orders')
        localStorageData.value = stored ? JSON.stringify(JSON.parse(stored), null, 2) : 'No hay datos'
    } catch (error) {
        localStorageData.value = 'Error al leer localStorage'
    }
}

// Lifecycle
onMounted(() => {
    updateLocalStorageData()

    // Actualizar debug info cada 2 segundos
    setInterval(updateLocalStorageData, 2000)
})
</script>

<style scoped>
.order-system-demo {
    @apply max-w-6xl mx-auto p-6 space-y-6;
}

.demo-header {
    @apply text-center pb-6 border-b border-gray-200;
}

.demo-title {
    @apply text-2xl font-bold text-gray-900 mb-2;
}

.demo-description {
    @apply text-gray-600;
}

.main-content {
    @apply space-y-6;
}

.order-header-section {
    @apply bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center;
}

.order-info {
    @apply flex flex-col;
}

.order-title {
    @apply text-xl font-semibold text-gray-900 mb-1;
}

.order-meta {
    @apply flex gap-4 text-sm text-gray-600;
}

.order-type {
    @apply px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium;
}

.customer-info {
    @apply text-gray-600;
}

.order-totals {
    @apply flex flex-col items-end;
}

.total-line {
    @apply flex gap-2 text-lg font-semibold;
}

.total-amount {
    @apply text-green-600;
}

.order-items-section {
    @apply bg-white border border-gray-200 rounded-lg p-4;
}

.quick-actions {
    @apply flex gap-3 justify-center;
}

.no-order-state {
    @apply flex justify-center items-center py-12;
}

.no-order-content {
    @apply text-center;
}

.no-order-title {
    @apply text-xl font-semibold text-gray-900 mb-2;
}

.no-order-description {
    @apply text-gray-600;
}

.debug-info {
    @apply bg-gray-50 border border-gray-200 rounded-lg p-4;
}

.debug-panel {
    @apply space-y-2;
}

.debug-summary {
    @apply cursor-pointer font-medium text-gray-700 hover:text-gray-900;
}

.debug-content {
    @apply space-y-4 mt-4;
}

.debug-section {
    @apply space-y-2;
}

.debug-section h4 {
    @apply font-medium text-gray-800;
}

.debug-section pre {
    @apply bg-white border border-gray-200 rounded p-3 text-xs overflow-x-auto;
}
</style>
