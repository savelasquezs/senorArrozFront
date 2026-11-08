<template>
  <div class="flex h-full min-h-0 flex-col" data-test="whatsapp-order-panel">
    <template v-if="createdOrderId">
      <div class="space-y-3 p-4">
        <p class="font-semibold text-emerald-800">Pedido tomado · #{{ createdOrderId }}</p>
        <p v-if="sendingConfirmation" role="status" class="text-sm text-gray-500">Enviando confirmación por WhatsApp…</p>
        <p v-else-if="confirmationSent" role="status" class="text-sm text-emerald-700">Confirmación enviada por WhatsApp.</p>
        <BaseButton v-else :disabled="!editable" variant="outline" @click="sendConfirmation()">{{ confirmationError ? 'Revisar envío y reenviar confirmación' : 'Enviar confirmación por WhatsApp' }}</BaseButton>
        <p v-if="confirmationError" role="alert" class="text-sm text-amber-800">El pedido ya existe. Revisa el chat antes de reenviar la confirmación. {{ confirmationError }}</p>
        <BaseButton variant="outline" @click="openOrder">Gestionar pedido</BaseButton>
        <BaseButton :disabled="!editable || sendingConfirmation" @click="startNewOrder">Nuevo pedido</BaseButton>
        <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      </div>
    </template>
    <template v-else>
      <p v-if="error" role="alert" class="shrink-0 p-3 text-sm text-red-700">{{ error }}</p>
      <p v-if="!editable" class="shrink-0 bg-amber-50 p-3 text-xs text-amber-900">Toma la conversación para editar y confirmar el pedido.</p>
      <fieldset :disabled="!editable" class="min-h-0 min-w-0 flex-1 border-0 p-0 disabled:opacity-60">
        <OrderSidebar />
      </fieldset>
    </template>
    <BaseDialog v-model="showOrder" :title="`Pedido #${createdOrderId}`" size="6xl">
      <OrderDetailContent v-if="persistedOrder" :flat-order="persistedOrder" />
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import OrderSidebar from '@/components/orders/OrderSidebar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { provideOrderEditor } from '@/composables/useOrderEditor'
import { createOrderDraft } from '@/helpers/orderDraft'
import { buildWhatsAppOrderConfirmationMessage } from '@/composables/useWhatsAppOrderConfirmation'
import { orderApi } from '@/services/MainAPI/orderApi'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { useAuthStore } from '@/store/auth'
import { useOrdersDataStore } from '@/store/ordersData'
import { useProductsStore } from '@/store/products'
import type { Customer, CustomerAddress } from '@/types/customer'
import type { Order, OrderDetailView } from '@/types/order'
import type { WhatsAppConversation, WhatsAppOrderDraft } from '@/types/whatsapp'

const props = defineProps<{
  conversation: WhatsAppConversation
  customer: Customer
  address: CustomerAddress | null
  initialDraft: WhatsAppOrderDraft | null
}>()
const OrderDetailContent = defineAsyncComponent(() => import('@/components/orders/OrderDetailContent.vue'))
const auth = useAuthStore()
const editable = computed(() => props.conversation.attentionMode === 'human'
  && (!props.conversation.assignedUserId || props.conversation.assignedUserId === auth.user?.id
    || auth.isAdmin || auth.isSuperadmin))
const receiptKey = `whatsapp-order:${auth.user?.id}:${props.conversation.id}`
const createdOrderId = ref<number | null>(Number(localStorage.getItem(receiptKey)) || null)
const sendingConfirmation = ref(false), confirmationError = ref('')
const confirmationSent = ref(!!createdOrderId.value && localStorage.getItem(`${receiptKey}:message`) === String(createdOrderId.value))
const showOrder = ref(false), persistedOrder = ref<OrderDetailView | null>(null), error = ref('')
const store = provideOrderEditor(`whatsapp:${auth.user?.id}:${props.conversation.id}`, orderCreated, () => editable.value)
store.loadFromLocalStorage()
if (!store.currentOrder && !createdOrderId.value) initializeDraft()
store.ensureCustomerInList(props.customer)
onMounted(async () => {
  try {
    await store.rehydrateCustomersFromDrafts()
    await Promise.all([store.loadOperationalContext(), useProductsStore().ensureCatalogLoaded(store.currentOrder?.branchId)])
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el pedido.'
  }
})

function initializeDraft() {
  const id = `whatsapp-${props.conversation.id}`
  const draft = createOrderDraft(id, 'Pedido de WhatsApp', store.activeBranchId)
  const ai = createdOrderId.value ? null : props.initialDraft
  const branchId = props.conversation.operationalBranchId
    ?? (props.conversation.isCentralChannel ? null : props.conversation.branchId)
  Object.assign(draft, {
    source: 'WhatsApp', whatsappConversationId: props.conversation.id, branchId,
    customerId: props.customer.id, customerName: props.customer.name,
    customerPhone: props.customer.phone1 ?? null, guestName: props.customer.name,
    type: ai?.orderType ?? 'delivery',
  })
  store.draftOrders.set(id, draft)
  store.currentTabId = id
  store.ensureCustomerInList(props.customer)
  if (ai?.items.length) {
    draft.orderItems = ai.items.map(item => ({
      tempId: `whatsapp-${props.conversation.id}-${item.productId}`, productId: item.productId,
      productName: item.name, productPrice: item.unitPrice, quantity: item.quantity,
      unitPrice: item.unitPrice, discount: 0, freeDeliveryDiscount: 0,
      subtotal: item.subtotal, notes: item.notes ?? '',
    }))
  }
  store.recalculateTotals(draft)
  if (props.address && draft.type === 'delivery') store.updateAddress(props.address)
  store.saveToLocalStorage()
}

function orderCreated(order: Order) {
  createdOrderId.value = order.id
  localStorage.setItem(receiptKey, String(order.id))
  store.draftOrders.clear()
  store.currentTabId = null
  store.saveToLocalStorage()
  void sendConfirmation(order)
}

async function sendConfirmation(created?: Order) {
  if (!createdOrderId.value || !editable.value || sendingConfirmation.value || confirmationSent.value) return
  sendingConfirmation.value = true
  confirmationError.value = ''
  try {
    const order = created ?? await orderApi.getOrderById(createdOrderId.value)
    await whatsappApi.sendMessage(props.conversation.id, buildWhatsAppOrderConfirmationMessage(order, undefined, true))
    confirmationSent.value = true
    localStorage.setItem(`${receiptKey}:message`, String(order.id))
  } catch (cause) {
    confirmationError.value = cause instanceof Error ? cause.message : 'No se pudo confirmar el envío.'
  } finally {
    sendingConfirmation.value = false
  }
}

function startNewOrder() {
  if (!editable.value || sendingConfirmation.value) return
  localStorage.removeItem(receiptKey)
  initializeDraft()
  createdOrderId.value = null
  confirmationSent.value = false
  confirmationError.value = ''
}

async function openOrder() {
  if (!createdOrderId.value) return
  try {
    error.value = ''
    const orders = useOrdersDataStore()
    await orders.fetchById(createdOrderId.value)
    persistedOrder.value = orders.current
    showOrder.value = true
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cargar el pedido.'
  }
}
</script>
