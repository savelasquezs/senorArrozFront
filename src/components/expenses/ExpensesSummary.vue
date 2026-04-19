<template>
    <div
        class="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 px-3 rounded-lg border border-emerald-100/80 bg-emerald-50/40 text-sm mb-2">
        <span class="inline-flex items-center gap-1.5 tabular-nums">
            <span class="text-gray-500 text-xs font-medium">Total</span>
            <span class="font-semibold text-gray-900">{{ formatCurrency(totalAmount) }}</span>
        </span>
        <span class="hidden sm:inline text-gray-200" aria-hidden="true">|</span>
        <span class="inline-flex items-center gap-1.5 tabular-nums">
            <span class="text-gray-500 text-xs font-medium">Líneas</span>
            <span class="font-semibold text-gray-900">{{ rowCount }}</span>
        </span>
        <span class="hidden sm:inline text-gray-200" aria-hidden="true">|</span>
        <span class="inline-flex items-center gap-1.5 tabular-nums">
            <span class="text-gray-500 text-xs font-medium">Prom.</span>
            <span class="font-semibold text-gray-900">{{ formatCurrency(averageAmount) }}</span>
        </span>
        <span class="text-[11px] text-gray-400 sm:ml-auto w-full sm:w-auto">Solo filas visibles en la grilla</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/composables/useFormatting'

const props = defineProps<{
    totalAmount: number
    rowCount: number
}>()

const averageAmount = computed(() => {
    if (props.rowCount <= 0) return 0
    return props.totalAmount / props.rowCount
})
</script>
