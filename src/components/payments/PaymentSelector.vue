<template>
    <div ref="container" class="payment-selector">
        <section v-for="section in sections" :key="section.type" :aria-label="section.label" class="payment-section">
            <header v-if="section.type !== 'cash'" class="payment-heading">
                <div class="flex items-center gap-1">
                    <span>{{ section.label }}</span>
                    <button v-if="section.type === 'bank' && section.rows.length" type="button"
                        class="payment-icon text-gray-500 hover:text-gray-800" aria-label="Agregar otro banco"
                        title="Agregar otro banco" :aria-expanded="showBankOptions" :disabled="!canAddPayments"
                        @click="toggleBankOptions">
                        <PlusIcon class="h-3.5 w-3.5" />
                    </button>
                </div>
                <span v-if="section.type === 'bank'" class="tabular-nums" aria-live="polite">
                    Por cobrar <span class="ml-1">{{ formatCurrency(cashAmount) }}</span>
                </span>
            </header>

            <TransitionGroup name="payment-row" tag="div" class="payment-lines">
                <form v-for="payment in section.rows" :key="payment.id" class="payment-line" novalidate
                    :data-payment-id="payment.id" :data-payment-type="section.type" @submit.prevent="savePaymentAmount">
                    <span class="min-w-0 truncate" :title="payment.name">{{ payment.name }}</span>
                    <template v-if="isEditing(section.type, payment.id)">
                        <label class="payment-amount-input">
                            <span aria-hidden="true">$</span>
                            <input v-model.number="paymentAmount" type="number" inputmode="numeric" min="1" step="1"
                                :max="maxPaymentAmount" :aria-label="`Monto de ${payment.name}`"
                                :aria-invalid="!!editingError" :aria-describedby="editingError ? errorId : undefined"
                                @input="editingError = ''" @keydown.esc.prevent="cancelEditing" />
                        </label>
                        <button type="submit" class="payment-icon text-emerald-600 hover:bg-emerald-50"
                            :aria-label="`Guardar pago de ${payment.name}`" title="Guardar monto">
                            <CheckIcon class="h-4 w-4" />
                        </button>
                        <button type="button" class="payment-icon text-red-500 hover:bg-red-50"
                            :aria-label="`Cancelar edición de ${payment.name}`" title="Cancelar edición"
                            @click="cancelEditing">
                            <XMarkIcon class="h-3.5 w-3.5" />
                        </button>
                        <p v-if="editingError" :id="errorId" class="col-span-4 text-[11px] text-red-600" role="alert">
                            {{ editingError }}
                        </p>
                    </template>
                    <template v-else>
                        <strong class="text-right font-medium tabular-nums">{{ formatCurrency(payment.amount) }}</strong>
                        <button type="button" class="payment-icon text-sky-600 hover:bg-sky-50"
                            :aria-label="`Editar pago de ${payment.name}`" title="Editar monto"
                            @click="editPayment(section.type, payment)">
                            <PencilIcon class="h-3.5 w-3.5" />
                        </button>
                        <button type="button" class="payment-icon text-red-500 hover:bg-red-50"
                            :aria-label="`Quitar pago de ${payment.name}`" title="Quitar pago"
                            @click="removePayment(section.type, payment.id)">
                            <XMarkIcon class="h-3.5 w-3.5" />
                        </button>
                    </template>
                </form>
            </TransitionGroup>

            <div v-if="!section.rows.length || (section.type === 'bank' && showBankOptions)" class="payment-choices">
                <template v-if="section.options.length">
                    <button v-for="option in section.options.slice(0, 3)" :key="option.id" type="button"
                        class="payment-link" :aria-label="`Agregar pago de ${option.name}`"
                        :title="section.type === 'cash' ? 'Registrar efectivo recibido en tienda' : option.name"
                        :disabled="!canAddPayments" @click="addPayment(section.type, option.id)">
                        {{ option.name }}
                    </button>
                    <select v-if="section.options.length > 3" class="payment-more" :disabled="!canAddPayments"
                        :aria-label="`Más opciones de ${section.type === 'bank' ? 'bancos' : 'aplicaciones'}`"
                        @change="selectOtherPayment(section.type, $event)">
                        <option value="" selected disabled>Más opciones</option>
                        <option v-for="option in section.options.slice(3)" :key="option.id" :value="option.id">
                            {{ option.name }}
                        </option>
                    </select>
                </template>
                <span v-else class="text-xs text-gray-400">Sin opciones disponibles</span>
            </div>
        </section>

        <p v-if="totalPayments > order.total" class="mt-2 text-xs text-red-600" role="alert">
            Los pagos exceden el total por {{ formatCurrency(totalPayments - order.total) }}.
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { CheckIcon, PencilIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrderPayments } from '@/composables/useOrderPayments'
import { formatCurrency } from '@/composables/useFormatting'
import { orderCashToCollect, sumOrderNonCashPayments } from '@/utils/orderCashToCollect'
import type { DraftOrder } from '@/types/order'

