<template>
  <div class="flex h-full min-h-0 flex-col bg-white" data-test="whatsapp-order-panel">
    <Teleport v-if="controlsTarget && active" :to="controlsTarget">
      <label v-if="session?.status === 'active'" class="inline-flex items-center gap-1.5 text-xs text-gray-500">
        Estado
        <select v-model="commercialStatus" aria-label="Estado comercial" :disabled="!editable" class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700">
          <option value="in_progress">En proceso</option><option value="waiting_customer">Esperando cliente</option>
        </select>
      </label>
      <BaseButton v-if="session?.status === 'active'" size="sm" variant="ghost" :disabled="!editable" @click="showCancel = true">Sin venta</BaseButton>
      <BaseButton v-if="session" size="sm" variant="ghost" @click="showNotes = true">Notas internas</BaseButton>
      <p role="status" :class="saveState === 'conflict' || saveState === 'error' ? 'text-red-700' : 'text-gray-500'">{{ syncing ? 'Actualizando pedido…' : saveLabels[saveState] }}</p>
    </Teleport>
    <div v-if="error || saveState === 'conflict' || saveState === 'error'" class="shrink-0 space-y-2 border-b p-3 text-xs">
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <div v-if="saveState === 'conflict' || saveState === 'error'" class="flex gap-2">
        <BaseButton size="sm" variant="outline" @click="showReload = true">Recargar y revisar</BaseButton>
        <BaseButton v-if="saveState === 'error'" size="sm" variant="outline" @click="run(flush)">Reintentar guardado</BaseButton>
      </div>
    </div>
    <BaseLoading v-if="loading" text="Cargando pedido…" />
    <div v-else-if="!session" class="space-y-3 p-4">
      <p class="text-sm text-gray-500">Sin iniciar. Las consultas informativas no generan un pedido.</p>
      <BaseButton :disabled="!owned || syncing" @click="run(start)">Iniciar pedido</BaseButton>
      <p v-if="!owned" class="text-xs text-amber-800">Toma la conversación para editar su pedido.</p>
    </div>
    <div v-else-if="session.status !== 'active'" class="space-y-3 overflow-y-auto p-4">
      <p class="font-semibold text-emerald-800">{{ session.orderId ? `Pedido tomado · #${session.orderId}` : session.checkoutId && session.commercialStatus !== 'no_sale' ? 'Pago en línea pendiente' : 'Sin venta / Cancelado' }}</p>
      <template v-if="session.orderId">
        <p v-if="session.confirmationStatus" class="text-xs text-gray-600">Confirmación por WhatsApp: {{ session.confirmationStatus }}</p>
        <p v-if="session.confirmationError" class="text-xs text-amber-800">El pedido ya existe. {{ session.confirmationError === 'provider_rejected_retryable' ? 'Puedes reintentar el mensaje.' : 'Revisa el envío antes de repetirlo.' }}</p>
        <BaseButton variant="outline" @click="openOrder">Gestionar pedido #{{ session.orderId }}</BaseButton>
        <BaseButton v-if="session.confirmationStatus === 'failed' && session.confirmationError === 'provider_rejected_retryable'" :disabled="!owned || syncing" variant="outline" @click="run(() => action('retry-message'))">Reintentar mensaje</BaseButton>
      </template>
      <BaseButton :disabled="!owned || syncing || !!session.checkoutId && !session.orderId && session.commercialStatus !== 'no_sale'" @click="showNew = true">Nuevo pedido</BaseButton>
    </div>
    <template v-else>
      <fieldset :disabled="!editable" class="min-h-0 min-w-0 w-full flex-1 overflow-hidden border-0 p-0 disabled:opacity-65">
        <OrderSidebar chat-actions :can-send-address-choices="canSendChoices && !sendingChoices"
          @send-address-choices="sendChoices" @draft-message="text => emit('draft-message', conversation.id, text)" />
      </fieldset>
    </template>
    <BaseDialog v-model="showNotes" title="Notas internas · nunca se envían al cliente" size="md">
      <template v-if="session">
      <ul class="my-2 max-h-28 space-y-2 overflow-y-auto"><li v-for="(note, index) in session.internalNotes" :key="index" class="whitespace-pre-wrap rounded bg-amber-50 p-2">{{ note.text }}</li></ul>
      <form class="flex gap-2" @submit.prevent="saveNote">
        <textarea v-model="noteText" maxlength="4000" :disabled="!owned || syncing" aria-label="Nota interna" class="min-w-0 flex-1 rounded border p-2" />
        <BaseButton size="sm" type="submit" :disabled="!owned || syncing || !noteText.trim()">Guardar nota</BaseButton>
      </form>
      </template>
    </BaseDialog>
    <BaseDialog v-model="showReload" title="Recargar borrador" size="sm"><p>Se descartarán tus cambios locales sin guardar y se cargará la versión compartida.</p><BaseButton class="mt-3" @click="showReload = false; run(() => load(true))">Descartar cambios y recargar</BaseButton></BaseDialog>
    <BaseDialog v-model="showCancel" title="Cerrar sin venta" size="sm"><p>El borrador quedará en el historial de esta conversación.</p><BaseButton class="mt-3" @click="showCancel = false; run(() => action('cancel'))">Cerrar sin venta</BaseButton></BaseDialog>
    <BaseDialog v-model="showNew" title="Nuevo pedido" size="sm"><p>Se conservará el intento anterior y se creará una nueva clave de pedido.</p><BaseButton class="mt-3" @click="showNew = false; run(start)">Iniciar nuevo pedido</BaseButton></BaseDialog>
    <BaseDialog v-model="showOrder" :title="`Pedido #${session?.orderId}`" size="6xl">
      <OrderDetailContent v-if="persistedOrder" :flat-order="persistedOrder" />
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, toRef, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrderSidebar from '@/components/orders/OrderSidebar.vue'
import { useWhatsAppCommercialDraft } from '@/composables/useWhatsAppCommercialDraft'
import { useOrdersDataStore } from '@/store/ordersData'
import type { OrderDetailView } from '@/types/order'
import type { WhatsAppCommercialDraft, WhatsAppConversation, WhatsAppMessage, WhatsAppProductSuggestion, WhatsAppProductSuggestionState } from '@/types/whatsapp'

