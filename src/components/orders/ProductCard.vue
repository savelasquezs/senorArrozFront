<template>
    <div class="product-card group cursor-pointer bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-emerald-300 transition-all duration-200"
        :class="cardClasses" @click="handleClick">

        <!-- Product Image -->
        <div class="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
            <!-- Placeholder Image -->
            <ShoppingBagIcon class="h-8 w-8 text-gray-400" />

            <!-- Stock Overlay -->
            <div v-if="showStock && product.stock !== undefined" class="absolute top-1 right-1">
                <ProductStock :stock="product.stock" variant="badge" size="sm" />
            </div>

            <!-- Loading Overlay -->
            <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <BaseLoading size="sm" />
            </div>
        </div>

        <!-- Product Info -->
        <div class="p-3">
            <!-- Product Name -->
            <h3 class="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {{ product.name }}
            </h3>

            <!-- Category Badge (only in default variant) -->
            <div v-if="variant === 'default'" class="mb-1">
                <BaseBadge type="secondary" :text="product.categoryName || 'Sin categoría'" size="sm" />
            </div>

            <!-- Price -->
            <div class="text-base font-semibold text-gray-900 mb-1">
                {{ formatCurrency(product.price) }}
            </div>

            <!-- Stock Info (only in default variant) -->
            <div v-if="variant === 'default' && product.stock !== undefined"
                class="flex items-center justify-between mb-2">
                <span class="text-xs text-gray-500">
                    Stock: {{ product.stock }}
                </span>
                <ProductStock :stock="product.stock" variant="text" size="sm" />
            </div>

            <!-- Add Button -->
            <BaseButton @click.stop="handleAddToOrder" variant="primary" :size="buttonSize" :loading="isLoading"
                :disabled="isDisabled" class="w-full">
                <span class="flex items-center">

                    <PlusIcon class="w-4 h-4 mr-1" />
                    {{ buttonText }}

                </span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useToast } from '@/composables/useToast'
import type { Product } from '@/types/order'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import ProductStock from './ProductStock.vue'

// Icons
import { ShoppingBagIcon, PlusIcon } from '@heroicons/vue/24/outline'

// Props
interface Props {
    product: Product
    isSelected?: boolean
    showStock?: boolean
    variant?: 'default' | 'compact' | 'featured'
    disabled?: boolean
    isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isSelected: false,
    showStock: true,
    variant: 'default',
    disabled: false,
    isLoading: false
})

// Emits
const emit = defineEmits<{
    'product-click': [product: Product]
    'product-add': [product: Product]
}>()

// Composables
const ordersStore = useOrdersStore()
const { success } = useToast()

// Computed
const isDisabled = computed(() => {
    return props.disabled ||
        !props.product.active ||
        (props.product.stock !== undefined && props.product.stock < 0) // Solo deshabilitar si stock es negativo
})

const cardClasses = computed(() => {
    const classes = []

    // Variant-specific classes
    switch (props.variant) {
        case 'compact':
            classes.push('p-1')
            break
        case 'featured':
            classes.push('ring-2 ring-emerald-500 ring-opacity-50')
            break
        default:
            classes.push('p-2')
    }

    // State classes
    if (isDisabled.value) {
        classes.push('opacity-50 cursor-not-allowed')
    }

    if (props.isSelected) {
        classes.push('ring-2 ring-emerald-500')
    }

    return classes.join(' ')
})

const buttonSize = computed(() => {
    switch (props.variant) {
        case 'compact':
            return 'sm'
        case 'featured':
            return 'md'
        default:
            return 'sm'
    }
})

const buttonText = computed(() => {
    if (props.isLoading) return 'Agregando...'
    if (isDisabled.value) return 'No disponible'
    return 'Agregar'
})

// Methods
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

const handleClick = () => {
    if (isDisabled.value) return

    emit('product-click', props.product)
}

const handleAddToOrder = async () => {
    if (isDisabled.value || props.isLoading) return

    try {
        await ordersStore.addProductToActiveOrder(props.product)
        success('Producto agregado', 1500, `${props.product.name} agregado al pedido`)
        emit('product-add', props.product)
    } catch (error) {
        console.error('Error adding product to order:', error)
    }
}
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.product-card {
    position: relative;
}
</style>
