<template>
    <BaseCard class="order-header" :class="headerClasses">
        <!-- Header Content -->
        <div class="flex items-center gap-2">
            <!-- Order Type Selector -->
            <BaseSelect :model-value="internalOrderType" @update:model-value="handleTypeChange"
                :options="orderTypeOptions" placeholder="Tipo de pedido" size="sm" class="min-w-32" value-key="value"
                display-key="label" />

            <!-- Clear Button -->
            <BaseButton v-if="showClearButton" @click="handleClear" variant="ghost" size="sm"
                :disabled="totalItems === 0" class="text-gray-500 hover:text-red-600">
                <TrashIcon class="w-4 h-4 mr-1" />
                Limpiar
            </BaseButton>
        </div>
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <!-- Left Section: Order Info -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <!-- Order Type Badge -->
                <div class="flex items-center gap-3">
                    <BaseBadge :type="orderTypeColor" :text="orderTypeLabel" size="lg" />

                    <!-- Order Number (if available) -->
                    <span v-if="orderNumber" class="text-sm text-gray-600 font-medium">
                        #{{ orderNumber }}
                    </span>
                </div>

                <!-- Customer Info (simplified) -->
                <div class="flex items-center gap-2">
                    <UserIcon class="w-4 h-4 text-gray-500" />
                    <span class="text-sm text-gray-700">
                        {{ customerName || 'Cliente no seleccionado' }}
                    </span>
                </div>
            </div>

            <!-- Right Section: Totals and Actions -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <!-- Order Summary -->
                <div class="flex items-center gap-4">
                    <!-- Items Count -->
                    <div class="flex items-center gap-2">
                        <ShoppingBagIcon class="w-4 h-4 text-gray-500" />
                        <span class="text-sm text-gray-700">
                            {{ totalItems }} {{ totalItems === 1 ? 'producto' : 'productos' }}
                        </span>
                    </div>

                    <!-- Total Amount -->
                    <div class="flex items-center gap-2">
                        <CurrencyDollarIcon class="w-4 h-4 text-gray-500" />
                        <span class="text-lg font-semibold text-gray-900">
                            {{ formatCurrency(totalAmount) }}
                        </span>
                    </div>
                </div>

                <!-- Actions -->

            </div>
        </div>

        <!-- Customer Section -->
        <div v-if="showCustomerSection" class="mt-4 border-t border-gray-200 pt-4">
            <CustomerSection :selected-customer="internalSelectedCustomer" :selected-address="internalSelectedAddress"
                :order-type="internalOrderType" :loading="loading" @customer-selected="handleCustomerSelect"
                @address-selected="handleAddressSelect" />
        </div>

        <!-- Loading Overlay -->
        <div v-if="loading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <BaseLoading size="md" />
        </div>
    </BaseCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OrderType } from '@/types/order'
import type { Customer, CustomerAddress } from '@/types/customer'
import { useFormatting } from '@/composables/useFormatting'

// Components
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import CustomerSection from '@/components/orders/CustomerSection.vue'

// Icons
import {
    UserIcon,
    ShoppingBagIcon,
    CurrencyDollarIcon,
    TrashIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    orderType: OrderType
    orderNumber?: string
    customerName?: string
    selectedCustomer?: Customer
    selectedAddress?: CustomerAddress
    totalItems: number
    totalAmount: number
    showClearButton?: boolean
    showCustomerSection?: boolean
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showClearButton: true,
    showCustomerSection: true,
    loading: false
})

// Emits
const emit = defineEmits<{
    (e: 'typeChange', type: OrderType): void
    (e: 'clear'): void
    (e: 'customerSelected', customer: Customer | undefined): void
    (e: 'addressSelected', address: CustomerAddress | undefined): void
}>()

// Composables
const { formatCurrency } = useFormatting()

// Internal state for customer and address
const internalSelectedCustomer = ref<Customer | undefined>(props.selectedCustomer)
const internalSelectedAddress = ref<CustomerAddress | undefined>(props.selectedAddress)
const internalOrderType = ref<OrderType>(props.orderType)

// Watch for prop changes to sync internal state
watch(() => props.selectedCustomer, (newCustomer) => {
    internalSelectedCustomer.value = newCustomer
}, { immediate: true })

watch(() => props.selectedAddress, (newAddress) => {
    internalSelectedAddress.value = newAddress
}, { immediate: true })

watch(() => props.orderType, (newType) => {
    internalOrderType.value = newType
}, { immediate: true })

// Computed
const orderTypeOptions = computed(() => [
    { value: 'onsite', label: 'En el local' },
    { value: 'delivery', label: 'A domicilio' },
    { value: 'reservation', label: 'Reservación' }
])

const orderTypeLabel = computed(() => {
    const option = orderTypeOptions.value.find(opt => opt.value === internalOrderType.value)
    return option?.label || internalOrderType.value
})

const orderTypeColor = computed(() => {
    switch (internalOrderType.value) {
        case 'onsite':
            return 'success'
        case 'delivery':
            return 'primary'
        case 'reservation':
            return 'warning'
        default:
            return 'secondary'
    }
})

const headerClasses = computed(() => [
    'relative transition-all duration-200',
    {
        'border-emerald-200 bg-emerald-50': internalOrderType.value === 'onsite',
        'border-blue-200 bg-blue-50': internalOrderType.value === 'delivery',
        'border-yellow-200 bg-yellow-50': internalOrderType.value === 'reservation',
        'border-gray-200 bg-white': !internalOrderType.value
    }
])

// Methods
const handleTypeChange = (newType: OrderType) => {
    internalOrderType.value = newType
    emit('typeChange', newType)
}

const handleClear = () => {
    emit('clear')
}

const handleCustomerSelect = (customer: Customer | undefined) => {
    internalSelectedCustomer.value = customer
    internalSelectedAddress.value = undefined // Clear address when customer changes
    emit('customerSelected', customer)
}

const handleAddressSelect = (address: CustomerAddress | undefined) => {
    internalSelectedAddress.value = address
    emit('addressSelected', address)
}
</script>

<style scoped>
.order-header {
    border-width: 2px;
    transition: all 0.2s;
}

.order-header:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .order-header .flex-col {
        gap: 0.5rem;
    }
}
</style>
