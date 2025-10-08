<template>
    <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-gray-900">{{ address.address }}</span>
                    <BaseBadge v-if="address.isPrimary" type="primary" text="Principal" size="sm" />
                </div>
                <div class="text-xs text-gray-500">
                    {{ address.neighborhoodName || 'Barrio no especificado' }}
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
            <BaseButton @click="handleEditAddress" variant="outline" size="sm" class="flex-1">
                <span class="flex items-center justify-center">
                    <PencilIcon class="w-4 h-4 mr-2" />
                    Editar
                </span>
            </BaseButton>
            <BaseButton @click="handleSetPrimary" variant="outline" size="sm" :disabled="address.isPrimary"
                class="flex-1">
                <span class="flex items-center justify-center">
                    <StarIcon class="w-4 h-4 mr-2" />
                    {{ address.isPrimary ? 'Principal' : 'Hacer Principal' }}
                </span>
            </BaseButton>
            <BaseButton @click="handleDeleteAddress" variant="danger" size="sm">
                <span class="flex items-center justify-center">
                    <TrashIcon class="w-4 h-4 mr-2" />
                    Eliminar
                </span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Customer, CustomerAddress } from '@/types/customer'
import { useFormatting } from '@/composables/useFormatting'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

// Icons
import {
    PencilIcon,
    StarIcon,
    TrashIcon
} from '@heroicons/vue/24/outline'

interface Props {
    address: CustomerAddress
    customer: Customer
    showActions?: boolean
    onEdit?: (address: CustomerAddress) => void
}

const props = withDefaults(defineProps<Props>(), {
    showActions: true
})

// Composables
const { formatCurrency } = useFormatting()
const { success, error: showError } = useToast()
const customersStore = useCustomersStore()

// Methods
const handleEditAddress = () => {
    if (props.onEdit) {
        props.onEdit(props.address)
    }
}

const handleSetPrimary = async () => {
    try {
        await customersStore.setPrimaryAddress(props.customer.id, props.address.id)
        success('Dirección principal', 2000, 'Dirección establecida como principal')
    } catch (error: any) {
        showError('Error al establecer dirección principal', error.message || 'No se pudo establecer la dirección como principal')
    }
}

const handleDeleteAddress = async () => {
    // Show confirmation dialog
    const confirmed = confirm(`¿Estás seguro de que quieres eliminar la dirección "${props.address.address}"?`)

    if (!confirmed) return

    try {
        await customersStore.removeAddress(props.customer.id, props.address.id)
        success('Dirección eliminada', 2000, 'Dirección eliminada correctamente')
    } catch (error: any) {
        showError('Error al eliminar dirección', error.message || 'No se pudo eliminar la dirección')
    }
}
</script>
