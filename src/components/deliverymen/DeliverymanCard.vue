<template>
    <div class="bg-white rounded-lg shadow p-3 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-2">
            <div>
                <h3 class="text-base font-semibold text-gray-900">{{ stats.deliverymanName }}</h3>
                <p class="text-xs text-gray-500">{{ stats.ordersCount }} pedido(s)</p>
            </div>
            <span :class="[
                'px-2 py-1 rounded-full text-xs font-medium',
                stats.currentBalance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            ]">
                {{ formatCurrency(stats.currentBalance) }}
            </span>
        </div>

        <div class="space-y-1 mb-3">
            <div class="flex justify-between text-xs">
                <span class="text-gray-600">Efectivo:</span>
                <span class="font-medium text-gray-900">{{ formatCurrency(stats.totalCash) }}</span>
            </div>
            <div class="flex justify-between text-xs">
                <span class="text-gray-600">Abonos:</span>
                <span class="font-medium text-orange-600">{{ formatCurrency(stats.totalAdvances) }}</span>
            </div>
            <div class="flex justify-between text-xs">
                <span class="text-gray-600">Tiempo promedio:</span>
                <span class="font-medium text-gray-900">{{ stats.averageDeliveryTime }} min</span>
            </div>
        </div>

        <div class="mb-2">
            <label class="block text-xs font-medium text-gray-700 mb-1">
                Base inicial
            </label>
            <input :value="localBaseAmount" @input="handleBaseAmountChange" type="number"
                class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min="0" step="1000" />
        </div>

        <BaseButton @click="$emit('view-detail', stats.deliverymanId)" variant="outline" size="sm"
            class="w-full text-xs">
            Ver detalle
        </BaseButton>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DeliverymanStats } from '@/types/deliveryman'
import { useFormatting } from '@/composables/useFormatting'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Props {
    stats: DeliverymanStats
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'view-detail': [deliverymanId: number]
    'base-amount-changed': [deliverymanId: number, amount: number]
}>()

const { formatCurrency } = useFormatting()
const localBaseAmount = ref(props.stats.baseAmount)

watch(() => props.stats.baseAmount, (newValue) => {
    localBaseAmount.value = newValue
})

const handleBaseAmountChange = (event: Event) => {
    const value = parseInt((event.target as HTMLInputElement).value) || 0
    localBaseAmount.value = value
    emit('base-amount-changed', props.stats.deliverymanId, value)
}
</script>
