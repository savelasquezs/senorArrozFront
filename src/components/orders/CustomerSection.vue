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
            <!-- Customer Selector (only when no customer selected) -->
            <div v-if="!selectedCustomer">
                <CustomerSelector :required="isCustomerRequired" @customer-selected="handleCustomerSelect" />
            </div>

            <!-- Customer Information Display -->
            <div v-if="selectedCustomer" class="customer-info space-y-4">
                <!-- Customer Details Card -->
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <!-- Customer Name -->
                    <div class="flex items-center gap-3">
                        <UserIcon class="w-4 h-4 text-green-600" />
                        <span class="text-sm font-medium text-green-900">{{ selectedCustomer.name }}</span>

                        <div class="flex items-center gap-2">
                            <BaseButton @click="viewCustomer" variant="outline" size="sm"
                                class="text-green-700 border-green-300 hover:bg-green-100" title="Ver detalles">
                                <EyeIcon class="w-3 h-3 mr-1" />

                            </BaseButton>

                            <BaseButton @click="handleChangeCustomer" variant="outline" size="sm"
                                class="text-green-700 border-green-300 hover:bg-green-100" title="Cambiar cliente">
                                <ArrowsRightLeftIcon class="w-3 h-3 mr-1" />

                            </BaseButton>
                        </div>
                    </div>

                    <!-- Customer Phones -->
                    <div v-if="selectedCustomer.phone1" class="mt-2">
                        <PhoneNumberItem :phone-number="selectedCustomer.phone1" />
                    </div>
                    <div v-if="selectedCustomer.phone2" class="mt-2">
                        <PhoneNumberItem :phone-number="selectedCustomer.phone2" />
                    </div>


                </div>

                <!-- Address Selector (only for delivery) -->
                <div v-if="orderType === 'delivery'" class="address-section">
                    <AddressSelector :customer-id="selectedCustomer.id" :selected-address="selectedAddress?.id"
                        @address-selected="handleAddressSelect" />
                </div>

                <!-- Reservation Information (only for reservation) -->
                <div v-if="orderType === 'reservation'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 class="text-sm font-medium text-yellow-900 mb-3 flex items-center gap-2">
                        <CalendarIcon class="w-4 h-4" />
                        Información de Reservación
                    </h4>
                    <div class="space-y-2">
                        <div class="flex items-center gap-3">
                            <CalendarIcon class="w-4 h-4 text-yellow-600" />
                            <span class="text-sm text-yellow-800">Fecha: Por definir</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <ClockIcon class="w-4 h-4 text-yellow-600" />
                            <span class="text-sm text-yellow-800">Hora: Por definir</span>
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

    <!-- Customer Detail Modal -->
    <CustomerDetailModal v-if="selectedCustomer" :show="showCustomerDetail" :customer="selectedCustomer"
        @close="closeCustomerDetail" @edit-customer="handleEditCustomer" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OrderType } from '@/types/order'
import type { Customer, CustomerAddress } from '@/types/customer'
import { useOrdersStore } from '@/store/orders'
import { useCustomersStore } from '@/store/customers'

// Components
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import CustomerSelector from '@/components/CustomerSelector.vue'
import AddressSelector from '@/components/AddressSelector.vue'
import PhoneNumberItem from '@/components/ui/PhoneNumberItem.vue'
import CustomerDetailModal from '@/components/orders/CustomerDetailModal.vue'

// Icons
import {
    UserIcon,
    EyeIcon,
    CalendarIcon,
    ClockIcon,
    ArrowsRightLeftIcon
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
const ordersStore = useOrdersStore()
const customersStore = useCustomersStore()

// State
const showCustomerDetail = ref(false)

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
const handleCustomerSelect = async (customerId: number | undefined) => {
    // Find customer by ID from the available customers in the store
    const customer = customerId ? ordersStore.customers.find(c => c.id === customerId) : undefined
    emit('customerSelected', customer)

    if (customer) {
        // Auto-select address when customer is selected
        await autoSelectAddress(customer)
    } else {
        // Clear address when customer changes
        emit('addressSelected', undefined)
    }
}

const autoSelectAddress = async (customer: Customer) => {
    // First, try to get addresses from the customer object
    let addresses = customer.addresses || []

    // If no addresses in customer object, try to load from store
    if (!addresses || addresses.length === 0) {
        try {
            console.log('Loading addresses from store for customer:', customer.id)
            await customersStore.fetchAddresses(customer.id)
            addresses = customersStore.addresses || []
        } catch (error) {
            console.error('Error loading addresses:', error)
            emit('addressSelected', undefined)
            return
        }
    }

    // If still no addresses, don't auto-select
    if (!addresses || addresses.length === 0) {
        console.log('No addresses found for customer')
        emit('addressSelected', undefined)
        return
    }

    // Find primary address first
    let selectedAddress = addresses.find(addr => addr.isPrimary)

    // If no primary address, select the first one (if only one exists)
    if (!selectedAddress && addresses.length === 1) {
        selectedAddress = addresses[0]
    }

    // If still no address selected and multiple addresses exist, don't auto-select
    if (!selectedAddress) {
        console.log('Multiple addresses found, no auto-selection')
        emit('addressSelected', undefined)
        return
    }

    console.log('Auto-selected address:', selectedAddress)
    emit('addressSelected', selectedAddress)
}

const handleAddressSelect = (addressId: number | undefined) => {
    // Find address by ID from the customer's addresses
    // This would typically come from a store or prop
    const address = addressId ? { id: addressId } as CustomerAddress : undefined
    emit('addressSelected', address)
}

const handleChangeCustomer = () => {
    // Clear the selected customer to show the customer selector again
    emit('customerSelected', undefined)
    emit('addressSelected', undefined)
}

const viewCustomer = () => {
    if (props.selectedCustomer) {
        showCustomerDetail.value = true
    }
}

const closeCustomerDetail = () => {
    showCustomerDetail.value = false
}

const handleEditCustomer = (customer: Customer) => {
    // Close detail modal
    showCustomerDetail.value = false
    // Here you could open an edit modal or navigate to edit page
    console.log('Edit customer:', customer.id)
    // For now, just show a toast
    // success('Funcionalidad de edición', 3000, 'La funcionalidad de edición estará disponible próximamente')
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
