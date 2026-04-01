<template>
    <BaseDialog :model-value="show" size="2xl" title="Liquidar domiciliario"
        @update:model-value="onDialogToggle">
        <div v-if="detail" class="space-y-5">
            <div class="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                <div class="flex justify-between">
                    <span class="text-gray-600">Domiciliario</span>
                    <span class="font-medium">{{ detail.deliverymanName }}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Base usada</span>
                    <span>{{ formatCurrency(detail.baseAmount) }}</span>
                </div>
                <div class="flex justify-between font-semibold border-t border-gray-200 pt-2">
                    <span>Total a liquidar</span>
                    <span class="text-emerald-700">{{ formatCurrency(expectedTotalToSettle) }}</span>
                </div>
            </div>

            <div v-if="pendingOnTheWayCount > 0"
                class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p class="font-medium">Hay {{ pendingOnTheWayCount }} pedido(s) en camino sin entregar.</p>
                <p class="mt-1 text-xs">La liquidación solo incluye pedidos ya entregados. Debes entregarlos o
                    reasignarlos antes de liquidar.</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Efectivo contado (estilo Excel)</label>
                <p class="text-xs text-gray-500 mb-2">Ejemplo: +45000+200+3800+6500</p>
                <textarea v-model="cashFormula" rows="2"
                    class="w-full rounded-lg border border-gray-300 text-sm font-mono p-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="+0" />
                <p class="text-sm mt-1">
                    Suma efectivo: <span class="font-semibold">{{ formatCurrency(cashCounted) }}</span>
                </p>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-700">Transferencias</span>
                    <BaseButton type="button" size="sm" variant="outline" @click="addBankRow">
                        + Transferencia
                    </BaseButton>
                </div>
                <div v-for="(row, idx) in bankRows" :key="idx" class="flex flex-wrap gap-2 items-end">
                    <div class="flex-1 min-w-[140px]">
                        <BaseSelect v-model="row.bankId" :options="bankOptions" value-key="value" display-key="label"
                            placeholder="Banco" />
                    </div>
                    <BaseInput v-model.number="row.amount" type="number" class="w-36" :min="0" :step="100" />
                    <button type="button" class="text-red-600 text-sm p-1" @click="bankRows.splice(idx, 1)">Quitar</button>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-700">Gastos (abono por gasto)</span>
                    <BaseButton type="button" size="sm" variant="outline" @click="showExpenseModal = true">
                        Registrar gasto
                    </BaseButton>
                </div>
                <ul v-if="expenseRows.length" class="text-sm space-y-1 border rounded-lg p-2 bg-amber-50/50">
                    <li v-for="(e, idx) in expenseRows" :key="e.expenseHeaderId" class="flex justify-between gap-2">
                        <span>#{{ e.expenseHeaderId }} — {{ e.label }}</span>
                        <span class="flex items-center gap-2">
                            {{ formatCurrency(e.amount) }}
                            <button type="button" class="text-red-600" @click="expenseRows.splice(idx, 1)">×</button>
                        </span>
                    </li>
                </ul>
                <p v-else class="text-xs text-gray-500">Opcional: crea un gasto asociado al domiciliario y luego aparecerá aquí.</p>
            </div>

            <div class="rounded-lg border p-3 text-sm space-y-1"
                :class="isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'">
                <div class="flex justify-between">
                    <span>Total ingresado</span>
                    <span class="font-semibold">{{ formatCurrency(totalApplied) }}</span>
                </div>
                <div class="flex justify-between">
                    <span>Diferencia</span>
                    <span :class="isBalanced ? 'text-emerald-700' : 'text-amber-800'">
                        {{ formatCurrency(totalApplied - expectedTotalToSettle) }}
                    </span>
                </div>
                <p v-if="!isBalanced" class="text-xs text-amber-900 pt-1">
                    Ajusta efectivo, transferencias o gastos hasta que la diferencia sea 0.
                </p>
                <p v-else-if="!canSubmitReturnBase && canSubmitFull" class="text-xs text-gray-600 pt-1">
                    Para <strong>Liquidar y devolver base</strong> el efectivo contado debe ser al menos la base
                    ({{ formatCurrency(detail?.baseAmount ?? 0) }}). Usa liquidación total si llevas menos efectivo.
                </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
                <BaseButton type="button" variant="success" class="flex-1" :disabled="!canSubmitFull" :loading="submitting"
                    @click="submit(1)">
                    Liquidar totalmente (bloquear tarjeta)
                </BaseButton>
                <BaseButton type="button" variant="secondary" class="flex-1" :disabled="!canSubmitReturnBase" :loading="submitting"
                    @click="submit(2)">
                    Liquidar y devolver base
                </BaseButton>
            </div>
        </div>

        <template #footer>
            <BaseButton type="button" variant="secondary" @click="close">Cancelar</BaseButton>
        </template>

        <ExpenseFormModal :is-open="showExpenseModal" :preset-deliveryman-id="detail?.deliverymanId ?? null"
            @close="showExpenseModal = false" @submit="onExpenseCreated" />
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { DeliverymanDetail, SettleDeliverymanDayResultDto } from '@/types/deliveryman'
import type { ExpenseHeader } from '@/types/expense'
import { deliverymanApi } from '@/services/MainAPI/deliverymanApi'
import { useFormatting } from '@/composables/useFormatting'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal.vue'

