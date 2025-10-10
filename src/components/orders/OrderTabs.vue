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
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem;
}

.tabs-list {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    overflow-x: auto;
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 0;
    flex-shrink: 0;
}

.tab-item:hover {
    background-color: #f3f4f6;
    border-color: #d1d5db;
}

.tab-item.active {
    background-color: #eff6ff;
    border-color: #93c5fd;
    color: #1d4ed8;
}

.tab-item.has-items {
    border-color: #bbf7d0;
    background-color: #f0fdf4;
}

.tab-item.has-items.active {
    border-color: #86efac;
    background-color: #dcfce7;
}

.tab-item.empty {
    border-color: #e5e7eb;
    background-color: #f9fafb;
    color: #6b7280;
}

.tab-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.tab-info {
    display: flex;
    flex-direction: column;
}

.tab-name {
    font-size: 0.875rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.item-count {
    font-size: 0.75rem;
    color: #6b7280;
}

.tab-total {
    font-size: 0.75rem;
    font-weight: 500;
}

.total-amount {
    color: #059669;
}

.tab-item.empty .total-amount {
    color: #9ca3af;
}

.close-button {
    flex-shrink: 0;
    color: #9ca3af;
}

.close-button:hover {
    color: #ef4444;
}

.new-tab-section {
    display: flex;
    justify-content: center;
}

.new-tab-button {
    width: 100%;
    max-width: 20rem;
}

/* Responsive */
@media (max-width: 640px) {
    .tabs-list {
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .tab-item {
        width: 100%;
    }
}
</style>