type PaymentType = 'bank' | 'app' | 'cash'
interface PaymentRow { id: string; name: string; amount: number }

const props = defineProps<{ order: DraftOrder }>()
const emit = defineEmits<{
    paymentUpdated: [order: DraftOrder]
    editingChanged: [editing: boolean]
}>()
const ordersStore = useOrdersDraftsStore()
const payments = useOrderPayments()
const container = ref<HTMLElement | null>(null)
const showBankOptions = ref(false)
const editingPayment = ref<{ type: PaymentType; id: string } | null>(null)
const paymentAmount = ref<number | string>(0)
const editingError = ref('')
const errorId = computed(() => `payment-error-${props.order.tabId}`)

const branchId = computed(() => props.order.branchId ?? ordersStore.activeBranchId)
const bankOptions = computed(() => ordersStore.banks.filter(bank =>
    bank.active && bank.branchId === branchId.value && !bank.isHidden
    && (bank.type == null || bank.type === 'normal'),
))
const appOptions = computed(() => ordersStore.apps.filter(app => app.active && app.branchId === branchId.value))
const nonCashPayments = computed(() => sumOrderNonCashPayments(props.order))
const paidCashAmount = computed(() => {
    if (!props.order.paidInStoreCash) return 0
    const amount = props.order.paidInStoreCashAmount
    return typeof amount === 'number' && Number.isFinite(amount)
        ? amount
        : Math.max(0, props.order.total - nonCashPayments.value)
})
const totalPayments = computed(() => nonCashPayments.value + paidCashAmount.value)
const sections = computed(() => [
    {
        type: 'bank' as const,
        label: 'Bancos',
        options: bankOptions.value,
        rows: props.order.bankPayments.map(payment => ({ id: payment.tempId, name: payment.bankName, amount: payment.amount })),
    },
    {
        type: 'app' as const,
        label: 'Aplicaciones',
        options: appOptions.value,
        rows: props.order.appPayment
            ? [{ id: props.order.appPayment.tempId, name: props.order.appPayment.appName, amount: props.order.appPayment.amount }]
            : [],
    },
    {
        type: 'cash' as const,
        label: 'Efectivo en tienda',
        options: [{ id: 0, name: 'Efectivo' }],
        rows: props.order.paidInStoreCash
            ? [{ id: 'cash', name: 'Efectivo', amount: paidCashAmount.value }]
            : [],
    },
])
const cashToCollect = (order: DraftOrder) => orderCashToCollect(order.total, order, {
    floorAtZero: true,
    paidInStoreCash: order.paidInStoreCash === true,
    paidInStoreCashAmount: order.paidInStoreCashAmount ?? null,
})
const cashAmount = computed(() => cashToCollect(props.order))
const canAddPayments = computed(() => cashAmount.value > 0)
const editedRow = computed(() => sections.value.find(section => section.type === editingPayment.value?.type)
    ?.rows.find(row => row.id === editingPayment.value?.id))
const maxPaymentAmount = computed(() => props.order.total - totalPayments.value + (editedRow.value?.amount ?? 0))
const isEditing = (type: PaymentType, id: string) => editingPayment.value?.type === type && editingPayment.value.id === id
const isCurrentDraft = () => ordersStore.currentTabId === props.order.tabId
    && ordersStore.currentOrder?.branchId === props.order.branchId

watch(() => editingPayment.value !== null, editing => emit('editingChanged', editing), { immediate: true, flush: 'sync' })

watch(editedRow, row => {
    if (!row && editingPayment.value) cancelEditing()
}, { flush: 'sync' })

watch([() => props.order.tabId, () => props.order.branchId], () => {
    editingPayment.value = null
    editingError.value = ''
    showBankOptions.value = false
}, { flush: 'sync' })

const notifyPaymentUpdated = () => emit('paymentUpdated', ordersStore.currentOrder ?? props.order)

async function focusPayment(type: PaymentType, id: string, selector: string) {
    await nextTick()
    const row = Array.from(container.value?.querySelectorAll<HTMLElement>('[data-payment-id]') ?? [])
        .find(element => element.dataset.paymentId === id && element.dataset.paymentType === type)
    const target = row?.querySelector<HTMLElement>(selector)
    target?.focus({ preventScroll: true })
    if (target instanceof HTMLInputElement) target.select()
}

function editPayment(type: PaymentType, payment: PaymentRow) {
    if (!isCurrentDraft()) return
    editingPayment.value = { type, id: payment.id }
    paymentAmount.value = payment.amount
    editingError.value = ''
    showBankOptions.value = false
    void focusPayment(type, payment.id, 'input')
}

function cancelEditing() {
    const previous = editingPayment.value
    editingPayment.value = null
    editingError.value = ''
    if (previous) void focusPayment(previous.type, previous.id, 'button')
}

