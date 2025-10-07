<template>
    <BaseCard class="customer-section" :class="sectionClasses">
        <!-- Section Header -->
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <UserIcon class="w-5 h-5 text-gray-600" />
                <h3 class="text-lg font-semibold text-gray-900">
                    Información del Cliente
                </h3>
            </div>

            <!-- Required Indicator -->
            <BaseBadge v-if="isCustomerRequired" type="warning" text="Obligatorio" size="sm" />
        </div>

        <!-- Customer Selection -->
        <div class="space-y-4">
            <!-- Customer Selector -->
            <CustomerSelector :selected-customer="selectedCustomer" :required="isCustomerRequired"
                @customer-selected="handleCustomerSelect" />

            <!-- Address Selector (only for delivery) -->
            <div v-if="orderType === 'delivery' && selectedCustomer" class="address-section">
                <AddressSelector :customer-id="selectedCustomer.id" :selected-address="selectedAddress?.id"
                    @address-selected="handleAddressSelect" />
            </div>

            <!-- Customer Information Display -->
            <div v-if="selectedCustomer" class="customer-info">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Customer Details -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="text-sm font-medium text-gray-700 mb-2">Datos del Cliente</h4>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <UserIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm text-gray-900">{{ selectedCustomer.name }}</span>
                            </div>
                            <div v-if="selectedCustomer.phone1" class="flex items-center gap-2">
                                <PhoneIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm text-gray-900">{{ selectedCustomer.phone1 }}</span>
                            </div>
                            <div v-if="selectedCustomer.phone2" class="flex items-center gap-2">
                                <PhoneIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm text-gray-900">{{ selectedCustomer.phone2 }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Delivery Information (only for delivery) -->
                    <div v-if="orderType === 'delivery' && selectedAddress" class="bg-blue-50 rounded-lg p-4">
                        <h4 class="text-sm font-medium text-gray-700 mb-2">Información de Entrega</h4>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <MapPinIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm text-gray-900">{{ selectedAddress.address }}</span>
                            </div>
                            <div v-if="selectedAddress.additionalInfo" class="flex items-center gap-2">
                                <InformationCircleIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm text-gray-900">{{ selectedAddress.additionalInfo }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <CurrencyDollarIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm font-medium text-gray-900">
                                    Domicilio: {{ formatCurrency(selectedAddress.deliveryFee) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Reservation Information (only for reservation) -->
                    <div v-if="orderType === 'reservation'" class="bg-yellow-50 rounded-lg p-4">
                        <h4 class="text-sm font-medium text-gray-700 mb-2">Información de Reservación</h4>
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <CalendarIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm text-gray-900">Fecha: Por definir</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <ClockIcon class="w-4 h-4 text-gray-500" />
                                <span class="text-sm text-gray-900">Hora: Por definir</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Validation Messages -->
            <div v-if="validationError" class="validation-error">
                <BaseAlert type="error" :message="validationError" />
            </div>
        </div>

        <!-- Loading Overlay -->
        <div v-if="loading" class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <BaseLoading size="md" />
        </div>
    </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderType } from '@/types/order'
import type { Customer, CustomerAddress } from '@/types/customer'
import { useFormatting } from '@/composables/useFormatting'
import { useOrdersStore } from '@/store/orders'

// Components
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import CustomerSelector from '@/components/CustomerSelector.vue'
import AddressSelector from '@/components/AddressSelector.vue'

// Icons
import {
    UserIcon,
    PhoneIcon,
    MapPinIcon,
    InformationCircleIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    ClockIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    selectedCustomer?: Customer
    selectedAddress?: CustomerAddress
    orderType: OrderType
    showCreateButton?: boolean
    compact?: boolean
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showCreateButton: true,
    compact: false,
    loading: false
})

// Emits
const emit = defineEmits<{
    (e: 'customerSelected', customer: Customer | undefined): void
    (e: 'addressSelected', address: CustomerAddress | undefined): void
}>()

// Composables
const { formatCurrency } = useFormatting()
const ordersStore = useOrdersStore()

// Computed
const isCustomerRequired = computed(() => {
    return props.orderType === 'delivery' || props.orderType === 'reservation'
})

const validationError = computed(() => {
    if (isCustomerRequired.value && !props.selectedCustomer) {
        return 'Selecciona un cliente para continuar'
    }

    if (props.orderType === 'delivery' && props.selectedCustomer && !props.selectedAddress) {
        return 'Selecciona una dirección de entrega'
    }

    return null
})

const sectionClasses = computed(() => [
    'relative transition-all duration-200',
    {
        'border-red-200 bg-red-50': validationError.value,
        'border-gray-200 bg-white': !validationError.value,
        'p-3': props.compact,
        'p-4': !props.compact
    }
])

// Methods
const handleCustomerSelect = (customerId: number | undefined) => {
    // Find customer by ID from the available customers in the store
    const customer = customerId ? ordersStore.customers.find(c => c.id === customerId) : undefined
    emit('customerSelected', customer)

    // Clear address when customer changes
    if (!customer) {
        emit('addressSelected', undefined)
    }
}

const handleAddressSelect = (addressId: number | undefined) => {
    // Find address by ID from the customer's addresses
    // This would typically come from a store or prop
    const address = addressId ? { id: addressId } as CustomerAddress : undefined
    emit('addressSelected', address)
}
</script>

<style scoped>
.customer-section {
    border-width: 2px;
    transition: all 0.2s;
}

.customer-section:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.validation-error {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: .5;
    }
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .customer-section .grid-cols-2 {
        grid-template-columns: repeat(1, minmax(0, 1fr));
    }
}
</style>
