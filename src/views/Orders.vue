<template>
    <MainLayout :no-card="true">
        <div class="orders-view h-full bg-gray-50 flex flex-col">
            <!-- Main Content -->
            <div class="flex flex-1 min-h-0">
                <!-- Left Panel - Products and Categories -->
                <div class="flex-1 bg-white border-r border-gray-200 overflow-hidden flex flex-col min-h-0">
                    <!-- Categories Bar -->
                    <div class="px-4 border-b border-gray-200 bg-gray-50">
                        <CategoriesBar :categories="categories as any"
                            :products-count="ordersStore.filteredProducts.length"
                            @category-selected="onCategorySelected" />
                    </div>
                    <!-- Search Bar -->
                    <div class="p-4 border-b border-gray-200">
                        <BaseInput v-model="ordersStore.searchQuery" placeholder="Buscar productos..."
                            @input="ordersStore.setSearchQuery" size="lg">
                            <template #prepend>
                                <MagnifyingGlassIcon class="w-5 h-5 text-gray-400" />
                            </template>
                        </BaseInput>
                    </div>


                    <!-- Products Grid -->
                    <div class="flex-1 overflow-y-auto p-4">
                        <ProductsGrid :products="ordersStore.filteredProducts" />
                    </div>
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
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useProductsStore } from '@/store/products'
// Components
import BaseInput from '@/components/ui/BaseInput.vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import ProductsGrid from '@/components/orders/products/ProductGrid.vue'
import CategoriesBar from '@/components/products/CategoriesBar.vue'
import OrderSidebar from '@/components/orders/OrderSidebar.vue'
// Toast is handled automatically by useToast composable

// Icons
import {
    MagnifyingGlassIcon,

} from '@heroicons/vue/24/outline'

// Composables
const ordersStore = useOrdersDraftsStore()
const productsStore = useProductsStore()

// Computed
const categories = computed(() => {
    if (!productsStore.list?.items) return []

    const categoryMap = new Map<number, { id: number, name: string }>()

    productsStore.list.items.forEach(product => {
        if (product.categoryId && !categoryMap.has(product.categoryId)) {
            categoryMap.set(product.categoryId, {
                id: product.categoryId,
                name: product.categoryName || 'Sin categoría'
            })
        }
    })

    return Array.from(categoryMap.values())
})

// Sincroniza bancos/apps al draft (desde Pinia; sin red si MainLayout ya precargó). Productos: misma política.
const ensureOrderPageData = async () => {
    try {
        await Promise.all([
            productsStore.ensureCatalogLoaded(),
            ordersStore.loadBanks(),
            ordersStore.loadApps(),
        ])
    } catch (error) {
        console.error('Error cargando datos de pedidos:', error)
    }
}

const onCategorySelected = (_categoryId: number | null) => {
    // Category selection is already handled by the CategoriesBar component
    // through the ordersStore.setSelectedCategory method
}

const refreshTotals = () => {
    // Los totales ya se recalculan automáticamente en cada cambio
    // No necesita hacer nada adicional
}

const initializeData = async () => {
    await ensureOrderPageData()
}

// Lifecycle
onMounted(() => {
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
