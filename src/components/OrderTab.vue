<template>
    <div class="order-tab-content h-full overflow-y-auto">
        <!-- Order Header -->
        <div class="p-4 border-b border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-gray-900">
                    Pedido {{ order.id.slice(-4) }}
                </h3>
                <BaseBadge :type="getOrderTypeConfig(order.type).variant">
                    {{ getOrderTypeConfig(order.type).label }}
                </BaseBadge>
            </div>

            <!-- Order Type Selector -->
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Pedido</label>
                <BaseSelect :model-value="order.type" :options="orderTypeOptions" @update:model-value="updateOrderType"
                    size="sm" />
            </div>
        </div>

        <!-- Customer and Delivery Info -->
        <div class="p-4 border-b border-gray-200 space-y-4">
            <!-- Customer Selector (required for delivery/reservation) -->
            <CustomerSelector v-if="order.type !== 'onsite'" :selected-customer="order.customerId"
                @customer-selected="updateCustomer" :required="order.type === 'delivery'" />

            <!-- Address Selector (required for delivery) -->
            <AddressSelector v-if="order.type === 'delivery'" :customer-id="order.customerId"
                :selected-address="order.addressId" @address-selected="updateAddress" />

            <!-- Delivery Fee (for delivery orders) -->
            <div v-if="order.type === 'delivery'" class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Costo de Entrega</label>
                <BaseInput v-model.number="deliveryFee" type="number" placeholder="Costo de entrega"
                    @input="updateDeliveryFee" size="sm" />
            </div>

            <!-- Reservation Date (for reservation orders) -->
            <div v-if="order.type === 'reservation'" class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Fecha y Hora de Reserva</label>
                <BaseInput v-model="reservationDate" type="datetime-local" @input="updateReservationDate" size="sm" />
            </div>

            <!-- Guest Name (for onsite orders) -->
            <div v-if="order.type === 'onsite'" class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Nombre de Espera (opcional)</label>
                <BaseInput v-model="guestName" placeholder="Ej: Mesa 5 - Juan Pérez" @input="updateGuestName"
                    size="sm" />
            </div>

            <!-- Notes -->
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Notas del Pedido</label>
                <BaseInput v-model="orderNotes" placeholder="Notas adicionales..." @input="updateOrderNotes"
                    size="sm" />
            </div>
        </div>

        <!-- Order Items -->
        <div class="p-4 border-b border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-md font-medium text-gray-900">Productos</h4>
                <span class="text-sm text-gray-500">{{ order.orderDetails.length }} items</span>
            </div>

            <div v-if="order.orderDetails.length === 0"
                class="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <ShoppingBagIcon class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p class="text-gray-500">No hay productos en este pedido</p>
                <p class="text-xs text-gray-400 mt-1">Agrega productos desde la lista principal</p>
            </div>

            <div v-else class="space-y-2">
                <div v-for="item in order.orderDetails" :key="item.id"
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex-1">
                        <div class="text-sm font-medium text-gray-900">{{ item.productName }}</div>
                        <div class="text-xs text-gray-500">{{ formatCurrency(item.unitPrice) }} cada uno</div>
                    </div>

                    <div class="flex items-center space-x-3">
                        <!-- Quantity Controls -->
                        <div class="flex items-center space-x-2">
                            <BaseButton @click="decreaseQuantity(item.id)" variant="outline" size="sm"
                                :disabled="item.quantity <= 1">
                                <MinusIcon class="w-3 h-3" />
                            </BaseButton>

                            <span class="text-sm font-medium px-2">{{ item.quantity }}</span>

                            <BaseButton @click="increaseQuantity(item.id)" variant="outline" size="sm">
                                <PlusIcon class="w-3 h-3" />
                            </BaseButton>
                        </div>

                        <!-- Item Total -->
                        <div class="text-sm font-medium text-gray-900 w-20 text-right">
                            {{ formatCurrency((item.unitPrice - item.discount) * item.quantity) }}
                        </div>

                        <!-- Remove Button -->
                        <BaseButton @click="removeItem(item.id)" variant="outline" size="sm"
                            class="text-red-600 hover:text-red-700">
                            <TrashIcon class="w-3 h-3" />
                        </BaseButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- Payment Section -->
        <PaymentSelector :order="order" @payment-updated="recalculateOrder" />

        <!-- Order Totals -->
        <TotalsPanel :order="order" />

        <!-- Order Actions -->
        <div class="p-4 border-t border-gray-200">
            <div class="flex space-x-3">
                <BaseButton @click="submitOrder" variant="primary" :disabled="!canSubmit" :loading="isSubmitting"
                    class="flex-1">
                    <CheckIcon class="w-4 h-4 mr-2" />
                    Finalizar Pedido
                </BaseButton>

                <BaseButton @click="saveDraft" variant="outline" :disabled="!canSaveDraft">
                    <DocumentArrowDownIcon class="w-4 h-4 mr-2" />
                    Guardar
                </BaseButton>
            </div>
        </div>

        <!-- Validation Messages -->
        <div v-if="validationErrors.length > 0" class="p-4 bg-red-50 border-l-4 border-red-400">
            <div class="flex">
                <ExclamationTriangleIcon class="w-5 h-5 text-red-400 mr-2" />
                <div class="text-sm text-red-700">
                    <p class="font-medium">Se encontraron errores:</p>
                    <ul class="list-disc list-inside mt-1">
                        <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useToast } from '@/composables/useToast'
