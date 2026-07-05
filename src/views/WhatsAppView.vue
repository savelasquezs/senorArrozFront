<template>
  <MainLayout no-card>
    <div class="h-full min-h-0 bg-gray-50 flex flex-col">
      <div class="border-b border-gray-200 bg-white px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ChatBubbleLeftRightIcon class="w-6 h-6 text-emerald-600" />
            WhatsApp
          </h1>
          <p class="text-sm text-gray-500">Conversaciones de WhatsApp Cloud API</p>
        </div>
        <div v-if="whatsappStore.enabled" class="flex flex-col gap-2 sm:flex-row">
          <select
            v-if="showBranchFilter"
            v-model="selectedBranchId"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            @change="reloadConversations"
          >
            <option :value="0">Todas las sucursales</option>
            <option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">{{ branch.label }}</option>
          </select>
          <input
            v-model="search"
            type="search"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            placeholder="Buscar teléfono o nombre"
            @input="onSearchInput"
          />
          <label class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
            <input v-model="unreadOnly" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600" @change="reloadConversations" />
            No leídos
          </label>
        </div>
      </div>

      <div v-if="loadingStatus" class="flex-1 grid place-items-center">
        <BaseLoading text="Consultando estado de WhatsApp..." />
      </div>

      <div v-else-if="!whatsappStore.enabled" class="flex-1 grid place-items-center p-6">
        <div class="max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <ChatBubbleLeftRightIcon class="mx-auto h-12 w-12 text-gray-400" />
          <h2 class="mt-3 text-lg font-semibold text-gray-900">WhatsApp aún no está configurado</h2>
          <p class="mt-2 text-sm text-gray-600">
            Configura y verifica la conexión desde el módulo Sucursal para habilitar esta vista.
          </p>
        </div>
      </div>

      <div
        v-else
        class="relative flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]"
        :class="selectedConversation && !contextPanelCollapsed ? 'xl:grid-cols-[340px_minmax(0,1fr)_360px]' : ''"
      >
        <aside class="min-h-0 border-r border-gray-200 bg-white flex flex-col">
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700">Conversaciones</span>
            <BaseButton variant="ghost" size="sm" :loading="whatsappStore.isLoadingConversations" @click="reloadConversations">
              Actualizar
            </BaseButton>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto">
            <button
              v-for="conversation in whatsappStore.conversations"
              :key="conversation.id"
              type="button"
              class="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
              :class="selectedConversation?.id === conversation.id ? 'bg-emerald-50' : 'bg-white'"
              @click="selectConversation(conversation)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-gray-900">{{ conversationTitle(conversation) }}</p>
                  <p class="truncate text-xs text-gray-500">{{ formatPhone(conversation.phoneNumber) }}</p>
                </div>
                <span v-if="conversation.unreadCount > 0" class="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                  {{ conversation.unreadCount }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 text-sm text-gray-600">{{ conversation.lastMessagePreview || 'Sin mensajes' }}</p>
              <p class="mt-1 text-xs text-gray-400">{{ formatDateTime(conversation.lastMessageAt || conversation.createdAt) }}</p>
            </button>

            <div v-if="!whatsappStore.isLoadingConversations && whatsappStore.conversations.length === 0" class="p-6 text-center text-sm text-gray-500">
              No hay conversaciones para los filtros actuales.
            </div>
          </div>
        </aside>

        <section class="min-h-0 flex flex-col bg-gray-50">
          <div v-if="selectedConversation" class="border-b border-gray-200 bg-white px-4 py-3 flex items-start justify-between gap-3">
            <div>
            <p class="font-semibold text-gray-900">{{ conversationTitle(selectedConversation) }}</p>
            <p class="text-sm text-gray-500">
              {{ formatPhone(selectedConversation.phoneNumber) }}
              <span v-if="selectedConversation.branchName"> · {{ selectedConversation.branchName }}</span>
            </p>
            </div>
            <BaseButton variant="ghost" size="sm" @click="contextPanelCollapsed = !contextPanelCollapsed">
              {{ contextPanelCollapsed ? 'Abrir pedido' : 'Contraer' }}
            </BaseButton>
          </div>

          <div v-if="!selectedConversation" class="flex-1 grid place-items-center p-6 text-center text-gray-500">
            <div>
              <ChatBubbleOvalLeftEllipsisIcon class="mx-auto h-12 w-12 text-gray-400" />
              <p class="mt-3 text-sm">Selecciona una conversación para ver los mensajes.</p>
            </div>
          </div>

          <template v-else>
            <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
              <div
                v-for="message in currentMessages"
                :key="message.id"
                class="flex"
                :class="message.direction === 'outbound' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[78%] rounded-lg px-3 py-2 shadow-sm"
                  :class="message.direction === 'outbound' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-900'"
                >
                  <div v-if="message.mediaUrl" class="mb-2">
                    <img
                      v-if="message.type === 'image' || message.type === 'sticker'"
                      :src="message.mediaUrl"
                      :alt="message.mediaFileName || 'Imagen de WhatsApp'"
                      class="max-h-80 max-w-full rounded-md object-contain"
                    />
                    <audio
                      v-else-if="message.type === 'audio'"
                      :src="message.mediaUrl"
                      controls
                      class="w-72 max-w-full"
                    />
                    <video
                      v-else-if="message.type === 'video'"
                      :src="message.mediaUrl"
                      controls
                      class="max-h-80 max-w-full rounded-md"
                    />
                    <a
                      v-else
                      :href="message.mediaUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      :class="message.direction === 'outbound' ? 'border-emerald-200 bg-emerald-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-800'"
                    >
                      <DocumentIcon class="h-5 w-5 shrink-0" />
                      <span class="min-w-0 flex-1 truncate">{{ message.mediaFileName || 'Abrir archivo' }}</span>
                      <span v-if="message.mediaFileSize" class="text-xs opacity-80">{{ formatFileSize(message.mediaFileSize) }}</span>
                    </a>
                  </div>
                  <p v-if="message.textBody" class="whitespace-pre-wrap break-words text-sm">{{ message.textBody }}</p>
                  <p v-else-if="message.type !== 'text' && !message.mediaUrl" class="text-sm opacity-80">
                    {{ mediaFallbackLabel(message) }}
                  </p>
                  <div class="mt-1 flex items-center justify-end gap-2 text-[11px]" :class="message.direction === 'outbound' ? 'text-emerald-50' : 'text-gray-400'">
                    <span>{{ formatTime(message.timestamp) }}</span>
                    <span v-if="message.direction === 'outbound'">{{ statusLabel(message.status) }}</span>
                  </div>
                </div>
              </div>
              <div ref="messagesEnd" />
            </div>

            <form class="border-t border-gray-200 bg-white p-3" @submit.prevent="sendMessage">
              <div v-if="selectedFile" class="mb-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ selectedFile.name }}</p>
                  <p class="text-xs text-emerald-700">{{ selectedFile.type || 'Archivo' }} · {{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button type="button" class="rounded-full p-1 hover:bg-emerald-100" title="Quitar archivo" @click="clearSelectedFile">
                  <XMarkIcon class="h-4 w-4" />
                </button>
              </div>
              <div class="flex items-end gap-2">
                <input ref="fileInput" type="file" class="hidden" @change="onFileSelected" />
                <BaseButton type="button" variant="secondary" :icon="PaperClipIcon" title="Adjuntar archivo" @click="openFilePicker">
                  Archivo
                </BaseButton>
                <textarea
                  v-model="draft"
                  rows="2"
                  maxlength="4096"
                  class="min-h-[44px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Escribe un mensaje"
                  @keydown.enter.exact.prevent="sendMessage"
                />
                <BaseButton type="submit" :loading="sending" :disabled="!draft.trim() && !selectedFile" :icon="PaperAirplaneIcon">
                  Enviar
                </BaseButton>
              </div>
              <p v-if="sendError" class="mt-2 text-sm text-red-600">{{ sendError }}</p>
            </form>
          </template>
        </section>

        <button
          v-if="selectedConversation && contextPanelCollapsed"
          type="button"
          class="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-lg border border-emerald-200 bg-emerald-600 px-3 py-4 text-sm font-medium text-white shadow-lg hover:bg-emerald-700"
          @click="contextPanelCollapsed = false"
        >
          Pedido
        </button>

        <aside v-if="selectedConversation && !contextPanelCollapsed" class="min-h-0 border-l border-gray-200 bg-white flex flex-col">
          <div class="border-b border-gray-100 px-4 py-3">
            <p class="text-sm font-semibold text-gray-900">Contexto del pedido</p>
            <p class="mt-0.5 text-xs text-gray-500">{{ formatPhone(selectedConversation.phoneNumber) }}</p>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div v-if="contextLoading">
              <BaseLoading text="Cargando cliente..." />
            </div>

            <template v-else>
              <div v-if="selectedCustomer" class="space-y-3">
                <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p class="text-sm font-semibold text-emerald-950">{{ selectedCustomer.name }}</p>
                  <p class="mt-1 text-sm text-emerald-800">{{ selectedCustomer.phone1 }}</p>
                  <p v-if="selectedCustomer.phone2" class="text-sm text-emerald-800">{{ selectedCustomer.phone2 }}</p>
                </div>

                <AddressSelector
                  :customer-id="selectedCustomer.id"
                  :selected-address="selectedAddress?.id || undefined"
                  mode="persisted"
                  @address-selected="onContextAddressSelected"
                />

                <BaseButton
                  class="w-full"
                  variant="outline"
                  :disabled="!selectedCustomerAddresses.length || sendingAddressConfirmation"
                  :loading="sendingAddressConfirmation"
                  @click="sendAddressConfirmationRequest"
                >
                  Confirmar dirección por WhatsApp
                </BaseButton>

                <BaseButton
                  class="w-full"
                  variant="primary"
                  :disabled="!selectedAddress || takingOrder"
                  :loading="takingOrder"
                  @click="takeOrderFromWhatsApp"
                >
                  Tomar pedido
                </BaseButton>
              </div>

              <div v-else class="space-y-3">
                <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  No encontramos un cliente con este teléfono. Crea el cliente y su dirección para continuar.
                </div>
                <CustomerForm
                  :initial-phone="initialCustomerPhone"
                  submit-button-text="Crear cliente"
                  :loading="creatingCustomer"
                  @submit="createCustomerFromConversation"
                />
              </div>

              <p v-if="contextError" class="text-sm text-red-600">{{ contextError }}</p>
            </template>
          </div>
        </aside>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import AddressSelector from '@/components/customers/address/AddressSelector.vue'
import { useWhatsAppStore } from '@/store/whatsapp'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { customerApi } from '@/services/MainAPI/customerApi'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { useToast } from '@/composables/useToast'
import type { WhatsAppConversation, WhatsAppMessage } from '@/types/whatsapp'
import type { Customer, CustomerAddress, CustomerFormData } from '@/types/customer'

const whatsappStore = useWhatsAppStore()
const ordersStore = useOrdersDraftsStore()
const router = useRouter()
const route = useRoute()
const { success, error: showError } = useToast()
const loadingStatus = ref(true)
const selectedConversation = ref<WhatsAppConversation | null>(null)
const selectedCustomer = ref<Customer | null>(null)
const selectedAddress = ref<CustomerAddress | null>(null)
const selectedBranchId = ref(0)
const search = ref('')
const unreadOnly = ref(false)
const draft = ref('')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const sending = ref(false)
const contextLoading = ref(false)
const creatingCustomer = ref(false)
const takingOrder = ref(false)
const sendingAddressConfirmation = ref(false)
const contextPanelCollapsed = ref(false)
const sendError = ref('')
const contextError = ref('')
const messagesEnd = ref<HTMLElement | null>(null)
let pollingId: number | undefined
let searchTimeout: number | undefined

const currentMessages = computed<WhatsAppMessage[]>(() =>
  selectedConversation.value ? (whatsappStore.messages[selectedConversation.value.id] ?? []) : []
)

const showBranchFilter = computed(() => whatsappStore.enabledBranchIds.length > 1)

const initialCustomerPhone = computed(() => {
  const digits = selectedConversation.value?.phoneNumber?.replace(/\D/g, '') ?? ''
  return digits.length > 10 ? digits.slice(-10) : digits
})

const selectedCustomerAddresses = computed(() => selectedCustomer.value?.addresses ?? [])

const branchOptions = computed(() => {
  const labels = new Map<number, string>()
  for (const conversation of whatsappStore.conversations) {
    if (conversation.branchName) labels.set(conversation.branchId, conversation.branchName)
  }
  return whatsappStore.enabledBranchIds.map(id => ({
    id,
    label: labels.get(id) ?? `Sucursal ${id}`,
  }))
})

async function reloadConversations() {
  await whatsappStore.fetchConversations({
    branchId: selectedBranchId.value || undefined,
    search: search.value.trim() || undefined,
    unreadOnly: unreadOnly.value || undefined,
  })
  await whatsappStore.fetchUnreadSummary()
  if (selectedConversation.value) {
    const refreshed = whatsappStore.conversations.find(c => c.id === selectedConversation.value?.id)
    selectedConversation.value = refreshed ?? null
  }
  await selectConversationFromRoute()
}

async function selectConversation(conversation: WhatsAppConversation) {
  selectedConversation.value = conversation
  await whatsappStore.fetchMessages(conversation.id)
  await loadConversationContext(conversation)
  await scrollToBottom()
}

async function selectConversationFromRoute() {
  const id = Number(route.query.conversationId || 0)
  if (!id || selectedConversation.value?.id === id) return
  const conversation = whatsappStore.conversations.find(c => c.id === id)
  if (conversation) {
    await selectConversation(conversation)
  }
}

async function refreshSelectedMessages() {
  if (!selectedConversation.value) return
  await whatsappStore.fetchMessages(selectedConversation.value.id)
  await scrollToBottom()
}

async function loadConversationContext(conversation: WhatsAppConversation) {
  selectedCustomer.value = null
  selectedAddress.value = null
  contextError.value = ''
  if (!conversation.customerId) return

  try {
    contextLoading.value = true
    const customerRes = await customerApi.getCustomerById(conversation.customerId)
    const customer = customerRes.data
    if (!customer) return

    let addresses: CustomerAddress[] = customer.addresses ?? []
    if (addresses.length === 0) {
      const addressRes = await customerApi.getCustomerAddresses(customer.id)
      addresses = addressRes.data ?? []
    }

    selectedCustomer.value = { ...customer, addresses }
    selectedAddress.value = addresses.find(a => a.isPrimary) ?? addresses[0] ?? null
  } catch (error: any) {
    contextError.value = error.message || 'No se pudo cargar el cliente.'
  } finally {
    contextLoading.value = false
  }
}

function onContextAddressSelected(address?: CustomerAddress) {
  selectedAddress.value = address ?? null
  if (address && selectedCustomer.value) {
    const addresses = selectedCustomer.value.addresses ?? []
    const exists = addresses.some(a => a.id === address.id)
    selectedCustomer.value = {
      ...selectedCustomer.value,
      addresses: exists
        ? addresses.map(a => a.id === address.id ? address : a)
        : [...addresses, address],
    }
  }
}

function formatAddressLineForWhatsApp(address: CustomerAddress): string {
  const street = (address.address || '').trim()
  const extra = (address.additionalInfo || '').trim()
  const neighborhood = (address.neighborhoodName || address.neighborhood?.name || '').trim()
  const main = [street, extra].filter(Boolean).join(', ')
  return neighborhood ? `${main}, ${neighborhood}` : main
}

function buildAddressConfirmationText(addresses: CustomerAddress[]) {
  const validAddresses = addresses.filter(a => a.address?.trim())
  if (validAddresses.length === 0) return ''
  if (validAddresses.length === 1) {
    return `¿Entregamos en esta dirección?\n${formatAddressLineForWhatsApp(validAddresses[0])}`
  }

  return [
    '¿Dónde entregamos?',
    ...validAddresses.map((address, index) => `${index + 1}- ${formatAddressLineForWhatsApp(address)}`),
  ].join('\n')
}

async function sendAddressConfirmationRequest() {
  if (!selectedConversation.value || !selectedCustomer.value) return
  const text = buildAddressConfirmationText(selectedCustomerAddresses.value)
  if (!text) {
    contextError.value = 'El cliente no tiene direcciones guardadas.'
    return
  }

  try {
    sendingAddressConfirmation.value = true
    contextError.value = ''
    await whatsappStore.sendMessage(selectedConversation.value.id, text)
    await scrollToBottom()
    success('Mensaje enviado', 2500, 'Se solicitó confirmación de dirección por WhatsApp.')
  } catch (error: any) {
    contextError.value = error.message || 'No se pudo enviar la confirmación de dirección.'
    showError('WhatsApp', contextError.value)
  } finally {
    sendingAddressConfirmation.value = false
  }
}

async function createCustomerFromConversation(data: CustomerFormData) {
  if (!selectedConversation.value) return
  try {
    creatingCustomer.value = true
    contextError.value = ''
    const res = await customerApi.createCustomer({
      name: data.name,
      phone1: data.phone1,
      phone2: data.phone2,
      branchId: selectedConversation.value.branchId,
      initialAddress: data.initialAddress
        ? {
            neighborhoodId: data.initialAddress.neighborhoodId,
            address: data.initialAddress.address,
            additionalInfo: data.initialAddress.additionalInfo,
            latitude: data.initialAddress.latitude ?? 0,
            longitude: data.initialAddress.longitude ?? 0,
            isPrimary: data.initialAddress.isPrimary ?? true,
            deliveryFee: data.initialAddress.deliveryFee,
          }
        : undefined,
    })
    const customer = res.data
    if (!customer?.id) throw new Error('No se pudo crear el cliente.')

    let addresses = customer.addresses ?? []
    if (addresses.length === 0) {
      const addressRes = await customerApi.getCustomerAddresses(customer.id)
      addresses = addressRes.data ?? []
    }

    const linked = await whatsappApi.linkConversationCustomer(selectedConversation.value.id, customer.id)
    selectedConversation.value = linked.data ?? { ...selectedConversation.value, customerId: customer.id, customerName: customer.name }
    selectedCustomer.value = { ...customer, addresses }
    selectedAddress.value = addresses.find(a => a.isPrimary) ?? addresses[0] ?? null
    success('Cliente creado', 2500, 'La conversación quedó vinculada al cliente.')
  } catch (error: any) {
    contextError.value = error.message || 'No se pudo crear el cliente.'
    showError('Cliente', contextError.value)
  } finally {
    creatingCustomer.value = false
  }
}

async function takeOrderFromWhatsApp() {
  if (!selectedConversation.value || !selectedCustomer.value || !selectedAddress.value) return
  try {
    takingOrder.value = true
    const draftOrder = ordersStore.createOrReuseWhatsAppDraft({
      conversationId: selectedConversation.value.id,
      branchId: selectedConversation.value.branchId,
      customer: selectedCustomer.value,
      address: selectedAddress.value,
    })
    if (!draftOrder) {
      showError('Pedido', ordersStore.error || 'No se pudo crear el borrador.')
      return
    }
    localStorage.setItem('senor-arroz-whatsapp-conversation-tab', String(selectedConversation.value.id))
    await router.push({ name: 'OrdersNew' })
  } finally {
    takingOrder.value = false
  }
}

async function sendMessage() {
  if (!selectedConversation.value || (!draft.value.trim() && !selectedFile.value)) return
  try {
    sending.value = true
    sendError.value = ''
    const text = draft.value.trim()
    if (selectedFile.value) {
      await whatsappStore.sendMediaMessage(selectedConversation.value.id, selectedFile.value, text)
      clearSelectedFile()
    } else {
      await whatsappStore.sendMessage(selectedConversation.value.id, text)
    }
    draft.value = ''
    await scrollToBottom()
  } catch (error: any) {
    sendError.value = error.message || 'No se pudo enviar el mensaje.'
  } finally {
    sending.value = false
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

function clearSelectedFile() {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function onSearchInput() {
  window.clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    void reloadConversations()
  }, 350)
}

async function scrollToBottom() {
  await nextTick()
  messagesEnd.value?.scrollIntoView({ block: 'end' })
}

function conversationTitle(conversation: WhatsAppConversation) {
  return conversation.contactName || conversation.customerName || conversation.phoneNumber
}

function formatPhone(phone: string) {
  if (phone.startsWith('57') && phone.length === 12) return `+57 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`
  return phone.startsWith('+') ? phone : `+${phone}`
}

function formatDateTime(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function statusLabel(status: WhatsAppMessage['status']) {
  const labels: Record<WhatsAppMessage['status'], string> = {
    received: 'Recibido',
    sent: 'Enviado',
    delivered: 'Entregado',
    read: 'Leído',
    failed: 'Falló',
  }
  return labels[status] ?? status
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`
}

function mediaFallbackLabel(message: WhatsAppMessage) {
  const labels: Record<WhatsAppMessage['type'], string> = {
    text: '',
    image: 'Imagen sin vista previa',
    audio: 'Audio sin vista previa',
    video: 'Video sin vista previa',
    document: message.mediaFileName || 'Documento sin vista previa',
    sticker: 'Sticker sin vista previa',
  }
  return labels[message.type] || 'Archivo sin vista previa'
}

onMounted(async () => {
  try {
    await whatsappStore.ensureStatus(0)
    if (whatsappStore.enabled) {
      await reloadConversations()
      pollingId = window.setInterval(() => {
        void reloadConversations()
        void refreshSelectedMessages()
      }, 12000)
    }
  } finally {
    loadingStatus.value = false
  }
})

onBeforeUnmount(() => {
  if (pollingId) window.clearInterval(pollingId)
  if (searchTimeout) window.clearTimeout(searchTimeout)
})

watch(
  () => route.query.conversationId,
  () => {
    void selectConversationFromRoute()
  }
)
</script>
