<template>
    <div class="order-item-compact">
        <!-- Primera línea: Nombre del producto + precio base + acciones -->
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <h4 class="product-name text-sm font-medium text-gray-900">{{ item.productName }}</h4>
                <span class="text-xs text-gray-500 whitespace-nowrap">Precio base: {{ formatCurrency(item.productPrice)
                }}</span>
            </div>
            <div class="flex items-center ">
                <BaseButton @click="handleRemove" variant="ghost" size="sm" title="Eliminar">
                    <TrashIcon class="w-4 h-4" />
                </BaseButton>
            </div>
        </div>

        <!-- Segunda línea: Cantidad + Precio + Descuento + Total (todo en una fila) -->
        <div class="flex items-center gap-2 text-sm">
            <!-- Controles de cantidad compactos -->
            <div class="flex items-center gap-1">
                <BaseButton @click="decreaseQuantity" variant="outline" size="sm" :disabled="localQuantity <= 1"
                    class="h-6 w-6 p-0">
                    <MinusIcon class="w-3 h-3" />
                </BaseButton>
                <span class="quantity-display font-medium text-gray-900 min-w-[2rem] text-center">
                    {{ localQuantity }}
                </span>
                <BaseButton @click="increaseQuantity" variant="outline" size="sm" class="h-6 w-6 p-0">
                    <PlusIcon class="w-3 h-3" />
                </BaseButton>
            </div>

            <!-- Separador visual -->
            <span class="text-gray-300">│</span>

            <!-- Precio unitario (editable) -->
            <div class="flex items-center gap-1">
                <input v-model.number="localUnitPrice" type="number" min="0" step="100" @input="handlePriceChange"
                    class="w-20 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>

            <!-- Separador visual -->
            <span class="text-gray-300">│</span>

            <!-- Descuento (editable inline) -->
            <div class="flex items-center gap-1">
                <span class="text-gray-500 text-xs">Desc:</span>
                <input v-model.number="discountPercentage" type="number" min="0" max="100" step="0.1"
                    @input="updateDiscountFromPercentage"
                    class="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
                <span class="text-xs">%</span>
            </div>

            <!-- Separador visual -->
            <span class="text-gray-300">│</span>

            <!-- Total (destacado) -->
            <div class="flex items-center gap-1 ml-auto">
                <span class="text-gray-500 text-xs">Total:</span>
                <span class="font-bold text-emerald-600">{{ formatCurrency(calculatedSubtotal) }}</span>
            </div>
        </div>

        <!-- Mostrar ahorro si hay descuento (opcional, tercera línea pequeña) -->
        <div v-if="discountAmount > 0" class="mt-1 text-xs text-green-600 text-right">
            Ahorro: {{ formatCurrency(discountAmount) }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OrderItem } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'

// Icons
import {
    PlusIcon,
    MinusIcon,
    TrashIcon
} from '@heroicons/vue/24/outline'

interface Props {
    item: OrderItem
    tabId: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
    quantityChange: [itemTempId: string, quantity: number]
    priceChange: [itemTempId: string, price: number]
    discountChange: [itemTempId: string, discountValue: number]
    remove: [itemTempId: string]
}>()

// Composables
const { formatCurrency } = useFormatting()

// Estado local
const localQuantity = ref(props.item.quantity)
const localUnitPrice = ref(props.item.unitPrice)

// Descuento como porcentaje (UI) y valor (backend)
const discountPercentage = ref(0)

// Calcular descuento en porcentaje basado en el valor actual
const calculateDiscountPercentage = () => {
    const subtotalSinDescuento = localQuantity.value * localUnitPrice.value
    if (subtotalSinDescuento > 0) {
        discountPercentage.value = (props.item.discount / subtotalSinDescuento) * 100
    } else {
        discountPercentage.value = 0
    }
}

// Inicializar porcentaje de descuento
calculateDiscountPercentage()

// Subtotal sin descuento
const subtotalSinDescuento = computed(() => {
    return localQuantity.value * localUnitPrice.value
})

// Valor del descuento calculado
const discountAmount = computed(() => {
    return (subtotalSinDescuento.value * discountPercentage.value) / 100
})

// Subtotal final calculado
const calculatedSubtotal = computed(() => {
    return subtotalSinDescuento.value - discountAmount.value
})

// Métodos
const decreaseQuantity = () => {
    if (localQuantity.value > 1) {
        localQuantity.value--
        handleQuantityChange()
    }
}

const increaseQuantity = () => {
    if (localQuantity.value < 999) {
        localQuantity.value++
        handleQuantityChange()
    }
}

const handleQuantityChange = () => {
    emit('quantityChange', props.item.tempId, localQuantity.value)
}

const handlePriceChange = () => {
    emit('priceChange', props.item.tempId, localUnitPrice.value)
}

const updateDiscountFromPercentage = () => {
    // El valor se calcula automáticamente en discountAmount
    // Al backend se envía el valor calculado, no el porcentaje
    emit('discountChange', props.item.tempId, discountAmount.value)
}

const handleRemove = () => {
    emit('remove', props.item.tempId)
}

// Watchers para sincronizar con props
watch(() => props.item.quantity, (newQuantity) => {
    localQuantity.value = newQuantity
})

watch(() => props.item.unitPrice, (newPrice) => {
    localUnitPrice.value = newPrice
})

watch(() => props.item.discount, () => {
    calculateDiscountPercentage()
})
</script>

<style scoped>
.order-item-compact {
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.75rem;
    transition: all 0.2s;
}

.order-item-compact:hover {
    box-shadow: 0 2px 4px 0 rgb(0 0 0 / 0.05);
    border-color: #d1d5db;
}

.product-name {
    flex: 0 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.quantity-display {
    display: inline-block;
    min-width: 2rem;
    text-align: center;
}

/* Eliminar spinner de input number */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}
</style>