function savePaymentAmount() {
    if (!editingPayment.value || !editedRow.value || !isCurrentDraft()) {
        cancelEditing()
        return
    }
    const amount = Number(paymentAmount.value)
    if (!Number.isFinite(amount) || amount <= 0) {
        editingError.value = 'Ingresa un valor mayor que cero.'
        return
    }
    if (editingPayment.value.type === 'cash' && amount < 1) {
        editingError.value = 'El efectivo debe ser de al menos $1.'
        return
    }
    if (amount > maxPaymentAmount.value) {
        editingError.value = `El máximo es ${formatCurrency(maxPaymentAmount.value)}.`
        return
    }
    if (editingPayment.value.type === 'cash') {
        ordersStore.updatePaidInStoreCash({ paidInStoreCash: true, paidInStoreCashAmount: amount })
    } else if (editingPayment.value.type === 'app') payments.updateAppPayment(amount)
    else payments.updateBankPayment(editingPayment.value.id, amount)
    cancelEditing()
    notifyPaymentUpdated()
}

function removePayment(type: PaymentType, id: string) {
    if (!isCurrentDraft()) return
    if (isEditing(type, id)) cancelEditing()
    if (type === 'cash') ordersStore.updatePaidInStoreCash({ paidInStoreCash: false })
    else if (type === 'app') payments.removeAppPayment()
    else payments.removeBankPayment(id)
    notifyPaymentUpdated()
}

function addPayment(type: PaymentType, id: number) {
    const order = ordersStore.currentOrder
    if (!order || !isCurrentDraft()) return
    const options = sections.value.find(section => section.type === type)?.options ?? []
    if (!options.some(option => option.id === id)
        || (type === 'app' && order.appPayment)
        || (type === 'cash' && order.paidInStoreCash)) return
    // Read the live draft so a second click cannot reuse the pre-render balance.
    const amount = cashToCollect(order)
    if (amount <= 0) return
    if (type === 'cash') ordersStore.updatePaidInStoreCash({ paidInStoreCash: true, paidInStoreCashAmount: amount })
    else if (type === 'app') payments.addAppPayment(id, amount)
    else payments.addBankPayment(id, amount)
    showBankOptions.value = false
    notifyPaymentUpdated()
}

function selectOtherPayment(type: PaymentType, event: Event) {
    const select = event.target as HTMLSelectElement
    const id = Number(select.value)
    select.value = ''
    if (id > 0) addPayment(type, id)
}

function toggleBankOptions() {
    cancelEditing()
    showBankOptions.value = !showBankOptions.value
}
</script>

<style scoped>
.payment-selector { display: grid; gap: 12px; }
.payment-section { min-width: 0; }
.payment-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; font-size: 11px; color: #6b7280; }
.payment-lines { display: grid; gap: 3px; }
.payment-line { display: grid; grid-template-columns: minmax(0, 1fr) minmax(88px, auto) 24px 24px; align-items: center; column-gap: 8px; min-height: 28px; font-size: 12px; color: #374151; }
.payment-choices { display: flex; align-items: center; gap: 16px; min-height: 28px; }
.payment-link { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0; border: 0; background: none; color: #374151; font-size: 13px; line-height: 26px; cursor: pointer; }
.payment-link:hover { color: #047857; text-decoration: underline; text-underline-offset: 3px; }
.payment-more { width: 88px; flex-shrink: 0; padding: 0; border: 0; border-radius: 0; background: transparent; appearance: none; color: #6b7280; font-size: 12px; line-height: 26px; cursor: pointer; }
.payment-icon { position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 4px; background-color: transparent; cursor: pointer; }
.payment-icon::after { content: ''; position: absolute; inset: -3px; }
.payment-link:focus-visible, .payment-more:focus-visible, .payment-icon:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 3px; }
.payment-link:disabled, .payment-more:disabled, .payment-icon:disabled { cursor: default; opacity: .4; text-decoration: none; }
.payment-amount-input { display: flex; align-items: center; gap: 4px; width: 110px; height: 24px; margin-left: auto; padding: 0 5px; border: 1px solid #a7f3d0; border-radius: 4px; color: #6b7280; }
.payment-amount-input:focus-within { border-color: #059669; box-shadow: 0 0 0 1px #d1fae5; }
.payment-amount-input input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; font-size: 12px; line-height: 22px; color: #374151; text-align: right; font-variant-numeric: tabular-nums; appearance: textfield; }
.payment-amount-input input::-webkit-inner-spin-button, .payment-amount-input input::-webkit-outer-spin-button { appearance: none; margin: 0; }
.payment-row-enter-active, .payment-row-leave-active, .payment-row-move { transition: opacity 160ms ease, transform 160ms ease; }
.payment-row-enter-from, .payment-row-leave-to { opacity: 0; transform: translateY(6px); }
@media (pointer: coarse) { .payment-link, .payment-more { min-height: 44px; margin-block: -8px; } }
@media (prefers-reduced-motion: reduce) { .payment-row-enter-active, .payment-row-leave-active, .payment-row-move { transition: none; } }
</style>
