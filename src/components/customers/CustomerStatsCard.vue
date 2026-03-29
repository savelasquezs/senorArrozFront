<template>
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <ChartBarIcon class="w-4 h-4" />
            Estadísticas de pedidos
        </h4>
        <p class="text-[11px] text-gray-500 mb-3">
            Totales y fechas consideran solo pedidos <strong>no cancelados</strong>. El valor acumulado es la suma del total de
            esos pedidos.
        </p>
        <div class="space-y-2">
            <div class="flex justify-between gap-2">
                <span class="text-sm text-gray-500">Total pedidos</span>
                <span class="text-sm font-medium text-gray-900 tabular-nums">{{ customer.totalOrders ?? 0 }}</span>
            </div>
            <div class="flex justify-between gap-2">
                <span class="text-sm text-gray-500">Valor acumulado</span>
                <span class="text-sm font-medium text-gray-900 tabular-nums">{{ formatCurrencyAccumulated }}</span>
            </div>
            <div class="flex justify-between gap-2 items-start">
                <span class="text-sm text-gray-500 shrink-0">Desde primer pedido</span>
                <span class="text-sm font-medium text-gray-900 text-right">
                    <template v-if="customer.firstOrderDate">
                        <span class="block">{{ formatTimeAgoCalendar(customer.firstOrderDate) }}</span>
                        <span class="block text-xs font-normal text-gray-500">{{ formatDateShort(customer.firstOrderDate) }}</span>
                    </template>
                    <template v-else>Sin pedidos</template>
                </span>
            </div>
            <div class="flex justify-between gap-2 items-start">
                <span class="text-sm text-gray-500 shrink-0">Desde último pedido</span>
                <span class="text-sm font-medium text-gray-900 text-right">
                    <template v-if="customer.lastOrderDate">
                        <span class="block">{{ formatTimeAgoCalendar(customer.lastOrderDate) }}</span>
                        <span class="block text-xs font-normal text-gray-500">{{ formatDateShort(customer.lastOrderDate) }}</span>
                    </template>
                    <template v-else>Sin pedidos</template>
                </span>
            </div>
            <div class="flex justify-between gap-2">
                <span class="text-sm text-gray-500">Registro del cliente</span>
                <span class="text-sm font-medium text-gray-900">{{ formatDateShort(customer.createdAt) }}</span>
            </div>
            <div class="flex justify-between gap-2">
                <span class="text-sm text-gray-500">Datos actualizados</span>
                <span class="text-sm font-medium text-gray-900">{{ formatDateShort(customer.updatedAt) }}</span>
            </div>
        </div>

        <div v-if="showActions" class="flex gap-2 mt-4 pt-3 border-t border-gray-200">
            <BaseButton variant="outline" size="sm" class="flex-1" @click="handleViewOrders">
                <span class="flex items-center justify-center">
                    <ShoppingBagIcon class="w-4 h-4 mr-2" />
                    Ver historial de pedidos
                </span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Customer } from '@/types/customer'
import { useFormatting } from '@/composables/useFormatting'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ChartBarIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline'

interface Props {
    customer: Customer
    showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showActions: true,
})

const emit = defineEmits<{
    viewOrders: [customer: Customer]
}>()

const { formatCurrency, formatDateShort, formatTimeAgoCalendar } = useFormatting()

const formatCurrencyAccumulated = computed(() => {
    const n = props.customer.totalAccumulated ?? 0
    return formatCurrency(n)
})

const handleViewOrders = () => {
    emit('viewOrders', props.customer)
}
</script>
