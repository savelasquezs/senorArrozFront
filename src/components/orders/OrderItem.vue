<template>
    <div class="order-item-card">
        <!-- Product Info -->
        <div class="product-info">
            <h4 class="product-name">{{ item.productName }}</h4>
            <p class="text-gray-500 text-sm">Precio base: {{ formatCurrency(item.productPrice) }}</p>
        </div>

        <!-- Quantity Controls -->
        <div class="quantity-controls">
            <BaseButton @click="decreaseQuantity" variant="outline" size="sm" :disabled="localQuantity <= 1">
                <MinusIcon class="w-4 h-4" />
            </BaseButton>
            <BaseInput v-model="localQuantity" type="number" min="1" max="999" class="quantity-input"
                @input="handleQuantityChange" />
            <BaseButton @click="increaseQuantity" variant="outline" size="sm">
                <PlusIcon class="w-4 h-4" />
            </BaseButton>
        </div>

        <!-- Price Controls -->
        <div class="price-controls">
            <!-- Precio Unitario -->
            <div class="price-input">
                <BaseInput v-model="localUnitPrice" label="Precio Unit." type="number" step="0.01" min="0"
                    @input="handlePriceChange" />
            </div>

            <!-- Descuento por Porcentaje -->
            <div class="discount-input">
                <BaseInput v-model="discountPercentage" label="Descuento %" type="number" step="0.1" min="0" max="100"
                    @input="updateDiscountFromPercentage" />
                <span class="discount-amount">Ahorro: {{ formatCurrency(discountAmount) }}</span>
            </div>
        </div>

        <!-- Subtotal -->
        <div class="subtotal">
            <div class="subtotal-line">
                <span>Subtotal ({{ localQuantity }} × {{ formatCurrency(localUnitPrice) }}):</span>
                <span>{{ formatCurrency(subtotalSinDescuento) }}</span>
            </div>
            <div v-if="discountAmount > 0" class="discount-line text-green-600">
                <span>Descuento ({{ discountPercentage }}%):</span>
                <span>-{{ formatCurrency(discountAmount) }}</span>
            </div>
            <div class="subtotal-line font-bold border-t pt-2">
                <span>Total:</span>
                <span>{{ formatCurrency(calculatedSubtotal) }}</span>
            </div>
        </div>

        <!-- Actions -->
        <div class="actions">
            <BaseButton @click="handleEdit" variant="outline" size="sm" title="Editar notas">
                <PencilIcon class="w-4 h-4" />
            </BaseButton>
            <BaseButton @click="handleRemove" variant="danger" size="sm" title="Eliminar producto">
                <TrashIcon class="w-4 h-4" />
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OrderItem } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

// Icons
import {
    PlusIcon,
    MinusIcon,
    PencilIcon,
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
    edit: [itemTempId: string]
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

const handleEdit = () => {
    emit('edit', props.item.tempId)
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
.order-item-card {
    @apply bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200;
}

.product-info {
    @apply mb-3;
}

.product-name {
    @apply text-lg font-medium text-gray-900 mb-1;
}

.quantity-controls {
    @apply flex items-center gap-2 mb-3;
}

.quantity-input {
    @apply w-20 text-center;
}

.price-controls {
    @apply grid grid-cols-2 gap-3 mb-3;
}

.price-input {
    @apply flex flex-col;
}

.discount-input {
    @apply flex flex-col;
}

.discount-amount {
    @apply text-xs text-gray-500 mt-1;
}

.subtotal {
    @apply border-t border-gray-100 pt-3 mb-3;
}

.subtotal-line {
    @apply flex justify-between items-center text-sm mb-1;
}

.discount-line {
    @apply flex justify-between items-center text-sm mb-1;
}

.actions {
    @apply flex gap-2 justify-end;
}
</style>
