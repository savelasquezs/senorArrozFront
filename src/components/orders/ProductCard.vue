<template>
    <div class="product-card" :class="cardClasses" @click="handleClick">
        <!-- Product Name -->
        <h3 class="product-name">
            {{ product.name }}
        </h3>

        <!-- Product Price -->
        <div class="product-price">
            {{ formatCurrency(product.price) }}
        </div>

        <!-- Stock Indicator -->
        <div class="stock-indicator">
            <ProductStock :stock="product.stock" :has-unlimited-stock="hasUnlimitedStock" variant="text" size="sm" />
        </div>

        <!-- Loading Overlay -->
        <div v-if="isLoading" class="loading-overlay">
            <BaseLoading size="sm" />
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
import ProductStock from './ProductStock.vue'

// Props
interface Props {
    product: Product
    isSelected?: boolean
    variant?: 'default' | 'compact'
    disabled?: boolean
    isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isSelected: false,
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
const hasUnlimitedStock = computed(() => {
    // Categoría "arroces" tiene stock ilimitado
    return props.product.categoryName?.toLowerCase().includes('arro')
})

const isDisabled = computed(() => {
    if (props.disabled || !props.product.active) {
        return true
    }

    // Si es categoría con stock ilimitado (arroces), nunca está deshabilitado por stock
    if (hasUnlimitedStock.value) {
        return false
    }

    // Para otras categorías, deshabilitar si stock <= 0
    return props.product.stock !== undefined && props.product.stock <= 0
})

const cardClasses = computed(() => {
    const classes = {
        'disabled': isDisabled.value,
        'selected': props.isSelected,
        'loading': props.isLoading,
        'compact': props.variant === 'compact'
    }
    return classes
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
    if (isDisabled.value || props.isLoading) return

    try {
        ordersStore.addProduct(props.product)
        success('Producto agregado', 1500, `${props.product.name}`)
        emit('product-click', props.product)
        emit('product-add', props.product)
    } catch (error) {
        console.error('Error adding product to order:', error)
    }
}
</script>

<style scoped>
.product-card {
    position: relative;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
}

/* Compact variant */
.product-card.compact {
    padding: 0.75rem;
}

/* Hover State - Available Products */
.product-card:hover:not(.disabled) {
    background: #f0fdf4;
    /* emerald-50 */
    border-color: #10b981;
    /* emerald-500 */
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Disabled State - Out of Stock */
.product-card.disabled {
    opacity: 0.6;
    background: #f9fafb;
    /* gray-50 */
    border-color: #ef4444;
    /* red-500 */
    cursor: not-allowed;
}

/* Selected State */
.product-card.selected {
    background: #d1fae5;
    /* emerald-100 */
    border-color: #059669;
    /* emerald-600 */
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.product-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
    margin-bottom: 0.5rem;
    line-height: 1.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

.product-price {
    font-size: 1rem;
    font-weight: 600;
    color: #059669;
    /* emerald-600 */
    margin-bottom: 0.5rem;
}

.stock-indicator {
    font-size: 0.75rem;
    color: #6b7280;
}

.loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
}
</style>
