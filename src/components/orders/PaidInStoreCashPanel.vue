<template>
    <div
        :class="[
            'rounded-lg border border-amber-200 bg-amber-50/90',
            density === 'comfortable' ? 'p-3 sm:p-4' : 'p-3',
            extraClass,
        ]">
        <div v-if="editable" class="space-y-2">
            <div v-if="!paidInStoreCash" class="flex items-start gap-2 sm:gap-3">
                <input
                    :id="inputId"
                    type="checkbox"
                    :checked="false"
                    :disabled="disabled"
                    class="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    @change="emit('update:paidInStoreCash', ($event.target as HTMLInputElement).checked)" />
                <label :for="inputId" class="text-sm text-gray-800 cursor-pointer flex-1">
                    <span class="font-medium">Pagó en efectivo en tienda</span>
                    <span v-if="helperText" class="block text-xs text-gray-600 mt-0.5">{{ helperText }}</span>
                </label>
            </div>
            <div v-else class="space-y-2">
                <PaidInStoreCashCompactRow
                    :amount="paidInStoreCashAmount ?? null"
                    :max-amount="maxPaidInStoreAmount"
                    :show-edit-remove="true"
                    :disabled="disabled"
                    @edit="emit('edit-paid-in-store-cash')"
                    @remove="emit('remove-paid-in-store-cash')" />
                <p v-if="helperText" class="text-xs text-gray-600">{{ helperText }}</p>
            </div>
        </div>
        <p v-else-if="paidInStoreCash" class="text-sm text-amber-900 flex items-center gap-1.5">
            <InformationCircleIcon class="w-4 h-4 shrink-0" />
            <span>
                Efectivo cobrado en tienda; nada que cobrar en entrega
                <template v-if="paidInStoreCashAmount != null">
                    ({{ formatCurrency(paidInStoreCashAmount) }})
                </template>.
            </span>
        </p>
    </div>
</template>

<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
import { useFormatting } from '@/composables/useFormatting'
import PaidInStoreCashCompactRow from '@/components/orders/PaidInStoreCashCompactRow.vue'

withDefaults(
    defineProps<{
        /** id único para asociar checkbox y label (accesibilidad). */
        inputId: string
        paidInStoreCash?: boolean
        paidInStoreCashAmount?: number | null
        /** Tope COP (total − bancos − apps) para fila compacta y edición. */
        maxPaidInStoreAmount?: number
        /** Si true: checkbox o fila con acciones; si false y paidInStoreCash: texto informativo (p. ej. domiciliario). */
        editable: boolean
        disabled?: boolean
        /** Texto bajo el título cuando es editable (borrador vs pedido guardado). */
        helperText?: string
        /** comfortable: padding/gaps mayores (detalle); compact: sidebar. */
        density?: 'comfortable' | 'compact'
        /** Clases extra del contenedor (p. ej. márgenes). */
        extraClass?: string
    }>(),
    {
        paidInStoreCash: false,
        paidInStoreCashAmount: null,
        maxPaidInStoreAmount: 0,
        disabled: false,
        helperText: undefined,
        density: 'comfortable',
        extraClass: '',
    }
)

const emit = defineEmits<{
    'update:paidInStoreCash': [value: boolean]
    'edit-paid-in-store-cash': []
    'remove-paid-in-store-cash': []
}>()

const { formatCurrency } = useFormatting()
</script>
