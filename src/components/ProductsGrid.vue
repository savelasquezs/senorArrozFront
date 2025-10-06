<template>
    <div class="products-grid">
        <BaseLoading v-if="ordersStore.isLoading" text="Cargando productos..." />

        <div v-else-if="products.length === 0" class="text-center py-12">
            <ShoppingBagIcon class="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
            <p class="text-gray-500">No se encontraron productos para mostrar.</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div v-for="product in products" :key="product.id" @click="addProductToOrder(product)"
                class="product-card group cursor-pointer bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all duration-200"
                :class="{ 'opacity-50': !product.active || (product.stock !== undefined && product.stock <= 0) }">
                <!-- Product Image Placeholder -->
                <div class="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <ShoppingBagIcon class="h-12 w-12 text-gray-400" />
                </div>

                <!-- Product Info -->
                <div class="p-4">
                    <h3 class="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                        {{ product.name }}
                    </h3>

                    <!-- Category Badge -->
                    <div class="mb-2">
                        <BaseBadge type="neutral" :text="product.categoryName || 'Sin categoría'" size="sm" />
                    </div>

                    <!-- Price -->
                    <div class="text-lg font-semibold text-gray-900 mb-2">
                        {{ formatCurrency(product.price) }}
                    </div>

                    <!-- Stock Info -->
                    <div v-if="product.stock !== undefined" class="flex items-center justify-between">
                        <span class="text-xs text-gray-500">
                            Stock: {{ product.stock }}
                        </span>

                        <!-- Stock Status -->
                        <BaseBadge :type="stockStatus(product.stock).type" :text="stockStatus(product.stock).text"
                            size="sm" />
                    </div>

                    <!-- Add Button -->
                    <BaseButton @click.stop="addProductToOrder(product)" variant="primary" size="sm"
                        :disabled="!product.active || (product.stock !== undefined && product.stock <= 0)"
                        class="w-full mt-2">
                        <PlusIcon class="w-4 h-4 mr-1" />
                        Agregar
                    </BaseButton>
                </div>

                <!-- Hover Overlay -->
                <div
                    class="absolute inset-0 bg-indigo-500 bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useToast } from '@/composables/useToast'
import type { Product } from '@/types/order'

// Components
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

// Icons
import {
    ShoppingBagIcon,
    PlusIcon,
} from '@heroicons/vue/24/outline'


// Props
interface Props {
    products?: Product[]
}

const props = withDefaults(defineProps<Props>(), {
    products: () => []
})

// Composables
const ordersStore = useOrdersStore()
const { success } = useToast()

// Computed
const products = computed(() => props.products.length > 0 ? props.products : ordersStore.filteredProducts)

// Methods
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

const stockStatus = (stock: number) => {
    if (stock <= 0) {
        return { type: 'danger' as const, text: 'Sin stock' }
    } else if (stock <= 5) {
        return { type: 'warning' as const, text: 'Bajo stock' }
    } else {
        return { type: 'success' as const, text: 'Disponible' }
    }
}

const addProductToOrder = (product: Product) => {
    try {
        ordersStore.addProductToActiveOrder(product)
        success('Producto agregado', 1500, `${product.name} agregado al pedido`)
    } catch (error) {
        console.error('Error adding product to order:', error)
    }
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.product-card {
    position: relative;
}
</style>