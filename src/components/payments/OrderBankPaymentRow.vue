<template>
    <!-- Compact (tabla) -->
    <div v-if="density === 'compact'" :class="compactWrapperClass">
        <div class="flex items-center gap-1 min-w-0 flex-1">
            <component :is="leadIcon" :class="compactIconClass" />
            <span class="font-medium truncate max-w-[5.5rem]" :title="payment.bankName">{{ payment.bankName }}</span>
            <span v-if="showVerifyActions && payment.isVerified" class="shrink-0 text-green-600" title="Verificado">
                <CheckCircleIcon class="w-3 h-3" />
            </span>
            <span :class="compactAmountClass">{{ formatCurrency(payment.amount) }}</span>
        </div>
        <div class="flex items-center shrink-0 gap-0.5">
            <button v-if="showVerifyActions && !payment.isVerified" type="button"
                class="p-0.5 rounded text-gray-500 hover:bg-gray-100 transition-colors" title="Verificar pago"
                @click.stop="emit('verify', payment.id)">
                <CheckIcon class="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <button v-if="showVerifyActions && payment.isVerified" type="button"
                class="p-0.5 rounded text-gray-500 hover:bg-gray-100 transition-colors" title="Desverificar pago"
                @click.stop="emit('unverify', payment.id)">
                <XMarkIcon class="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button v-if="showEditRemove" type="button"
                class="p-0.5 rounded text-gray-500 hover:bg-gray-100 transition-colors" title="Editar monto"
                @click.stop="emit('edit', payment)">
                <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <button v-if="showEditRemove" type="button"
                class="p-0.5 rounded text-red-600 hover:bg-red-50 transition-colors" title="Eliminar pago"
                @click.stop="emit('remove', payment)">
                <TrashIcon class="w-3.5 h-3.5" />
            </button>
        </div>
    </div>

    <!-- Comfortable (detalle) -->
    <div v-else :class="comfortableWrapperClass">
        <div class="flex items-center gap-3 flex-1 min-w-0">
            <component :is="leadIcon" :class="comfortableLeadIconClass" />
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <div :class="comfortableTitleClass">{{ payment.bankName }}</div>
                    <span v-if="showVerificationBadge && showVerifyActions" :class="badgeClass">
                        <component :is="payment.isVerified ? CheckCircleIcon : ClockIcon" class="w-3 h-3 mr-1" />
                        {{ payment.isVerified ? 'Verificado' : 'Pendiente' }}
                    </span>
                </div>
                <div :class="comfortableAmountClass">{{ formatCurrency(payment.amount) }}</div>
                <div v-if="payment.isVerified && payment.verifiedAt" :class="comfortableMetaClass">
                    Verificado: {{ formatDateTime(payment.verifiedAt) }}
                </div>
            </div>
        </div>
        <div class="flex gap-1 shrink-0">
            <BaseButton v-if="showVerifyActions && !payment.isVerified" variant="ghost" size="sm" title="Verificar pago"
                @click="emit('verify', payment.id)">
                <CheckIcon class="w-4 h-4 text-emerald-600" />
            </BaseButton>
            <BaseButton v-if="showVerifyActions && payment.isVerified" variant="ghost" size="sm"
                title="Desverificar pago" @click="emit('unverify', payment.id)">
                <XMarkIcon class="w-4 h-4 text-gray-600" />
            </BaseButton>
            <BaseButton v-if="showEditRemove" variant="ghost" size="sm" title="Editar monto"
                @click="emit('edit', payment)">
                <PencilIcon class="w-4 h-4" />
            </BaseButton>
            <BaseButton v-if="showEditRemove" variant="ghost" size="sm" class="text-red-600" title="Eliminar pago"
                @click="emit('remove', payment)">
                <TrashIcon class="w-4 h-4" />
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderBankPaymentDetail } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    BanknotesIcon,
    BuildingLibraryIcon,
    TrashIcon,
    PencilIcon,
    CheckCircleIcon,
    ClockIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'

const props = withDefaults(
    defineProps<{
        payment: OrderBankPaymentDetail
        density?: 'compact' | 'comfortable'
        variant?: 'table' | 'panel'
        showVerifyActions?: boolean
        showEditRemove?: boolean
        showVerificationBadge?: boolean
    }>(),
    {
        density: 'comfortable',
        variant: 'panel',
        showVerifyActions: false,
        showEditRemove: false,
        showVerificationBadge: true,
    }
)

const emit = defineEmits<{
    verify: [paymentId: number]
    unverify: [paymentId: number]
    edit: [payment: OrderBankPaymentDetail]
    remove: [payment: OrderBankPaymentDetail]
}>()

const { formatCurrency, formatDateTime } = useFormatting()

const leadIcon = computed(() => (props.variant === 'table' ? BanknotesIcon : BuildingLibraryIcon))

const compactWrapperClass = computed(() =>
    props.variant === 'table'
        ? 'flex items-center justify-between gap-1 text-xs bg-blue-50 rounded px-1.5 py-0.5 min-w-0'
        : 'flex items-center justify-between gap-1 text-xs bg-green-50 rounded px-1.5 py-0.5 min-w-0 border border-green-200'
)

const compactIconClass = computed(() =>
    props.variant === 'table' ? 'w-4 h-4 text-blue-600 shrink-0' : 'w-4 h-4 text-green-600 shrink-0'
)

const compactAmountClass = computed(() =>
    props.variant === 'table' ? 'text-blue-700 shrink-0 tabular-nums' : 'text-green-700 shrink-0 tabular-nums'
)

const comfortableWrapperClass = computed(() =>
    props.variant === 'table'
        ? 'flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200'
        : 'flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200'
)

const comfortableLeadIconClass = computed(() =>
    props.variant === 'table' ? 'w-5 h-5 text-blue-600 shrink-0' : 'w-5 h-5 text-green-600 shrink-0'
)

const comfortableTitleClass = computed(() =>
    props.variant === 'table' ? 'text-sm font-medium text-blue-900' : 'text-sm font-medium text-green-900'
)

const comfortableAmountClass = computed(() =>
    props.variant === 'table' ? 'text-sm text-blue-600' : 'text-sm text-green-600'
)

const comfortableMetaClass = computed(() =>
    props.variant === 'table' ? 'text-xs text-blue-500 mt-1' : 'text-xs text-green-500 mt-1'
)

const badgeClass = computed(() => {
    const base = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium'
    if (props.variant === 'table') {
        return [
            base,
            props.payment.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
        ]
    }
    return [
        base,
        props.payment.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800',
    ]
})
</script>
