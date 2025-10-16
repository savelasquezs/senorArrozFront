<template>
    <div class="products-grid">
        <BaseLoading v-if="ordersStore.isLoading" text="Cargando productos..." />

        <div v-else-if="products.length === 0" class="text-center py-12">
            <ShoppingBagIcon class="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
            <p class="text-gray-500">No se encontraron productos para mostrar.</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <ProductCard v-for="product in products" :key="product.id" :product="product" variant="default"
                @product-click="onProductClick" @product-add="onProductAdd" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersStore } from '@/store/orders'
import type { Product } from '@/types/order'

// Components
import BaseLoading from '@/components/ui/BaseLoading.vue'
import ProductCard from '@/components/orders/ProductCard.vue'

// Icons
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'

// Props
interface Props {
    products?: Product[]
}

const props = withDefaults(defineProps<Props>(), {
    products: () => []
})

// Composables
const ordersStore = useOrdersStore()

// Computed
const products = computed(() => props.products.length > 0 ? props.products : ordersStore.filteredProducts)

// Methods
const onProductClick = (product: Product) => {
    // Handle product click if needed
    console.log('Product clicked:', product.name)
}

const onProductAdd = (product: Product) => {
    // Handle product add event if needed
    console.log('Product added:', product.name)
}
</script>

<style scoped>
/* Estilos específicos del grid si es necesario */
</style>