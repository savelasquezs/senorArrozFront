<template>
    <BaseDialog
        :model-value="open"
        title="Total del pedido cambió"
        size="md"
        @update:model-value="(v: boolean) => { if (!v) emit('close') }"
    >
        <div v-if="prompt.kind === 'adjust'" class="space-y-3 text-sm text-gray-700">
            <p>
                Antes el pedido estaba cubierto por un único pago bancario de
                <strong>{{ formatCurrency(prompt.previousTotal) }}</strong>.
                El nuevo total es <strong>{{ formatCurrency(prompt.newTotal) }}</strong>.
            </p>
            <p>¿Actualizar ese pago bancario al nuevo total?</p>
        </div>
        <div v-else-if="prompt.kind === 'warn'" class="space-y-3 text-sm text-gray-700">
            <p>
                El total pasó de <strong>{{ formatCurrency(prompt.previousTotal) }}</strong> a
                <strong>{{ formatCurrency(prompt.newTotal) }}</strong>, pero había varios pagos bancarios o también pago
                por app. La suma registrada ya no coincide con el total.
            </p>
            <p>Revisa y ajusta los pagos en la pestaña Pagos.</p>
        </div>

        <template #footer>
            <BaseButton variant="secondary" @click="emit('close')">Cerrar</BaseButton>
            <BaseButton v-if="prompt.kind === 'warn'" variant="primary" @click="goToPayments">
                Ir a pagos
            </BaseButton>
            <BaseButton
                v-if="prompt.kind === 'adjust'"
                variant="primary"
                :loading="adjusting"
                @click="emit('confirm-adjust')"
            >
                Actualizar pago a {{ formatCurrency(prompt.newTotal) }}
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useFormatting } from '@/composables/useFormatting'
import type { BankSyncPrompt } from '@/utils/orderPaymentCoverage'

const props = defineProps<{
    open: boolean
    prompt: BankSyncPrompt
    adjusting?: boolean
}>()

const emit = defineEmits<{
    close: []
    'confirm-adjust': []
    'go-to-payments': []
}>()

const { formatCurrency } = useFormatting()

function goToPayments() {
    emit('go-to-payments')
    emit('close')
}
</script>
