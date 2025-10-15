<template>
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <ChartBarIcon class="w-4 h-4" />
            Estadísticas de Pedidos
        </h4>
        <div class="space-y-2">
            <div class="flex justify-between">
                <span class="text-sm text-gray-500">Total Pedidos:</span>
                <span class="text-sm font-medium text-gray-900">{{ customer.totalOrders || 0 }}</span>
            </div>
            <div v-if="customer.lastOrderDate" class="flex justify-between">
                <span class="text-sm text-gray-500">Último Pedido:</span>
                <span class="text-sm font-medium text-gray-900">{{ formatDate(customer.lastOrderDate) }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-500">Fecha Registro:</span>
                <span class="text-sm font-medium text-gray-900">{{ formatDate(customer.createdAt) }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-500">Última Actualización:</span>
                <span class="text-sm font-medium text-gray-900">{{ formatDate(customer.updatedAt) }}</span>
            </div>
        </div>

        <!-- Action Buttons -->
        <div v-if="showActions" class="flex gap-2 mt-4 pt-3 border-t border-gray-200">
            <BaseButton @click="handleViewOrders" variant="outline" size="sm" class="flex-1">
                <span class="flex items-center justify-center">
                    <ShoppingBagIcon class="w-4 h-4 mr-2" />
                    Ver Pedidos
                </span>
            </BaseButton>

        </div>
    </div>
</template>

<script setup lang="ts">
import type { Customer } from '@/types/customer'
import { useFormatting } from '@/composables/useFormatting'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'

// Icons
import {
    ChartBarIcon,
    ShoppingBagIcon,

} from '@heroicons/vue/24/outline'

interface Props {
    customer: Customer
    showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showActions: true
})

const emit = defineEmits<{
    (e: 'viewOrders', customer: Customer): void
    (e: 'createOrder', customer: Customer): void
}>()

// Composables
const { formatDate } = useFormatting()

// Methods
const handleViewOrders = () => {
    emit('viewOrders', props.customer)
}

</script>
