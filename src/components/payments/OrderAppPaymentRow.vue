<template>
    <div class="flex items-center justify-between gap-1 text-xs bg-purple-50 rounded px-1.5 py-0.5 min-w-0">
        <div class="flex items-center gap-1 min-w-0 flex-1">
            <DevicePhoneMobileIcon class="w-4 h-4 text-purple-600 shrink-0" />
            <span class="font-medium truncate min-w-0 flex-1 text-left text-purple-900" :title="payment.appName">{{
                payment.appName }}</span>
            <span v-if="showSettleActions && liquidado" class="shrink-0 text-green-600" title="Liquidado">
                <CheckCircleIcon class="w-3 h-3" />
            </span>
            <span class="text-purple-700 shrink-0 tabular-nums">{{ formatCurrency(payment.amount) }}</span>
        </div>
        <div class="flex items-center shrink-0 gap-0.5">
            <button v-if="showSettleActions && !liquidado" type="button"
                class="p-0.5 rounded text-gray-500 hover:bg-gray-100 transition-colors" title="Liquidar pago"
                @click.stop="emit('settle', payment)">
                <CheckIcon class="w-3.5 h-3.5 text-emerald-600" />
            </button>
            <button v-if="showSettleActions && liquidado" type="button"
                class="p-0.5 rounded text-gray-500 hover:bg-gray-100 transition-colors" title="Desliquidar pago"
                @click.stop="emit('unsettle', payment)">
                <XMarkIcon class="w-3.5 h-3.5 text-gray-600" />
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderAppPaymentDetail } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'
import { appPaymentIsSettled } from '@/utils/orderListPayments'
import {
    DevicePhoneMobileIcon,
    CheckCircleIcon,
    CheckIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
    payment: OrderAppPaymentDetail
    showSettleActions?: boolean
}>()

const emit = defineEmits<{
    settle: [payment: OrderAppPaymentDetail]
    unsettle: [payment: OrderAppPaymentDetail]
}>()

const { formatCurrency } = useFormatting()

const liquidado = computed(() => appPaymentIsSettled(props.payment))
</script>
