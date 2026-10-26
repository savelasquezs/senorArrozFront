<template>
    <div class="contents">
        <div class="orders-view h-full min-h-0 overflow-hidden bg-gray-50 flex flex-col">
            <!-- Main Content -->
            <div class="flex flex-1 min-h-0 min-w-0 overflow-hidden flex-col lg:flex-row">
                <!-- Left Panel - Products and Categories -->
                <div class="h-[35dvh] shrink-0 bg-white border-r border-gray-200 overflow-hidden flex flex-col min-h-0 min-w-0 lg:h-auto lg:flex-1">
                    <OrderProductCatalog v-model:search-query="ordersStore.searchQuery"
                        v-model:selected-category-ids="ordersStore.selectedCategoryIds"
                        :products="productsStore.catalogProducts" :categories="productCategoriesStore.catalogCategories"
                        :loading="productsStore.catalogLoading" :error="productsStore.catalogError" @retry="retryCatalog" />
                </div>

                <!-- Right Panel - Order Sidebar -->
                <OrderSidebar @order-updated="refreshTotals" />
            </div>

            <!-- Loading Overlay -->
            <BaseLoading v-if="ordersStore.isLoading" text="Cargando datos..." />

            <!-- Error Message -->
            <BaseAlert v-if="ordersStore.error" type="error" :message="ordersStore.error"
                class="fixed top-4 right-4 z-50" />

            <!-- Success Toast -->
            <!-- Toast component will be handled by useToast composable automatically -->
            <button
                v-if="whatsappReturnConversationId"
                type="button"
                class="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg border border-emerald-200 bg-emerald-600 px-3 py-4 text-sm font-medium text-white shadow-lg hover:bg-emerald-700"
                @click="openWhatsAppConversation"
            >
                WhatsApp
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useAuthStore } from '@/store/auth'
import { bootstrapOrderCatalog } from '@/utils/orderCatalogBootstrap'
// Components
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import OrderProductCatalog from '@/components/orders/OrderProductCatalog.vue'
import OrderSidebar from '@/components/orders/OrderSidebar.vue'
// Toast is handled automatically by useToast composable

// Composables
const ordersStore = useOrdersDraftsStore()
const productsStore = useProductsStore()
const productCategoriesStore = useProductCategoriesStore()
const authStore = useAuthStore()
const router = useRouter()
const whatsappReturnConversationId = ref<number | null>(null)

// Catálogo ya en bootstrap (login / layout); aquí solo sincronizamos draft con Pinia.
const ensureOrderPageData = async () => {
    try {
        await Promise.all([
            bootstrapOrderCatalog(authStore.userRole, ordersStore.currentOrder?.branchId ?? ordersStore.activeBranchId),
            ordersStore.loadBanks(), ordersStore.loadApps(),
        ])
    } catch (error) {
        console.error('Error cargando datos de pedidos:', error)
    }
}

const catalogBranchId = computed(() => ordersStore.currentOrder?.branchId ?? ordersStore.activeBranchId)
watch(catalogBranchId, branchId => { void productsStore.ensureCatalogLoaded(branchId).catch(() => {}) })
function retryCatalog() { void productsStore.ensureCatalogLoaded(catalogBranchId.value, true).catch(() => {}) }

const refreshTotals = () => {
    // Los totales ya se recalculan automáticamente en cada cambio
    // No necesita hacer nada adicional
}

const initializeData = async () => {
    await ensureOrderPageData()
    const conversationId = Number(localStorage.getItem('senor-arroz-whatsapp-conversation-tab') || 0)
    whatsappReturnConversationId.value = conversationId > 0 ? conversationId : null
}

function openWhatsAppConversation() {
    if (!whatsappReturnConversationId.value) return
    router.push({
        name: 'WhatsApp',
        query: { conversationId: String(whatsappReturnConversationId.value) },
    })
}

// Lifecycle
onMounted(() => {
    ordersStore.setSearchQuery('')
    ordersStore.setSelectedCategoryIds(null)
    initializeData()
})

onUnmounted(() => {
    // Optionally save active orders to localStorage
    // ordersStore.saveActiveOrdersToStorage()
})
</script>

<style scoped>
/* Additional styles if needed */
</style>
