<template>
    <div class="order-tabs">
        <!-- Tabs List -->
        <div class="tabs-list">
            <div v-for="tab in orderTabs" :key="tab.tabId" class="tab-item" :class="{
                'active': tab.isActive,
                'has-items': tab.itemCount > 0
            }" :title="tabTitle(tab)" @click="switchTab(tab.tabId)">
                <span class="tab-label">{{ tabLabel(tab) }}</span>
                <BaseButton @click.stop="handleCloseTabClick(tab.tabId)" variant="ghost" size="sm" class="close-button"
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

        <BaseDialog v-model="showCloseTabConfirmDialog" title="Cerrar pedido" size="sm">
            <p class="text-sm text-gray-600">
                ¿Estás seguro de que quieres cerrar {{ closeConfirmTargetPhrase }}?
                Se perderán todos los productos (<span class="font-medium tabular-nums">{{ pendingCloseItemCount }}</span>)
                del pedido.
            </p>
            <template #footer>
                <BaseButton variant="secondary" size="sm" @click="cancelCloseTab">
                    Cancelar
                </BaseButton>
                <BaseButton variant="primary" size="sm" class="bg-red-600 hover:bg-red-700" @click="confirmCloseTab">
                    Cerrar pedido
                </BaseButton>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

// Icons
import {
    PlusIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

import type { OrderTab } from '@/types/order'
import { orderTabSidebarLabel } from '@/utils/orderTabLabel'

// Composables
const ordersStore = useOrdersDraftsStore()
const orderTabsComposable = useOrderTabs()

// Computed
const orderTabs = computed(() => ordersStore.orderTabs)
const canAddNewTab = computed(() => ordersStore.canAddNewTab)

function tabLabel(tab: OrderTab): string {
    return orderTabSidebarLabel(tab.guestName, tab.tabId).label
}

function tabTitle(tab: OrderTab): string {
    return orderTabSidebarLabel(tab.guestName, tab.tabId).title
}

function closeConfirmPhrase(tabId: string): string {
    const order = ordersStore.draftOrders.get(tabId)
    if (!order) return 'este pedido'
    const { title } = orderTabSidebarLabel(order.guestName, order.tabId)
    return `"${title}"`
}

const showCloseTabConfirmDialog = ref(false)
const pendingCloseTabId = ref<string | null>(null)

const closeConfirmTargetPhrase = computed(() =>
    pendingCloseTabId.value ? closeConfirmPhrase(pendingCloseTabId.value) : 'este pedido',
)

const pendingCloseItemCount = computed(() => {
    if (!pendingCloseTabId.value) return 0
    return ordersStore.draftOrders.get(pendingCloseTabId.value)?.orderItems.length ?? 0
})

const createNewTab = () => {
    orderTabsComposable.createNewTab()
}

const switchTab = (tabId: string) => {
    orderTabsComposable.switchTab(tabId)
}

const handleCloseTabClick = (tabId: string) => {
    const order = ordersStore.draftOrders.get(tabId)
    if (order && order.orderItems.length > 0) {
        pendingCloseTabId.value = tabId
        showCloseTabConfirmDialog.value = true
        return
    }
    orderTabsComposable.closeTab(tabId)
}

const cancelCloseTab = () => {
    showCloseTabConfirmDialog.value = false
}

watch(showCloseTabConfirmDialog, (open) => {
    if (!open) pendingCloseTabId.value = null
})

const confirmCloseTab = () => {
    const tabId = pendingCloseTabId.value
    showCloseTabConfirmDialog.value = false
    if (tabId) orderTabsComposable.closeTab(tabId)
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

.tab-label {
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 0;
    max-width: 7.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
    font-variant-numeric: tabular-nums;
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
