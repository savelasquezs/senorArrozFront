<template>
    <div class="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 w-full">
        <h4 class="text-xs font-medium text-gray-900 mb-2 flex items-center gap-2">
            <ChartBarIcon class="w-3.5 h-3.5" />
            Estadísticas de pedidos
        </h4>
        <p class="text-[10px] text-gray-500 mb-3 leading-relaxed">
            Totales y fechas: solo pedidos <strong>no cancelados</strong>. Valor acumulado = suma de <strong>Total</strong> de esos pedidos.
        </p>

        <div class="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4 items-start">
            <!-- Destacados -->
            <div class="col-span-1 lg:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
                <div class="text-[10px] font-medium uppercase tracking-wide text-emerald-800/90">Total pedidos</div>
                <div class="text-xl font-semibold tabular-nums text-gray-900 leading-tight mt-0.5">
                    {{ customer.totalOrders ?? 0 }}
                </div>
            </div>
            <div class="col-span-1 lg:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
                <div class="text-[10px] font-medium uppercase tracking-wide text-emerald-800/90">Valor acumulado</div>
                <div class="text-lg sm:text-xl font-semibold tabular-nums text-gray-900 leading-tight mt-0.5">
                    {{ formatCurrencyAccumulated }}
                </div>
            </div>

            <!-- Compactos -->
            <div class="col-span-2 lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <div>
                    <div class="text-gray-500">Desde primer pedido</div>
                    <template v-if="customer.firstOrderDate">
                        <div class="font-medium text-gray-800 leading-tight">{{ formatTimeAgoCalendar(customer.firstOrderDate) }}</div>
                        <div class="text-[10px] text-gray-500">{{ formatDateShort(customer.firstOrderDate) }}</div>
                    </template>
                    <div v-else class="text-gray-400">Sin pedidos</div>
                </div>
                <div>
                    <div class="text-gray-500">Desde último pedido</div>
                    <template v-if="customer.lastOrderDate">
                        <div class="font-medium text-gray-800 leading-tight">{{ formatTimeAgoCalendar(customer.lastOrderDate) }}</div>
                        <div class="text-[10px] text-gray-500">{{ formatDateShort(customer.lastOrderDate) }}</div>
                    </template>
                    <div v-else class="text-gray-400">Sin pedidos</div>
                </div>
                <div>
                    <div class="text-gray-500">Registro cliente</div>
                    <div class="font-medium text-gray-800">{{ formatDateShort(customer.createdAt) }}</div>
                </div>
                <div>
                    <div class="text-gray-500">Datos actualizados</div>
                    <div class="font-medium text-gray-800">{{ formatDateShort(customer.updatedAt) }}</div>
                </div>
            </div>
        </div>

        <div
            v-if="showActions && (customer.totalOrders ?? 0) > 0"
            class="flex gap-2 mt-3 pt-3 border-t border-gray-200">
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

const formatCurrencyAccumulated = computed(() => formatCurrency(props.customer.totalAccumulated ?? 0))

const handleViewOrders = () => {
    emit('viewOrders', props.customer)
}
</script>
