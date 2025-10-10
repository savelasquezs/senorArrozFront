<template>
    <div class="order-tabs">
        <!-- Tabs List -->
        <div class="tabs-list">
            <div v-for="tab in orderTabs" :key="tab.tabId" class="tab-item" :class="{
                'active': tab.isActive,
                'has-items': tab.itemCount > 0,
                'empty': tab.itemCount === 0
            }" @click="switchTab(tab.tabId)">
                <div class="tab-content">
                    <div class="tab-info">
                        <span class="tab-name">{{ tab.tabName }}</span>
                        <span class="item-count">{{ tab.itemCount }} items</span>
                    </div>
                    <div class="tab-total">
                        <span class="total-amount">{{ formatCurrency(tab.total) }}</span>
                    </div>
                </div>
                <BaseButton @click.stop="closeTab(tab.tabId)" variant="ghost" size="sm" class="close-button"
                    title="Cerrar pedido">
                    <XMarkIcon class="w-3 h-3" />
                </BaseButton>
            </div>
        </div>

        <!-- New Tab Button -->
        <div class="new-tab-section">
            <BaseButton @click="createNewTab" :disabled="!canAddNewTab" variant="primary" size="sm"
                class="new-tab-button">
                <span class="flex items-center">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Nuevo Pedido
                </span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useFormatting } from '@/composables/useFormatting'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'

// Icons
import {
    PlusIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

// Composables
const { formatCurrency } = useFormatting()
const ordersStore = useOrdersStore()

// Computed
const orderTabs = computed(() => ordersStore.orderTabs)
const canAddNewTab = computed(() => ordersStore.canAddNewTab)

// Methods
const createNewTab = () => {
    ordersStore.createNewTab()
}

const switchTab = (tabId: string) => {
    ordersStore.switchTab(tabId)
}

const closeTab = (tabId: string) => {
    // Verificar si hay items en la orden
    const order = ordersStore.draftOrders.get(tabId)
    if (order && order.orderItems.length > 0) {
        const confirmed = confirm(`¿Estás seguro de que quieres cerrar "${order.tabName}"? Se perderán todos los productos (${order.orderItems.length}) del pedido.`)
        if (!confirmed) return
    }

    ordersStore.closeTab(tabId)
}
</script>

<style scoped>
.order-tabs {
    @apply bg-white border-b border-gray-200 p-4;
}

.tabs-list {
    @apply flex gap-2 mb-4 overflow-x-auto;
}

.tab-item {
    @apply flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer transition-all duration-200 min-w-0 flex-shrink-0;
}

.tab-item:hover {
    @apply bg-gray-100 border-gray-300;
}

.tab-item.active {
    @apply bg-blue-50 border-blue-300 text-blue-700;
}

.tab-item.has-items {
    @apply border-green-200 bg-green-50;
}

.tab-item.has-items.active {
    @apply border-green-300 bg-green-100;
}

.tab-item.empty {
    @apply border-gray-200 bg-gray-50 text-gray-500;
}

.tab-content {
    @apply flex flex-col min-w-0;
}

.tab-info {
    @apply flex flex-col;
}

.tab-name {
    @apply text-sm font-medium truncate;
}

.item-count {
    @apply text-xs text-gray-500;
}

.tab-total {
    @apply text-xs font-medium;
}

.total-amount {
    @apply text-green-600;
}

.tab-item.empty .total-amount {
    @apply text-gray-400;
}

.close-button {
    @apply flex-shrink-0 text-gray-400 hover:text-red-500;
}

.new-tab-section {
    @apply flex justify-center;
}

.new-tab-button {
    @apply w-full max-w-xs;
}

/* Responsive */
@media (max-width: 640px) {
    .tabs-list {
        @apply flex-col gap-1;
    }

    .tab-item {
        @apply w-full;
    }
}
</style>
