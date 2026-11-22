<template>
  <div class="inline-flex max-w-full flex-col items-start gap-2" :data-wa-theme="theme">
    <OrderStatusBadge v-if="order" :status="order.status" :display-name="getOrderStatusDisplayName(order.status)"
      :status-time="order.statusTimes?.[order.status]" />
    <span v-else role="status" class="text-xs text-gray-500">{{ loading ? 'Consultando estado…' : 'Estado no disponible' }}</span>
    <div ref="anchor" data-test="order-actions-trigger" class="inline-flex max-w-full" @mouseenter="openPopover" @mouseleave="scheduleClose" @focusout="onFocusOut">
      <BaseButton variant="outline" class="rounded-r-none" @click="manage" @keydown.down.prevent="openAndFocus">
        Gestionar pedido #{{ orderId }}
      </BaseButton>
      <button ref="toggle" type="button" class="rounded-r-lg border border-l-0 border-emerald-600 px-2 text-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
        :aria-label="`Acciones rápidas del pedido ${orderId}`" :aria-expanded="open" :aria-controls="popoverId"
        @click="pinned ? close() : openAndFocus()" @keydown.down.prevent="openAndFocus">
        <ChevronDownIcon class="size-4" aria-hidden="true" />
      </button>
    </div>
    <Teleport to="body">
      <section v-if="open && enabled" :id="popoverId" ref="popover" role="region" :aria-label="`Acciones rápidas · Pedido #${orderId}`"
        :data-wa-theme="theme" class="wa-order-actions fixed z-40 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-xl"
        :style="position" @mouseenter="cancelClose" @mouseleave="scheduleClose" @focusout="onFocusOut">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h3 class="font-semibold">Pedido #{{ orderId }}</h3>
          <button type="button" aria-label="Cerrar acciones rápidas" class="rounded p-1 hover:bg-gray-100" @click="close(true)">
            <XMarkIcon class="size-4" aria-hidden="true" />
          </button>
        </div>
        <p v-if="error" role="alert" class="mb-2 text-xs text-red-700">
          {{ error }} <button type="button" class="underline" :disabled="loading || busy" @click="refresh">Reintentar</button>
        </p>
        <p v-if="loading" role="status" class="mb-2 text-xs text-gray-500">Actualizando pedido…</p>
        <template v-if="order">
          <dl class="mb-3 space-y-1 text-xs">
            <div class="flex justify-between gap-2"><dt>Total</dt><dd class="font-semibold">{{ formatCurrency(order.total) }}</dd></div>
            <div class="flex justify-between gap-2"><dt>Saldo pendiente</dt><dd class="font-semibold">{{ formatCurrency(remaining) }}</dd></div>
          </dl>
          <fieldset :disabled="disabled" class="min-w-0 space-y-2 border-0 p-0 disabled:opacity-60" :aria-busy="busy">
            <OrderBankPaymentRow v-for="payment in order.bankPayments" :key="payment.id" :payment="payment"
              density="compact" variant="panel" :show-verification-badge="true"
              :show-edit-remove="canEdit(payment)" :show-verify-action="canVerify(payment)" :show-unverify-action="canUnverify(payment)"
              @edit="beginEdit" @remove="beginRemove" @verify="verify(payment, true)" @unverify="verify(payment, false)" />
            <div v-if="canAdd" class="space-y-1 border-t border-gray-200 pt-2">
              <button v-for="bank in quickBanks" :key="bank.id" type="button" class="quick-action text-emerald-700"
                @click="transfer(bank.id)">
                <BanknotesIcon class="size-4 shrink-0" aria-hidden="true" />
                <span>Transferencia a {{ bank.name }}</span><span class="ml-auto whitespace-nowrap font-semibold">{{ formatCurrency(remaining) }}</span>
              </button>
            </div>
          </fieldset>
          <button v-if="canTrack" type="button" class="quick-action mt-2 border-t border-gray-200 pt-2 text-emerald-700" @click="track">
            <MapPinIcon class="size-4" aria-hidden="true" />Ver ubicación
          </button>
        </template>
      </section>
    </Teleport>
    <BaseDialog v-model="showEdit" title="Editar monto — pago bancario" size="sm" :dismissible="!busy">
      <template v-if="target">
        <p class="mb-3 text-sm text-gray-600">{{ target.payment.bankName }} — máximo {{ formatCurrency(maxAmount) }}</p>
        <BaseInput v-model.number="amount" type="number" label="Monto" :max="maxAmount" :disabled="disabled" />
        <p v-if="error" role="alert" class="mt-2 text-sm text-red-700">{{ error }}</p>
        <BaseButton v-if="error" size="sm" variant="ghost" :disabled="busy || loading" @click="reviewTarget">Recargar y revisar</BaseButton>
      </template>
      <template #footer>
        <BaseButton variant="secondary" :disabled="busy" @click="showEdit = false">Cancelar</BaseButton>
        <BaseButton :disabled="disabled" :loading="busy" @click="saveEdit">Guardar</BaseButton>
      </template>
    </BaseDialog>
    <BaseDialog v-model="showRemove" title="Eliminar pago bancario" size="sm" :dismissible="!busy">
      <p v-if="target" class="text-sm">¿Eliminar la transferencia de {{ formatCurrency(target.payment.amount) }} a {{ target.payment.bankName }}?</p>
      <p v-if="error" role="alert" class="mt-2 text-sm text-red-700">{{ error }}</p>
      <BaseButton v-if="error" size="sm" variant="ghost" :disabled="busy || loading" @click="reviewTarget">Recargar y revisar</BaseButton>
      <template #footer>
        <BaseButton variant="secondary" :disabled="busy" @click="showRemove = false">Cancelar</BaseButton>
        <BaseButton variant="danger" :disabled="disabled" :loading="busy" @click="saveRemove">Eliminar</BaseButton>
      </template>
    </BaseDialog>
    <OrderTrackingDialog v-if="showTracking && order" v-model="showTracking" :order="order" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, toRef, useId, watch } from 'vue'
