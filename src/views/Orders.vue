<template>
    <MainLayout>

        <div class="orders-view min-h-screen bg-gray-50">
            <!-- Header -->
            <!-- Main Content -->
            <div class="flex h-[calc(100vh-140px)]">
                <!-- Left Panel - Products and Categories -->
                <div class="flex-1 bg-white border-r border-gray-200 overflow-hidden flex flex-col">
                    <!-- Categories Bar -->
                    <div class="px-4 border-b border-gray-200 bg-gray-50">
                        <CategoriesBar :categories="ordersStore.categories"
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
import { onMounted, onUnmounted } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'

// Components
import BaseInput from '@/components/ui/BaseInput.vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import ProductsGrid from '@/components/ProductsGrid.vue'
import CategoriesBar from '@/components/CategoriesBar.vue'
import OrderSidebar from '@/components/OrderSidebar.vue'
// Toast is handled automatically by useToast composable

// Icons
import {
    MagnifyingGlassIcon,

} from '@heroicons/vue/24/outline'

// Composables
const ordersStore = useOrdersStore()
const authStore = useAuthStore()
const { success } = useToast()

// Methods
const refreshData = async () => {
    try {
        await Promise.all([
            ordersStore.loadProducts(),
            ordersStore.loadCategories(),
            ordersStore.loadCustomers(),
            ordersStore.loadBanks(),
            ordersStore.loadApps(),
        ])
        success('Datos actualizados', 2000, 'Todos los datos se han actualizado correctamente')
    } catch (error) {
        console.error('Error refreshing data:', error)
    }
}

const onCategorySelected = (_categoryId: number | null) => {
    // Category selection is already handled by the CategoriesBar component
    // through the ordersStore.setSelectedCategory method
}

const refreshTotals = () => {
    // Trigger recalculations if needed
    if (ordersStore.activeOrder) {
        ordersStore.recalculateOrderTotals(ordersStore.activeOrder)
    }
}

// Initialize data
const initializeData = async () => {
    try {
        // Set branch and user from auth
        const activeOrder = ordersStore.activeOrder
        if (activeOrder) {
            activeOrder.branchId = authStore.branchId || 0
            activeOrder.takenById = authStore.user?.id || 0
        }

        // Load all necessary data
        await refreshData()
    } catch (error) {
        console.error('Error initializing orders view:', error)
    }
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
.orders-view {
    height: 100vh;
    overflow: hidden;
}
</style>