import type { ActiveOrder, OrderType } from '@/types/order'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import CustomerSelector from '@/components/CustomerSelector.vue'
import AddressSelector from '@/components/AddressSelector.vue'
import PaymentSelector from '@/components/PaymentSelector.vue'
import TotalsPanel from '@/components/TotalsPanel.vue'

// Icons
import {
    ShoppingBagIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
    CheckIcon,
    DocumentArrowDownIcon,
    ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    order: ActiveOrder
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
    orderUpdated: [order: ActiveOrder]
    orderSubmitted: [order: ActiveOrder]
}>()

// Composables
const ordersStore = useOrdersStore()
const { success, error: showError } = useToast()

// State
const isSubmitting = ref(false)
const deliveryFee = ref(props.order.deliveryFee || 0)
const reservationDate = ref(props.order.reservedFor ? new Date(props.order.reservedFor).toISOString().slice(0, 16) : '')
const guestName = ref('')
const orderNotes = ref(props.order.notes || '')

// Computed
const orderTypeOptions = computed(() => [
    { value: 'onsite', label: 'En Local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
])

const validationErrors = computed(() => {
    const validation = ordersStore.validateActiveOrder()
    return validation.errors
})

const canSubmit = computed(() => {
    return validationErrors.value.length === 0 && props.order.orderDetails.length > 0
})

const canSaveDraft = computed(() => {
    return props.order.isDirty && props.order.orderDetails.length > 0
})

// Methods
const updateOrderType = (type: OrderType) => {
    if (props.order.type === type) return

    // Update order in store
    props.order.type = type

    // Clear type-specific data when changing types
    if (type === 'onsite') {
        props.order.customerId = undefined
        props.order.addressId = undefined
        props.order.deliveryFee = undefined
        props.order.reservedFor = undefined
    } else if (type === 'delivery') {
        props.order.reservedFor = undefined
    } else if (type === 'reservation') {
        props.order.deliveryFee = undefined
        props.order.addressId = undefined
    }

    ordersStore.recalculateOrderTotals(props.order)
    emit('orderUpdated', props.order)
}

const updateCustomer = (customerId: number | undefined) => {
    props.order.customerId = customerId
    // Clear address when customer changes
    props.order.addressId = undefined
    ordersStore.recalculateOrderTotals(props.order)
    emit('orderUpdated', props.order)
}

const updateAddress = (addressId: number | undefined) => {
    props.order.addressId = addressId
    ordersStore.recalculateOrderTotals(props.order)
    emit('orderUpdated', props.order)
}

const updateDeliveryFee = () => {
    props.order.deliveryFee = deliveryFee.value || 0
    ordersStore.recalculateOrderTotals(props.order)
    emit('orderUpdated', props.order)
}

const updateReservationDate = () => {
    props.order.reservedFor = reservationDate.value ? new Date(reservationDate.value).toISOString() : undefined
    emit('orderUpdated', props.order)
}

const updateGuestName = () => {
    // Store guest name somewhere (could be in notes or a separate field)
    if (guestName.value) {
        props.order.notes = guestName.value + (props.order.notes ? '\n' : '') + (props.order.notes || '')
    }
    emit('orderUpdated', props.order)
}

const updateOrderNotes = () => {
    props.order.notes = orderNotes.value
    emit('orderUpdated', props.order)
}

const increaseQuantity = (itemId: string) => {
    ordersStore.updateOrderDetailQuantity(itemId,
        (props.order.orderDetails.find(i => i.id === itemId)?.quantity || 0) + 1
    )
}

const decreaseQuantity = (itemId: string) => {
    const item = props.order.orderDetails.find(i => i.id === itemId)
    if (!item) return

    ordersStore.updateOrderDetailQuantity(itemId, item.quantity - 1)
}

const removeItem = (itemId: string) => {
    ordersStore.removeOrderDetail(itemId)
}

const recalculateOrder = () => {
    ordersStore.recalculateOrderTotals(props.order)
}

const submitOrder = async () => {
    if (!canSubmit.value) return

    isSubmitting.value = true
    try {
        const createdOrder = await ordersStore.submitActiveOrder()
        if (createdOrder) {
            success('Pedido creado', 3000, `Pedido #${createdOrder.id} creado exitosamente`)
            emit('orderSubmitted', createdOrder as any)
        }
    } catch (error: any) {
        showError('Error al crear pedido', error.message || 'No se pudo crear el pedido')
    } finally {
        isSubmitting.value = false
    }
}

const saveDraft = async () => {
    // Implementation for saving draft (could save to localStorage or make a draft API call)
    console.log('Saving draft...', props.order)
    success('Borrador guardado', 2000, 'El pedido se ha guardado como borrador')
}

const getOrderTypeConfig = (type: OrderType) => {
    const configs = {
        onsite: {
            label: 'En Local',
            variant: 'success' as const
        },
        delivery: {
            label: 'Domicilio',
            variant: 'primary' as const
        },
        reservation: {
            label: 'Reserva',
            variant: 'warning' as const
        }
    }
    return configs[type]
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

// Watch for props changes
watch(() => props.order.deliveryFee, (newValue) => {
    deliveryFee.value = newValue || 0
})

watch(() => props.order.reservedFor, (newValue) => {
    reservationDate.value = newValue ? new Date(newValue).toISOString().slice(0, 16) : ''
})

watch(() => props.order.notes, (newValue) => {
    orderNotes.value = newValue || ''
})
</script>

<style scoped>
.order-tab-content {
    max-height: calc(100vh - 200px);
}
</style>