import { BanknotesIcon, ChevronDownIcon, MapPinIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge.vue'
import OrderBankPaymentRow from '@/components/payments/OrderBankPaymentRow.vue'
import { getOrderStatusDisplayName, useFormatting } from '@/composables/useFormatting'
import { injectWhatsAppTheme } from '@/composables/useWhatsAppTheme'
import { useWhatsAppOrderActions } from '@/composables/useWhatsAppOrderActions'
import { orderCashToCollect } from '@/utils/orderCashToCollect'
import type { OrderBankPaymentDetail, OrderDetailView } from '@/types/order'

const props = withDefaults(defineProps<{ orderId: number; active?: boolean }>(), { active: true })
const emit = defineEmits<{ manage: [] }>()
const OrderTrackingDialog = defineAsyncComponent(() => import('@/components/orders/OrderTrackingDialog.vue'))
const activated = ref(true)
const enabled = computed(() => props.active && activated.value)
const { order, loading, busy, error, disabled, remaining, quickBanks, canAdd, canTrack, canEdit, canVerify, canUnverify,
  refresh, transfer, edit, remove, verify } = useWhatsAppOrderActions(toRef(props, 'orderId'), enabled)
const theme = injectWhatsAppTheme() ?? ref('light')
const { formatCurrency } = useFormatting()
const popoverId = useId()
const anchor = ref<HTMLElement>(), toggle = ref<HTMLButtonElement>(), popover = ref<HTMLElement>()
const open = ref(false)
const pinned = ref(false)
const position = ref<Record<string, string>>({})
const showEdit = ref(false), showRemove = ref(false), showTracking = ref(false)
const target = ref<{ payment: OrderBankPaymentDetail; order: OrderDetailView } | null>(null)
const amount = ref(0)
const maxAmount = computed(() => target.value ? orderCashToCollect(target.value.order.total, target.value.order, {
  floorAtZero: true, paidInStoreCash: target.value.order.paidInStoreCash,
  paidInStoreCashAmount: target.value.order.paidInStoreCashAmount,
}) + target.value.payment.amount : 0)
let closeTimer: ReturnType<typeof setTimeout> | undefined
let observer: ResizeObserver | undefined

function place() {
  if (!open.value || !anchor.value) return
  const rect = anchor.value.getBoundingClientRect()
  const width = Math.min(360, window.innerWidth - 16)
  const below = window.innerHeight - rect.bottom - 16, above = rect.top - 16
  const upwards = below < 240 && above > below
  const height = Math.max(80, Math.min(460, upwards ? above : below))
  const actualHeight = Math.min(popover.value?.offsetHeight || height, height)
  position.value = { width: `${width}px`, maxHeight: `${height}px`,
    left: `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`,
    top: `${Math.max(8, upwards ? rect.top - actualHeight - 6 : rect.bottom + 6)}px` }
}
function cancelClose() { clearTimeout(closeTimer) }
function inside(node: EventTarget | null) { return node instanceof Node && (anchor.value?.contains(node) || popover.value?.contains(node)) }
function close(restoreFocus = false) {
  cancelClose(); open.value = false; pinned.value = false
  if (restoreFocus) toggle.value?.focus()
}
function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(() => { if (!pinned.value && !inside(document.activeElement)) close() }, 180)
}
function onFocusOut(event: FocusEvent) { if (!inside(event.relatedTarget)) scheduleClose() }
function openPopover() {
  if (!enabled.value || showEdit.value || showRemove.value || showTracking.value) return
  cancelClose(); open.value = true
  place(); void nextTick(place)
}
async function openAndFocus() {
  openPopover()
  pinned.value = true
  await nextTick()
  popover.value?.querySelector<HTMLButtonElement>('button')?.focus()
}
function manage() { close(); emit('manage') }
function track() { close(); showTracking.value = true }
function beginEdit(payment: OrderBankPaymentDetail) {
  if (disabled.value || !order.value || !canEdit(payment)) return
  target.value = { payment, order: order.value }; amount.value = payment.amount
  close(); showEdit.value = true
}
function beginRemove(payment: OrderBankPaymentDetail) {
  if (disabled.value || !order.value || !canEdit(payment)) return
  target.value = { payment, order: order.value }
  close(); showRemove.value = true
}
async function saveEdit() {
  if (target.value && await edit(target.value.payment, Number(amount.value), target.value.order)) showEdit.value = false
}
async function saveRemove() {
  if (target.value && await remove(target.value.payment, target.value.order)) showRemove.value = false
}
async function reviewTarget() {
  const id = target.value?.payment.id
  if (!await refresh() || !order.value) return
  const payment = order.value.bankPayments.find(item => item.id === id)
  if (!payment) { showEdit.value = false; showRemove.value = false; return }
  target.value = { payment, order: order.value }; amount.value = payment.amount
}
function outside(event: Event) { if (open.value && !inside(event.target)) close() }
function keydown(event: KeyboardEvent) {
  if (open.value && event.key === 'Escape') { event.preventDefault(); close(true) }
}
watch([enabled, toRef(props, 'orderId')], () => {
  close(); showEdit.value = false; showRemove.value = false; showTracking.value = false; target.value = null
})
onActivated(() => { activated.value = true })
onDeactivated(() => { activated.value = false })
onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', keydown)
  window.addEventListener('resize', place)
  document.addEventListener('scroll', place, true)
  observer = new ResizeObserver(place)
  if (anchor.value) observer.observe(anchor.value)
})
onBeforeUnmount(() => {
  cancelClose(); observer?.disconnect()
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', keydown)
  window.removeEventListener('resize', place)
  document.removeEventListener('scroll', place, true)
})
</script>

<style scoped>
.wa-order-actions { color: var(--wa-text); background: var(--wa-panel); border-color: var(--wa-line); }
.quick-action { display: flex; width: 100%; align-items: center; gap: .5rem; border-radius: .375rem; padding: .5rem .25rem; text-align: left; font-size: .75rem; }
.quick-action:hover { background: var(--wa-raised); }
.quick-action:focus-visible { outline: 2px solid var(--wa-focus); outline-offset: 1px; }
</style>
