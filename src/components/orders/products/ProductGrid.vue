<template>
    <div class="product-grid-container">
        <!-- Loading State with Skeleton -->
        <div v-if="loading" class="grid gap-4" :class="gridClasses">
            <ProductCardSkeleton v-for="n in skeletonCount" :key="`skeleton-${n}`" :variant="cardVariant" />
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

        <!-- Products Grid -->
        <div v-else class="products-grid" :class="gridClasses">
            <ProductCard v-for="product in products" :key="product.id" :product="product" :variant="cardVariant"
                :is-selected="isProductSelected(product)" @product-click="handleProductClick"
                @product-add="handleProductAdd" />

        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useOrdersStore } from '@/store/orders'
import type { Product } from '@/types/order'

// Components
import ProductCard from '@/components/orders/products/ProductCard.vue'
import ProductCardSkeleton from '@/components/orders/products/ProductCardSkeleton.vue'

// Icons
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'

// Props
interface Props {
    products?: Product[]
    loading?: boolean
    columns?: number
    gap?: 'sm' | 'md' | 'lg'
    showCategories?: boolean
    emptyMessage?: string
    emptyDescription?: string
    cardVariant?: 'default' | 'compact'
    showStock?: boolean
    selectedProducts?: Product[]
    skeletonCount?: number
}

const props = withDefaults(defineProps<Props>(), {
    products: () => [],
    loading: false,
    columns: 0, // 0 = auto responsive
    gap: 'md',
    showCategories: true,
    emptyMessage: '',
    emptyDescription: '',
    cardVariant: 'default',
    showStock: true,
    selectedProducts: () => [],
    skeletonCount: 8
})

// Emits
const emit = defineEmits<{
    'product-click': [product: Product]
    'product-add': [product: Product]
    'products-loaded': [products: Product[]]
}>()

// Composables
const ordersStore = useOrdersStore()

// Computed
const products = computed(() => {
    return props.products.length > 0 ? props.products : ordersStore.filteredProducts
})

const gridClasses = computed(() => {
    const classes = []

    // Gap classes
    switch (props.gap) {
        case 'sm':
            classes.push('gap-2')
            break
        case 'lg':
            classes.push('gap-6')
            break
        default:
            classes.push('gap-4')
    }

    // Column classes
    if (props.columns > 0) {
        // Fixed columns
        classes.push(`grid-cols-${props.columns}`)
    } else {
        // Responsive columns
        classes.push('grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6')
    }

    classes.push('grid')
    return classes.join(' ')
})

const skeletonCount = computed(() => {
    if (props.columns > 0) {
        return Math.min(props.skeletonCount, props.columns * 2)
    }
    return props.skeletonCount
})

// Methods
const isProductSelected = (product: Product): boolean => {
    return props.selectedProducts.some(p => p.id === product.id)
}

const handleProductClick = (product: Product) => {
    emit('product-click', product)
}

const handleProductAdd = (product: Product) => {
    emit('product-add', product)
}

// Watchers
watch(products, (newProducts) => {
    if (newProducts.length > 0) {
        emit('products-loaded', newProducts)
    }
}, { immediate: true })
</script>

<style scoped>
.product-grid-container {
    width: 100%;
}

.empty-state {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.products-grid {
    width: 100%;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .products-grid {
        grid-template-columns: repeat(1, minmax(0, 1fr));
    }
}

@media (min-width: 641px) and (max-width: 768px) {
    .products-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .products-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (min-width: 1025px) and (max-width: 1280px) {
    .products-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (min-width: 1281px) and (max-width: 1536px) {
    .products-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
    }
}

@media (min-width: 1537px) {
    .products-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
    }
}
</style>
