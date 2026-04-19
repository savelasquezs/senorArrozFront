<template>
    <div
        class="group rounded-lg border bg-white p-2 sm:p-2.5 transition-shadow touch-manipulation"
        :class="stats.dayBlocked
            ? 'border-amber-200 ring-1 ring-amber-200/80 shadow-sm'
            : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'"
    >
        <!-- Fila 1: identidad + saldo -->
        <div class="flex items-start gap-2 min-w-0">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                    <h3 class="text-sm font-semibold text-gray-900 truncate" :title="stats.deliverymanName">
                        {{ stats.deliverymanName }}
                    </h3>
                    <span
                        v-if="stats.dayBlocked"
                        class="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900"
                    >
                        Liquidado
                    </span>
                </div>
            </div>
            <div
                class="shrink-0 text-right"
                :title="`Saldo a entregar: ${formatCurrency(stats.currentBalance)}`"
            >
                <div class="text-[9px] font-medium uppercase tracking-wide text-gray-400">Saldo</div>
                <div
                    :class="[
                        'text-sm font-bold tabular-nums leading-none',
                        stats.currentBalance >= 0 ? 'text-emerald-700' : 'text-red-600',
                    ]"
                >
                    {{ formatCurrency(stats.currentBalance) }}
                </div>
            </div>
        </div>

        <!-- Métricas en rejilla densa (misma info que antes) -->
        <div
            class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1.5 text-[11px] leading-tight border-t border-gray-100 pt-2"
        >
            <div class="min-w-0">
                <div class="text-gray-500 truncate" title="Pedidos (entregas en el ciclo del día)">Pedidos</div>
                <button
                    type="button"
                    class="mt-0.5 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline text-left tabular-nums"
                    @click="$emit('orders-click', stats.deliverymanId)"
                >
                    {{ stats.ordersCount }}
                </button>
            </div>
            <div class="min-w-0" title="Efectivo recaudado">
                <div class="text-gray-500 truncate">Efectivo</div>
                <div class="mt-0.5 font-semibold text-gray-900 tabular-nums truncate">
                    {{ formatCurrency(stats.totalCash) }}
                </div>
            </div>
            <div class="min-w-0" title="Total abonos del período">
                <div class="text-gray-500 truncate">Abonos</div>
                <div class="mt-0.5 font-semibold text-orange-600 tabular-nums truncate">
                    {{ formatCurrency(stats.totalAdvances) }}
                </div>
            </div>
            <div class="min-w-0" title="Tiempo promedio de entrega">
                <div class="text-gray-500 truncate">T. medio</div>
                <div class="mt-0.5 font-semibold text-gray-900 tabular-nums">
                    {{ stats.averageDeliveryTime }}&nbsp;min
                </div>
            </div>
        </div>

        <!-- Base + acciones en una fila -->
        <div class="mt-2 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-2">
            <label class="flex flex-col gap-0.5 min-w-0 shrink-0">
                <span class="text-[9px] font-medium uppercase tracking-wide text-gray-500">Base inicial</span>
                <input
                    :value="localBaseAmount"
                    type="number"
                    min="0"
                    step="1000"
                    class="w-[5.5rem] sm:w-24 rounded border border-gray-300 px-1.5 py-1 text-xs tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    @input="handleBaseAmountChange"
                />
            </label>
            <div class="flex flex-wrap gap-1.5 ml-auto justify-end">
                <BaseButton
                    variant="outline"
                    size="sm"
                    class="!px-2 !py-1 text-[11px]"
                    @click="$emit('view-detail', stats.deliverymanId)"
                >
                    Detalle
                </BaseButton>
                <BaseButton
                    v-if="stats.dayBlocked"
                    type="button"
                    variant="secondary"
                    size="sm"
                    class="!px-2 !py-1 text-[11px]"
                    @click="$emit('unlock-day', stats.deliverymanId)"
                >
                    Desbloquear
                </BaseButton>
            </div>
        </div>
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
    'orders-click': [deliverymanId: number]
    'base-amount-changed': [deliverymanId: number, amount: number]
    'unlock-day': [deliverymanId: number]
}>()

const { formatCurrency } = useFormatting()
const localBaseAmount = ref(props.stats.baseAmount)

watch(
    () => props.stats.baseAmount,
    (newValue) => {
        localBaseAmount.value = newValue
    }
)

const handleBaseAmountChange = (event: Event) => {
    const value = parseInt((event.target as HTMLInputElement).value) || 0
    localBaseAmount.value = value
    emit('base-amount-changed', props.stats.deliverymanId, value)
}
</script>
