<template>
    <div class="product-list-view">
        <!-- Loading State -->
        <div v-if="loading" class="space-y-2">
            <div v-for="i in 6" :key="i" class="animate-pulse">
                <div class="p-3 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <div class="flex-1">
                            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div class="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="products.length === 0" class="empty-state">
            <div class="text-center py-12">
                <ShoppingBagIcon class="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                    {{ emptyMessage || 'No hay productos' }}
                </h3>
                <p class="text-gray-500">
                    {{ emptyDescription || 'No se encontraron productos para mostrar.' }}
                </p>
            </div>
        </div>

        <!-- Products List -->
        <div v-else class="products-list">
            <div class="overflow-y-auto max-h-96 custom-scrollbar">
                <ProductListItem v-for="product in products" :key="product.id" :product="product"
                    :disabled="isProductDisabled(product)" :selected="isProductSelected(product)"
                    @select="handleProductSelect" />
            </div>

            <!-- Products count -->
            <div v-if="products.length > 0" class="mt-3 text-center">
                <p class="text-xs text-gray-500">
                    {{ products.length }} producto{{ products.length !== 1 ? 's' : '' }} encontrado{{ products.length
                        !== 1 ? 's' : '' }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'

// Components
import ProductListItem from './ProductListItem.vue'

// Icons
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'

// Props
interface Props {
    products: Product[]
    loading?: boolean
    emptyMessage?: string
    emptyDescription?: string
    selectedProduct?: Product | null
    disabledProductIds?: number[]
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    emptyMessage: '',
    emptyDescription: '',
    selectedProduct: null,
    disabledProductIds: () => []
})

// Emits
const emit = defineEmits<{
    'product-selected': [product: Product]
}>()

// Computed
const isProductDisabled = (product: Product) => {
    // Si está en la lista de productos deshabilitados
    if (props.disabledProductIds.includes(product.id)) {
        return true
    }

    // Si no está activo
    if (!product.active) {
        return true
    }

    // Si es categoría con stock ilimitado (arroces), nunca está deshabilitado por stock
    const categoryName = product.categoryName?.toLowerCase() || ''
    const productName = product.name?.toLowerCase() || ''

    if (categoryName.includes('arroz') || productName.includes('arroz')) {
        return false
    }

    // Para otras categorías, deshabilitar si stock <= 0
    return product.stock !== undefined && product.stock <= 0
}

const isProductSelected = (product: Product) => {
    return props.selectedProduct?.id === product.id
}

// Methods
const handleProductSelect = (product: Product) => {
    emit('product-selected', product)
}
</script>

<style scoped>
.product-list-view {
    width: 100%;
}

.empty-state {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.products-list {
    width: 100%;
}

/* Custom scrollbar styling */
.custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #10b981 transparent;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #10b981;
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #059669;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .custom-scrollbar {
        max-height: 300px;
        /* Reducir altura en mobile */
    }
}
</style>