const props = defineProps<{ conversation: WhatsAppConversation; initialDraft?: Promise<WhatsAppCommercialDraft | null | undefined>; controlsTarget?: HTMLElement | null; canSendChoices?: boolean }>()
const OrderDetailContent = defineAsyncComponent(() => import('@/components/orders/OrderDetailContent.vue'))
const emit = defineEmits<{
  change: [draft: WhatsAppCommercialDraft]
  'draft-message': [conversationId: number, text: string]
  'addresses-sent': [conversationId: number, messages: WhatsAppMessage[]]
  'product-suggestion-state': [state: WhatsAppProductSuggestionState]
}>()
const { session, draft, loading, syncing, error, saveState, commercialStatus, editable, owned, load, start, flush, action, refreshStatus, reconcile, sendAddressChoices, sendProductChoices, canApplyProductSuggestion, addProductSuggestion } = useWhatsAppCommercialDraft(toRef(props, 'conversation'), props.initialDraft)
defineExpose({
  reconcile: () => run(() => reconcile(true)), sendProductChoices,
  applyProductSuggestion: (messageId: number, suggestion: WhatsAppProductSuggestion) =>
    run(() => addProductSuggestion(messageId, suggestion, () => active.value)),
})
const productSuggestionState = computed<WhatsAppProductSuggestionState>(() => ({
  conversationId: props.conversation.id,
  branchId: draft.value?.branchId ?? null,
  version: session.value?.version ?? null,
  canApply: canApplyProductSuggestion.value,
  applied: new Set(draft.value?.orderItems.filter(item => item.whatsAppSuggestionMessageId)
    .map(item => `${item.whatsAppSuggestionMessageId}:${item.productId}`)),
}))
watch(productSuggestionState, value => emit('product-suggestion-state', value), { immediate: true })
const noteText = ref(''), showReload = ref(false), showNew = ref(false), showCancel = ref(false), showOrder = ref(false), showNotes = ref(false)
const persistedOrder = ref<OrderDetailView | null>(null)
const sendingChoices = ref(false)
const saveLabels = { saved: 'Guardado', pending: 'Cambios pendientes', saving: 'Guardando…', conflict: 'Conflicto: revisa la versión compartida', error: 'No se pudo guardar' }
async function run(operation: () => Promise<unknown>) {
  try { await operation() } catch (cause) { error.value = cause instanceof Error ? cause.message : 'No se pudo completar la operación.' }
}
async function sendChoices() {
  if (!props.canSendChoices || !editable.value || sendingChoices.value) return
  sendingChoices.value = true
  error.value = ''
  const id = props.conversation.id
  try {
    await run(async () => emit('addresses-sent', id, await sendAddressChoices()))
  } finally { sendingChoices.value = false }
}
async function saveNote() { await run(async () => { await action('note', noteText.value); noteText.value = '' }) }
async function openOrder() {
  if (!session.value?.orderId) return
  await run(async () => {
    const store = useOrdersDataStore()
    await store.fetchById(session.value!.orderId!)
    persistedOrder.value = store.current
    showOrder.value = true
  })
}
let statusTimer: ReturnType<typeof setInterval> | undefined
let statusRunning = false
const active = ref(true)
watch(() => [session.value?.sessionId, session.value?.confirmationStatus, active.value] as const, () => {
  clearInterval(statusTimer)
  statusTimer = undefined
  if (!active.value || !session.value?.orderId || !['pending', 'processing'].includes(session.value.confirmationStatus || '')) return
  statusTimer = setInterval(async () => {
    if (statusRunning || document.hidden || !navigator.onLine) return
    statusRunning = true
    try { await refreshStatus() } catch {} finally { statusRunning = false }
  }, 5000)
})
watch(session, value => { if (value) emit('change', value) })
onMounted(() => { void run(() => load()) })
let activatedOnce = false
onActivated(() => {
  active.value = true
  emit('product-suggestion-state', productSuggestionState.value)
  if (activatedOnce) void run(reconcile)
  activatedOnce = true
})
onDeactivated(() => {
  active.value = false
  showReload.value = false; showNew.value = false; showCancel.value = false; showOrder.value = false; showNotes.value = false
  void run(flush)
})
onBeforeUnmount(() => clearInterval(statusTimer))
</script>
