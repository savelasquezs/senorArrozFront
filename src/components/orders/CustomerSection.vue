<template>
    <div class="customer-section">
        <!-- No Customer Selected -->
        <div v-if="!selectedCustomer" class="space-y-3">
            <CustomerSelector :required="orderType === 'delivery'" @customer-selected="handleCustomerSelected" />
        </div>

        <!-- Customer Selected -->
        <div v-else class="space-y-3">
            <!-- Customer Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h4 class="font-medium text-blue-900">{{ selectedCustomer.name }}</h4>
                        <div class="flex items-center gap-2 mt-1">
                            <PhoneNumberItem :phone-number="selectedCustomer.phone1" />
                            <BaseButton @click="$emit('view-customer-detail', selectedCustomer)" variant="outline"
                                size="sm" class="ml-auto">
                                <span class="flex items-center">
                                    <EyeIcon class="w-4 h-4 mr-1" />
                                    Ver
                                </span>
                            </BaseButton>
                        </div>
                        <div v-if="selectedCustomer.phone2" class="mt-1">
                            <PhoneNumberItem :phone-number="selectedCustomer.phone2" />
                        </div>
                    </div>
                </div>
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
}>()

// Composables
const customersStore = useCustomersStore()

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