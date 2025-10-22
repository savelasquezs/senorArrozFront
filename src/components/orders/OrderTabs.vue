<template>
    <div class="order-tabs">
        <!-- Tabs List -->
        <div class="tabs-list">
            <div v-for="tab in orderTabs" :key="tab.tabId" class="tab-item" :class="{
                'active': tab.isActive,
                'has-items': tab.itemCount > 0
            }" @click="switchTab(tab.tabId)">
                <span class="tab-number">{{ getTabNumber(tab.tabName) }}</span>
                <BaseButton @click.stop="closeTab(tab.tabId)" variant="ghost" size="sm" class="close-button"
                    title="Cerrar pedido">
                    <XMarkIcon class="w-3 h-3" />
                </BaseButton>
            </div>

            <!-- New Tab Button -->
            <BaseButton @click="createNewTab" :disabled="!canAddNewTab" variant="primary" size="sm"
                class="new-tab-button">
                <PlusIcon class="w-4 h-4" />
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'

// Icons
import {
    PlusIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

// Composables
const ordersStore = useOrdersDraftsStore()
const orderTabsComposable = useOrderTabs()

// Computed
const orderTabs = computed(() => ordersStore.orderTabs)
const canAddNewTab = computed(() => ordersStore.canAddNewTab)

// Methods
const getTabNumber = (tabName: string) => {
    // Extraer el número del nombre del tab (ej: "Pedido #001" -> "001")
    const match = tabName.match(/#(\d+)/)
    return match ? match[1] : tabName
}

const createNewTab = () => {
    orderTabsComposable.createNewTab()
}

const switchTab = (tabId: string) => {
    orderTabsComposable.switchTab(tabId)
}

const closeTab = (tabId: string) => {
    // Verificar si hay items en la orden
    const order = ordersStore.draftOrders.get(tabId)
    if (order && order.orderItems.length > 0) {
        const confirmed = confirm(`¿Estás seguro de que quieres cerrar "${order.tabName}"? Se perderán todos los productos (${order.orderItems.length}) del pedido.`)
        if (!confirmed) return
    }

    orderTabsComposable.closeTab(tabId)
}
</script>

<style scoped>
.order-tabs {
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 0.5rem;
}

.tabs-list {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    align-items: center;
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 0;
    flex-shrink: 0;
    height: 2rem;
}

.tab-item:hover {
    background-color: #f3f4f6;
    border-color: #d1d5db;
}

.tab-item.active {
    background-color: #059669;
    border-color: #059669;
    color: white;
}

.tab-item.has-items {
    border-color: #059669;
    background-color: #f0fdf4;
}

.tab-item.has-items.active {
    background-color: #059669;
    border-color: #059669;
    color: white;
}

.tab-number {
    font-size: 0.75rem;
    font-weight: 600;
    font-family: monospace;
    min-width: 2rem;
    text-align: center;
}

.close-button {
    flex-shrink: 0;
    color: #9ca3af;
    padding: 0;
    width: 1rem;
    height: 1rem;
    min-width: 1rem;
}

.close-button:hover {
    color: #ef4444;
}

.tab-item.active .close-button {
    color: rgba(255, 255, 255, 0.7);
}

.tab-item.active .close-button:hover {
    color: white;
}

.new-tab-button {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border-radius: 0.25rem;
}

.new-tab-button:disabled {
    opacity: 0.5;
}

/* Responsive */
@media (max-width: 640px) {
    .tabs-list {
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    .tab-item {
        min-width: 3rem;
    }
}
</style>
