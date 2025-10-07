<template>
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <InformationCircleIcon class="w-4 h-4" />
            Información Básica
        </h4>
        <div class="space-y-2">
            <div class="flex justify-between">
                <span class="text-sm text-gray-500">Nombre:</span>
                <span class="text-sm font-medium text-gray-900">{{ customer.name }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-500">Teléfono Principal:</span>
                <span class="text-sm font-medium text-gray-900">{{ customer.phone1 }}</span>
            </div>
            <div v-if="customer.phone2" class="flex justify-between">
                <span class="text-sm text-gray-500">Teléfono Secundario:</span>
                <span class="text-sm font-medium text-gray-900">{{ customer.phone2 }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-500">Estado:</span>
                <BaseBadge :type="customer.active ? 'success' : 'danger'"
                    :text="customer.active ? 'Activo' : 'Inactivo'" size="sm" />
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-500">Sucursal:</span>
                <span class="text-sm font-medium text-gray-900">{{ customer.branchName || 'N/A' }}</span>
            </div>
        </div>

        <!-- Action Buttons -->
        <div v-if="showActions" class="flex gap-2 mt-4 pt-3 border-t border-gray-200">
            <BaseButton @click="handleEdit" variant="outline" size="sm" class="flex-1">
                <span class="flex items-center justify-center">
                    <PencilIcon class="w-4 h-4 mr-2" />
                    Editar
                </span>
            </BaseButton>
            <BaseButton @click="handleToggleStatus" :variant="customer.active ? 'danger' : 'success'" size="sm"
                class="flex-1">
                <span class="flex items-center justify-center">
                    <component :is="customer.active ? UserMinusIcon : UserPlusIcon" class="w-4 h-4 mr-2" />
                    {{ customer.active ? 'Desactivar' : 'Activar' }}
                </span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Customer } from '@/types/customer'

// Components
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

// Icons
import {
    InformationCircleIcon,
    PencilIcon,
    UserMinusIcon,
    UserPlusIcon
} from '@heroicons/vue/24/outline'

interface Props {
    customer: Customer
    showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showActions: true
})

const emit = defineEmits<{
    (e: 'edit', customer: Customer): void
    (e: 'toggleStatus', customer: Customer): void
}>()

// Methods
const handleEdit = () => {
    emit('edit', props.customer)
}

const handleToggleStatus = () => {
    emit('toggleStatus', props.customer)
}
</script>
