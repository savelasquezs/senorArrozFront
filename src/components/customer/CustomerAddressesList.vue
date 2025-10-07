<template>
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-900 flex items-center gap-2">
                <MapPinIcon class="w-4 h-4" />
                Direcciones Registradas ({{ customerAddresses.length }})
            </h4>
            <BaseButton @click="handleAddAddress" variant="primary" size="sm">
                <span class="flex items-center">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Agregar
                </span>
            </BaseButton>
        </div>

        <!-- Addresses List -->
        <div v-if="customerAddresses.length > 0" class="space-y-3">
            <div v-for="address in customerAddresses" :key="address.id"
                class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-sm font-medium text-gray-900">{{ address.address }}</span>
                            <BaseBadge v-if="address.isPrimary" type="primary" text="Principal" size="sm" />
                        </div>
                        <div class="text-xs text-gray-500">
                            {{ address.neighborhood?.name || 'Barrio no especificado' }}
                        </div>
                        <div v-if="address.additionalInfo" class="text-xs text-gray-500 mt-1">
                            {{ address.additionalInfo }}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-medium text-gray-900">
                            {{ formatCurrency(address.deliveryFee) }}
                        </div>
                        <div class="text-xs text-gray-500">Domicilio</div>
                    </div>
                </div>

                <!-- Address Actions -->
                <div v-if="showActions" class="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                    <BaseButton @click="handleEditAddress(address)" variant="outline" size="sm" class="flex-1">
                        <span class="flex items-center justify-center">
                            <PencilIcon class="w-4 h-4 mr-2" />
                            Editar
                        </span>
                    </BaseButton>
                    <BaseButton @click="handleSetPrimary(address)" variant="outline" size="sm"
                        :disabled="address.isPrimary" class="flex-1">
                        <span class="flex items-center justify-center">
                            <StarIcon class="w-4 h-4 mr-2" />
                            {{ address.isPrimary ? 'Principal' : 'Hacer Principal' }}
                        </span>
                    </BaseButton>
                    <BaseButton @click="handleDeleteAddress(address)" variant="danger" size="sm">
                        <span class="flex items-center justify-center">
                            <TrashIcon class="w-4 h-4 mr-2" />
                            Eliminar
                        </span>
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- No Addresses -->
        <div v-else class="bg-gray-50 rounded-lg p-6 text-center">
            <MapPinIcon class="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-500 mb-3">Este cliente no tiene direcciones registradas</p>
            <BaseButton @click="handleAddAddress" variant="primary" size="sm">
                <span class="flex items-center">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Crear Primera Dirección
                </span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Customer, CustomerAddress } from '@/types/customer'
import { useFormatting } from '@/composables/useFormatting'
import { useCustomersStore } from '@/store/customers'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

// Icons
import {
    MapPinIcon,
    PlusIcon,
    PencilIcon,
    StarIcon,
    TrashIcon
} from '@heroicons/vue/24/outline'

interface Props {
    customer: Customer
    showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showActions: true
})

const emit = defineEmits<{
    (e: 'addAddress', customer: Customer): void
    (e: 'editAddress', address: CustomerAddress): void
    (e: 'setPrimary', address: CustomerAddress): void
    (e: 'deleteAddress', address: CustomerAddress): void
}>()

// Composables
const { formatCurrency } = useFormatting()
const customersStore = useCustomersStore()

// Computed
const customerAddresses = computed(() => {
    // Use addresses from store if available, otherwise fallback to customer.addresses
    return customersStore.addresses || props.customer.addresses || []
})

// Methods
const handleAddAddress = () => {
    emit('addAddress', props.customer)
}

const handleEditAddress = (address: CustomerAddress) => {
    emit('editAddress', address)
}

const handleSetPrimary = (address: CustomerAddress) => {
    emit('setPrimary', address)
}

const handleDeleteAddress = (address: CustomerAddress) => {
    emit('deleteAddress', address)
}
</script>
