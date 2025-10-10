<template>
    <div class="customer-section">
        <!-- No Customer Selected -->
        <div v-if="!selectedCustomer" class="space-y-3">
            <CustomerSelector :required="orderType === 'delivery'" @customer-selected="handleCustomerSelected" />
        </div>

        <!-- Customer Selected -->
        <div v-else class="space-y-3">
            <!-- Customer Info -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-medium text-green-900">{{ selectedCustomer.name }}</h4>
                            <BaseButton @click="$emit('view-customer-detail', selectedCustomer)" variant="ghost"
                                size="sm">
                                <EyeIcon class="w-4 h-4" />
                            </BaseButton>
                        </div>
                        <div class="space-y-1">
                            <PhoneNumberItem :phone-number="selectedCustomer.phone1" />
                            <PhoneNumberItem v-if="selectedCustomer.phone2" :phone-number="selectedCustomer.phone2" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Order Type Selector -->
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Tipo de Pedido</label>
                <BaseSelect :model-value="orderType" :options="orderTypeOptions"
                    @update:model-value="(value) => $emit('order-type-changed', value as 'onsite' | 'delivery' | 'reservation')"
                    size="sm" />
            </div>

            <!-- Address Selection (for delivery) -->
            <div v-if="orderType === 'delivery'" class="space-y-2">
                <AddressSelector :customer-id="selectedCustomer.id" :selected-address="selectedAddress?.id || undefined"
                    @address-selected="handleAddressSelected" />
            </div>

            <!-- Change Customer Button -->
            <BaseButton @click="$emit('customer-selected', null)" variant="outline" size="sm" class="w-full">
                <span class="flex items-center justify-center">
                    <ArrowPathIcon class="w-4 h-4 mr-2" />
                    Cambiar Cliente
                </span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Customer, CustomerAddress } from '@/types/customer'
import { useCustomersStore } from '@/store/customers'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import CustomerSelector from '@/components/CustomerSelector.vue'
import AddressSelector from '@/components/AddressSelector.vue'
import PhoneNumberItem from '@/components/ui/PhoneNumberItem.vue'

// Icons
import {
    EyeIcon,
    ArrowPathIcon
} from '@heroicons/vue/24/outline'

interface Props {
    selectedCustomer: Customer | null
    selectedAddress: CustomerAddress | null
    orderType: 'onsite' | 'delivery' | 'reservation'
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'customer-selected': [customer: Customer | null]
    'address-selected': [address: CustomerAddress | null]
    'view-customer-detail': [customer: Customer]
    'order-type-changed': [type: 'onsite' | 'delivery' | 'reservation']
}>()

// Composables
const customersStore = useCustomersStore()

// Options for order type selector
const orderTypeOptions = [
    { value: 'onsite', label: 'En el Local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
]

// Methods
const handleCustomerSelected = (customerId: number | undefined) => {
    if (customerId) {
        const customer = customersStore.list?.items.find(c => c.id === customerId)
        emit('customer-selected', customer || null)
    } else {
        emit('customer-selected', null)
    }
}

const handleAddressSelected = (addressId: number | undefined) => {
    if (addressId && props.selectedCustomer) {
        const address = props.selectedCustomer.addresses?.find(a => a.id === addressId)
        emit('address-selected', address || null)
    } else {
        emit('address-selected', null)
    }
}
</script>

<style scoped>
.customer-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
</style>