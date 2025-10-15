<template>
    <div class="customer-section">
        <!-- Order Type Selector -->
        <div class="space-y-2">

            <BaseRadioGroup :model-value="orderType" :options="orderTypeOptions" name="order-type"
                @update:model-value="(value) => $emit('order-type-changed', value as 'onsite' | 'delivery' | 'reservation')"
                size="sm" />
        </div>
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



            <!-- Address Selection (for delivery) -->
            <div v-if="orderType === 'delivery' || orderType === 'reservation'" class="space-y-2">
                <AddressSelector :customer-id="selectedCustomer.id" :selected-address="selectedAddress?.id || undefined"
                    @address-selected="handleAddressSelected" />
            </div>

            <!-- Change Customer Button -->
            <BaseButton @click="handleClearCustomer" variant="outline" size="sm" class="w-full">
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

import { ref } from 'vue'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseRadioGroup from '@/components/ui/BaseRadioGroup.vue'
import CustomerSelector from '@/components/CustomerSelector.vue'
import AddressSelector from '@/components/AddressSelector.vue'
import PhoneNumberItem from '@/components/ui/PhoneNumberItem.vue'

// Icons
import {
    EyeIcon,
    ArrowPathIcon
} from '@heroicons/vue/24/outline'

interface Props {

    orderType: 'onsite' | 'delivery' | 'reservation'
}

const selectedCustomer = ref<Customer | null>(null)
const selectedAddress = ref<CustomerAddress | null>(null)

defineProps<Props>()
const emit = defineEmits<{
    'customer-selected': [customer: Customer | null]
    'address-selected': [address: CustomerAddress | null]
    'view-customer-detail': [customer: Customer]
    'order-type-changed': [type: 'onsite' | 'delivery' | 'reservation']
}>()



// Options for order type selector
const orderTypeOptions = [
    { value: 'onsite', label: 'En el Local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
]

// Methods
const handleCustomerSelected = (customer: Customer) => {
    selectedCustomer.value = customer
    emit('customer-selected', customer || null)

    // Auto-seleccionar dirección principal
    if (customer && customer.addresses && customer.addresses.length > 0) {
        // Buscar dirección principal
        const primaryAddress = customer.addresses.find(a => a.isPrimary)

        if (primaryAddress) {
            // Seleccionar la dirección principal
            selectedAddress.value = primaryAddress
            emit('address-selected', primaryAddress)
        } else {
            // Fallback: seleccionar primera dirección si no hay principal
            selectedAddress.value = customer.addresses[0]
            emit('address-selected', customer.addresses[0])
        }
    } else {
        // Sin direcciones, limpiar selección
        selectedAddress.value = null
        emit('address-selected', null)
    }
}

const handleAddressSelected = (addressId: number | undefined) => {
    if (addressId && selectedCustomer.value) {
        const address = selectedCustomer.value.addresses?.find(a => a.id === addressId)
        selectedAddress.value = address || null
        emit('address-selected', address || null)
    } else {
        selectedAddress.value = null
        emit('address-selected', null)
    }
}

const handleClearCustomer = () => {
    selectedCustomer.value = null
    selectedAddress.value = null
    emit('customer-selected', null)
    emit('address-selected', null)
}
</script>

<style scoped>
.customer-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
</style>