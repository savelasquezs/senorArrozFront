<template>
    <div
        class="flex items-center justify-between gap-1 text-xs bg-emerald-50 rounded px-1.5 py-0.5 min-w-0 border border-emerald-200">
        <div class="flex items-center gap-1 min-w-0 flex-1">
            <BanknotesIcon class="w-4 h-4 text-emerald-600 shrink-0" />
            <span class="font-medium text-emerald-900 truncate min-w-0 flex-1 text-left" title="Efectivo en tienda">
                Efectivo tienda
            </span>
            <span class="text-emerald-800 shrink-0 tabular-nums">{{ formatCurrency(displayAmount) }}</span>
        </div>
        <div v-if="showEditRemove" class="flex items-center shrink-0 gap-0.5">
            <button
                v-if="showEditAmount"
                type="button"
                class="p-0.5 rounded text-gray-500 hover:bg-emerald-100 transition-colors"
                title="Editar monto"
                :disabled="disabled"
                @click.stop="emit('edit')">
                <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                class="p-0.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                title="Quitar cobro en tienda"
                :disabled="disabled"
                @click.stop="emit('remove')">
                <TrashIcon class="w-3.5 h-3.5" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BanknotesIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useFormatting } from '@/composables/useFormatting'

const props = withDefaults(
    defineProps<{
        /** Monto persistido; si es null se muestra el tope actual (remanente). */
        amount: number | null | undefined
        /** Tope COP (total − bancos − apps) para mostrar fallback y decidir si hay edición. */
        maxAmount: number
        showEditRemove?: boolean
        disabled?: boolean
    }>(),
    {
        showEditRemove: false,
        disabled: false,
    }
)

const emit = defineEmits<{
    edit: []
    remove: []
}>()

const { formatCurrency } = useFormatting()

const displayAmount = computed(() => {
    if (typeof props.amount === 'number' && Number.isFinite(props.amount)) return props.amount
    return Math.max(0, props.maxAmount)
})

const showEditAmount = computed(() => props.maxAmount >= 1)
</script>
