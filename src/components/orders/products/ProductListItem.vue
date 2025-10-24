<template>
    <div class="product-list-item" :class="itemClasses" @click="handleClick">
        <div class="flex justify-between items-center">
            <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900 truncate">
                    {{ product.name }}
                </h4>
                <p class="text-sm text-gray-500">
                    {{ availabilityText }}
                </p>
            </div>
            <div class="text-right flex-shrink-0 ml-4">
                <p class="font-semibold text-emerald-600">
                    {{ formatCurrency(product.price) }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatting } from '@/composables/useFormatting'
import type { Product } from '@/types/product'

// Props
interface Props {
    product: Product
    disabled?: boolean
    selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    selected: false
})

// Emits
const emit = defineEmits<{
    select: [product: Product]
}>()

// Composables
const { formatCurrency } = useFormatting()

// Computed
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

const hasUnlimitedStock = computed(() => {
    // Categoría "arroces" tiene stock ilimitado
    // Buscar en categoryName o en el nombre del producto
    const categoryName = props.product.categoryName?.toLowerCase() || ''
    const productName = props.product.name?.toLowerCase() || ''

    return categoryName.includes('arroz') || productName.includes('arroz')
})

const availabilityText = computed(() => {
    if (hasUnlimitedStock.value) {
        return 'Disponible'
    }

    if (props.product.stock === undefined || props.product.stock === null) {
        return 'Disponible'
    }

    if (props.product.stock <= 0) {
        return 'Sin stock'
    }

    return `Disponible (${props.product.stock} unidades)`
})

const itemClasses = computed(() => {
    const classes = [
        'product-list-item',
        'p-3',
        'border-b',
        'border-gray-200',
        'cursor-pointer',
        'transition-all',
        'duration-200',
        'hover:bg-emerald-50'
    ]

    if (isDisabled.value) {
        classes.push('opacity-60', 'cursor-not-allowed', 'hover:bg-gray-50')
    }

    if (props.selected) {
        classes.push('bg-emerald-100', 'border-emerald-200')
    }

    return classes
})

// Methods
const handleClick = () => {
    if (isDisabled.value) return

    emit('select', props.product)
}
</script>

<style scoped>
.product-list-item:last-child {
    border-bottom: none;
}

/* Hover effect mejorado */
.product-list-item:hover:not(.opacity-60) {
    transform: translateX(2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
</style>
