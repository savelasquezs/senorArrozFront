<template>
    <BaseDialog :model-value="open" title="Cambiar sucursal del pedido" size="md"
        :close-on-backdrop="!saving" @update:model-value="!$event && close()">
        <div class="space-y-4 text-sm text-gray-700">
            <p>
                El pedido <strong>#{{ order.id }}</strong> dejará de ser atendido por
                <strong>{{ order.branchName }}</strong>.
            </p>
            <label for="transfer-target-branch" class="block font-medium text-gray-900">Nueva sucursal</label>
            <select id="transfer-target-branch" v-model.number="targetBranchId"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                :disabled="saving">
                <option :value="null">Selecciona una sucursal</option>
                <option v-for="branch in availableBranches" :key="branch.id" :value="branch.id">
                    {{ branch.name }}
                </option>
            </select>
            <p v-if="!availableBranches.length" class="text-amber-700">
                No hay otra sucursal disponible.
            </p>

            <div v-if="order.bankPayments.length && targetBranchId" class="space-y-3">
                <p class="font-medium text-gray-900">Bancos de los pagos existentes (opcional)</p>
                <p>Si no eliges un banco nuevo, cada pago seguirá asociado a su banco original.</p>
                <p v-if="banksLoading" class="text-gray-500">Consultando bancos de la sucursal destino…</p>
                <p v-if="banksError" role="alert" class="text-amber-700">
                    {{ banksError }} Puedes conservar los bancos originales.
                </p>
                <div class="max-h-64 space-y-3 overflow-y-auto">
                    <div v-for="payment in order.bankPayments" :key="payment.id"
                        class="rounded-lg border border-gray-200 p-3">
                        <label :for="`transfer-payment-${payment.id}`" class="block font-medium text-gray-900">
                            {{ formatCOP(payment.amount) }} · {{ payment.bankName }}
                            <span v-if="payment.isVerified" class="text-emerald-700">(verificado)</span>
                        </label>
                        <p v-if="isLinkedPayment(payment)" class="mt-1 text-xs text-amber-700">
                            Vinculado a un abono o liquidación de app: no se reasigna desde este formulario.
                        </p>
                        <select :id="`transfer-payment-${payment.id}`"
                            v-model.number="paymentTargets[payment.id]"
                            class="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                            :disabled="saving || banksLoading || isLinkedPayment(payment)">
                            <option :value="0">Conservar {{ payment.bankName }}</option>
                            <option v-for="bank in destinationBanks" :key="bank.id" :value="bank.id">
                                Cambiar a {{ bank.name }}
                            </option>
                        </select>
                    </div>
                </div>
                <p v-if="bankPaymentChanges.length" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <strong>Importante:</strong> cambiar el banco en el sistema NO transfiere el dinero.
                    Si el pago ingresó al banco anterior, debes hacer la transferencia real a la nueva sucursal.
                    Los pagos reasignados quedarán pendientes de verificación. No se pueden reasignar pagos
                    de períodos cuyo cierre de caja ya se realizó.
                </p>
            </div>

            <p class="rounded-lg bg-gray-50 p-3">
                Solo se trasladan pedidos hasta el estado «Listo». Se conservan el número, productos,
                estado, pagos por apps, domiciliario, rutas e historial; no se modifica el inventario.
                Los bancos se cambian únicamente cuando los seleccionas.
            </p>
            <p v-if="failure" role="alert" class="text-red-700">{{ failure }}</p>
        </div>
        <template #footer>
            <BaseButton variant="secondary" :disabled="saving" @click="close">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="!canSubmit"
                @click="transfer">Confirmar traslado</BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { orderApi } from '@/services/MainAPI/orderApi'
import { bankApi } from '@/services/MainAPI/bankApi'
import { useBranchContextStore } from '@/store/branchContext'
import type { OrderDetailView, OrderBankPaymentDetail } from '@/types/order'
import type { Bank } from '@/types/bank'

const props = defineProps<{ open: boolean; order: OrderDetailView }>()
const emit = defineEmits<{ close: []; transferred: [targetBranchId: number] }>()
const branchContext = useBranchContextStore()
const targetBranchId = ref<number | null>(null)
const paymentTargets = ref<Record<number, number>>({})
const destinationBanks = ref<Bank[]>([])
const banksLoading = ref(false)
const banksError = ref('')
const saving = ref(false)
const failure = ref('')
let latestBanksRequest = 0

const allowedStatuses = ['awaiting_payment', 'taken', 'in_preparation', 'ready']
const isTransferAllowed = computed(() => allowedStatuses.includes(props.order.status))
const availableBranches = computed(() =>
    branchContext.options.filter(branch => branch.id !== props.order.branchId))
const bankPaymentChanges = computed(() => props.order.bankPayments
    .filter(payment => (paymentTargets.value[payment.id] ?? 0) > 0 && !isLinkedPayment(payment))
    .map(payment => ({ paymentId: payment.id, targetBankId: paymentTargets.value[payment.id]! })))
const canSubmit = computed(() => isTransferAllowed.value && !saving.value && targetBranchId.value != null &&
    availableBranches.value.some(branch => branch.id === targetBranchId.value) &&
    bankPaymentChanges.value.every(change => destinationBanks.value.some(bank => bank.id === change.targetBankId)))

function isLinkedPayment(payment: OrderBankPaymentDetail) {
    return payment.isAppSettlement === true || payment.sourceReservationDepositId != null
}

watch(() => props.open, open => {
    if (open) {
        targetBranchId.value = null
        paymentTargets.value = {}
        failure.value = ''
    }
})

watch(targetBranchId, async (id) => {
    const request = ++latestBanksRequest
    paymentTargets.value = {}
    destinationBanks.value = []
    banksError.value = ''
    banksLoading.value = !!id && !!props.order.bankPayments.length
    if (!banksLoading.value || !id) return
    try {
        const response = await bankApi.getBanks({
            branchId: id, forOrderCreation: true, active: true, page: 1, pageSize: 100,
        })
        if (request === latestBanksRequest)
            destinationBanks.value = response.items.filter(bank => bank.type == null || bank.type === 'normal')
    } catch {
        if (request === latestBanksRequest)
            banksError.value = 'No fue posible consultar los bancos disponibles.'
    } finally {
        if (request === latestBanksRequest) banksLoading.value = false
    }
})

function close() {
    if (!saving.value) emit('close')
}

function formatCOP(amount: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
        .format(amount)
}

async function transfer() {
    if (!canSubmit.value || targetBranchId.value == null) return
    saving.value = true
    failure.value = ''
    try {
        const target = targetBranchId.value
        await orderApi.transferBranch(props.order.id, target, props.order, bankPaymentChanges.value)
        emit('transferred', target)
    } catch (err: unknown) {
        failure.value = err instanceof Error ? err.message : 'No fue posible cambiar la sucursal.'
    } finally {
        saving.value = false
    }
}
</script>