const show = defineModel<boolean>({ required: true })

const props = defineProps<{
    detail: DeliverymanDetail | null
    selectedDate: string
    bankOptions: Array<{ value: number; label: string }>
}>()

const emit = defineEmits<{
    success: [result: SettleDeliverymanDayResultDto]
}>()

function close() {
    show.value = false
}

function onDialogToggle(v: boolean) {
    show.value = v
}

const { formatCurrency } = useFormatting()

const cashFormula = ref('')
const bankRows = ref<Array<{ bankId: number; amount: number }>>([])
const expenseRows = ref<Array<{ expenseHeaderId: number; amount: number; label: string }>>([])
const showExpenseModal = ref(false)
const submitting = ref(false)

function parseCashFormula(raw: string): number {
    const t = raw.trim()
    if (!t) return 0
    const withPlus = t.startsWith('+') ? t : `+${t}`
    const parts = withPlus.split('+').map((s) => s.replace(/\s/g, '').replace(/,/g, '')).filter(Boolean)
    let sum = 0
    for (const p of parts) {
        const n = Number(p)
        if (!Number.isNaN(n)) sum += n
    }
    return sum
}

const cashCounted = computed(() => parseCashFormula(cashFormula.value))

/** Debe coincidir con el backend: totalCash + base - advances (currentBalance). */
const expectedTotalToSettle = computed(() => {
    if (!props.detail) return 0
    return Math.max(0, props.detail.currentBalance)
})

const pendingOnTheWayCount = computed(() => props.detail?.ordersOnTheWayCount ?? 0)

const bankSum = computed(() =>
    bankRows.value.reduce((s, r) => s + (Number(r.amount) || 0), 0)
)

const expenseSum = computed(() => expenseRows.value.reduce((s, e) => s + e.amount, 0))

const totalApplied = computed(() => cashCounted.value + bankSum.value + expenseSum.value)

const isBalanced = computed(() => Math.abs(totalApplied.value - expectedTotalToSettle.value) < 1)

const canSubmitFull = computed(
    () =>
        !!props.detail &&
        expectedTotalToSettle.value > 0 &&
        pendingOnTheWayCount.value === 0 &&
        isBalanced.value &&
        bankRows.value.every((r) => r.bankId > 0 && r.amount > 0) &&
        !submitting.value
)

const canSubmitReturnBase = computed(
    () =>
        canSubmitFull.value &&
        cashCounted.value + 1e-6 >= (props.detail?.baseAmount ?? 0)
)

watch(
    show,
    (open) => {
        if (open) {
            cashFormula.value = ''
            bankRows.value = []
            expenseRows.value = []
        }
    }
)

function addBankRow() {
    bankRows.value.push({ bankId: props.bankOptions[0]?.value ?? 0, amount: 0 })
}

function onExpenseCreated(expense: ExpenseHeader) {
    showExpenseModal.value = false
    const total = expense.total ?? 0
    if (total <= 0) return
    expenseRows.value.push({
        expenseHeaderId: expense.id,
        amount: total,
        label: expense.supplierName || 'Gasto',
    })
}

async function submit(mode: 1 | 2) {
    if (!props.detail) return
    if (mode === 2 && !canSubmitReturnBase.value) return
    if (mode === 1 && !canSubmitFull.value) return
    submitting.value = true
    try {
        const transfers = bankRows.value
            .filter((r) => r.bankId > 0 && r.amount > 0)
            .map((r) => ({ bankId: r.bankId, amount: r.amount }))
        const result = await deliverymanApi.settleDay(props.detail.deliverymanId, {
            date: props.selectedDate,
            baseAmount: props.detail.baseAmount,
            cashAmount: cashCounted.value,
            bankTransfers: transfers,
            expenseOffsets: expenseRows.value.map((e) => ({
                expenseHeaderId: e.expenseHeaderId,
                amount: e.amount,
            })),
            mode,
        })
        emit('success', result)
        close()
    } finally {
        submitting.value = false
    }
}
</script>
