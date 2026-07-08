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
          <BaseButton variant="secondary" size="sm" @click="openQuickRepliesModal">
            Respuestas rápidas
          </BaseButton>
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
              class="w-full border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
              :class="selectedConversation?.id === conversation.id ? 'bg-emerald-50' : 'bg-white'"
              @click="selectConversation(conversation)"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span class="min-w-0 truncate text-sm font-semibold text-gray-950">{{ conversationTitle(conversation) }}</span>
                  <span class="shrink-0 text-xs text-gray-300">-</span>
                  <span class="truncate text-xs font-medium text-gray-500">{{ formatConversationPhone(conversation.phoneNumber) }}</span>
                </div>
                <span v-if="conversation.unreadCount > 0" class="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {{ conversation.unreadCount }}
                </span>
              </div>
              <div class="mt-1 flex min-w-0 items-baseline gap-2 text-xs">
                <span
                  class="min-w-0 flex-1 truncate"
                  :class="conversation.unreadCount > 0 ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'"
                >
                  {{ shortConversationPreview(conversation.lastMessagePreview) }}
                </span>
                <span
                  class="shrink-0 font-medium"
                  :class="conversation.unreadCount > 0 ? 'text-emerald-700' : 'text-gray-400'"
                >
                  {{ formatRelativeConversationTime(conversation.lastMessageAt || conversation.createdAt) }}
                </span>
              </div>
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
                    <button
                      v-if="message.type === 'image' || message.type === 'sticker'"
                      type="button"
                      class="block max-w-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      title="Ver imagen"
                      @click="openImagePreview(message)"
                    >
                      <img
                        :src="message.mediaUrl"
                        :alt="message.mediaFileName || 'Imagen de WhatsApp'"
                        class="max-h-80 max-w-full cursor-zoom-in object-contain"
                      />
                    </button>
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
              <div v-if="topQuickReplies.length" class="mb-2 flex flex-wrap items-center gap-2">
                <span class="text-xs font-medium text-gray-500">Rápidas</span>
                <button
                  v-for="reply in topQuickReplies"
                  :key="reply.id"
                  type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  :disabled="sending"
                  :title="reply.messageTemplate"
                  @click="sendQuickReply(reply)"
                >
                  /{{ reply.shortcut }}
                </button>
              </div>
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
              <div
                v-if="slashQuickReplyMatches.length"
                class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm"
              >
                <button
                  v-for="reply in slashQuickReplyMatches"
                  :key="reply.id"
                  type="button"
                  class="flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left hover:bg-white"
                  @click="sendQuickReply(reply)"
                >
                  <span class="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">/{{ reply.shortcut }}</span>
                  <span class="min-w-0 flex-1 truncate text-xs text-gray-600">{{ reply.messageTemplate }}</span>
                </button>
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

                <p v-if="addressSelectionNote" class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  {{ addressSelectionNote }}
                </p>

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

      <BaseDialog v-model="showQuickRepliesModal" title="Respuestas rápidas" size="4xl">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="min-h-[260px] rounded-lg border border-gray-200">
            <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <span class="text-sm font-semibold text-gray-800">Guardadas</span>
              <BaseButton size="sm" variant="ghost" :loading="whatsappStore.isLoadingQuickReplies" @click="loadQuickReplies">
                Actualizar
              </BaseButton>
            </div>
            <div class="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
              <div
                v-for="reply in whatsappStore.quickReplies"
                :key="reply.id"
                class="flex items-start justify-between gap-3 px-3 py-3"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">/{{ reply.shortcut }}</span>
                    <span v-if="reply.branchName" class="text-xs text-gray-500">{{ reply.branchName }}</span>
                    <span class="text-xs" :class="reply.isActive ? 'text-emerald-700' : 'text-gray-400'">
                      {{ reply.isActive ? 'Activa' : 'Inactiva' }}
                    </span>
                    <span class="text-xs text-gray-400">{{ reply.usageCount }} usos</span>
                  </div>
                  <p class="mt-2 line-clamp-2 text-sm text-gray-700">{{ reply.messageTemplate }}</p>
                </div>
                <div class="flex shrink-0 gap-1">
                  <BaseButton size="sm" variant="ghost" @click="editQuickReply(reply)">Editar</BaseButton>
                  <BaseButton size="sm" variant="danger" @click="removeQuickReply(reply)">Eliminar</BaseButton>
                </div>
              </div>
              <div v-if="!whatsappStore.isLoadingQuickReplies && !whatsappStore.quickReplies.length" class="p-6 text-center text-sm text-gray-500">
                No hay respuestas rápidas creadas.
              </div>
            </div>
          </div>

          <form class="space-y-3 rounded-lg border border-gray-200 p-3" @submit.prevent="saveQuickReply">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-800">{{ editingQuickReply ? 'Editar' : 'Nueva respuesta' }}</p>
              <BaseButton v-if="editingQuickReply" type="button" size="sm" variant="ghost" @click="resetQuickReplyForm">
                Nueva
              </BaseButton>
            </div>

            <label v-if="showBranchFilter" class="block text-sm font-medium text-gray-700">
              Sucursal
              <select
                v-model.number="quickReplyForm.branchId"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">{{ branch.label }}</option>
              </select>
            </label>

            <BaseInput
              v-model="quickReplyForm.shortcut"
              label="Palabra reservada"
              placeholder="/saludo"
              :maxlength="40"
              hint="Se usa escribiendo /palabra en el chat."
            />

            <label class="block text-sm font-medium text-gray-700">
              Mensaje
              <textarea
                v-model="quickReplyForm.messageTemplate"
                rows="6"
                maxlength="4096"
                class="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Hola {{nombre_cliente}}, muy buenos días."
              />
            </label>
            <p v-pre class="text-xs text-gray-500">
              Variables disponibles: <span class="font-mono">{{nombre_cliente}}</span>, <span class="font-mono">{{guestName}}</span>, <span class="font-mono">{{telefono}}</span>.
            </p>

            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
              <input v-model="quickReplyForm.isActive" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600" />
              Activa
            </label>

            <p v-if="quickReplyError" class="text-sm text-red-600">{{ quickReplyError }}</p>
            <BaseButton class="w-full" type="submit" :loading="quickReplySaving">
              Guardar respuesta
            </BaseButton>
          </form>
        </div>
      </BaseDialog>

      <Teleport to="body">
        <div
          v-if="imagePreview"
          class="fixed inset-0 z-50 flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          @click="closeImagePreview"
        >
          <div class="flex items-center justify-end px-4 py-3">
            <button
              type="button"
              class="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
              title="Cerrar"
              @click.stop="closeImagePreview"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
          <div class="grid min-h-0 flex-1 place-items-center px-4 pb-4" @click.stop>
            <img
              :src="imagePreview.mediaUrl || ''"
              :alt="imagePreview.mediaFileName || 'Imagen de WhatsApp'"
              class="max-h-[84vh] max-w-[96vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
          <p v-if="imagePreview.mediaFileName" class="px-4 pb-4 text-center text-sm font-medium text-white/80">
            {{ imagePreview.mediaFileName }}
          </p>
        </div>
      </Teleport>
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
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import AddressSelector from '@/components/customers/address/AddressSelector.vue'
import { useWhatsAppStore } from '@/store/whatsapp'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { customerApi } from '@/services/MainAPI/customerApi'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { useToast } from '@/composables/useToast'
import { useSignalR } from '@/composables/useSignalR'
import { WHATSAPP_SIGNALR_HUB_URL } from '@/config/signalr'
import type { WhatsAppConversation, WhatsAppMessage, WhatsAppQuickReply, WhatsAppRealtimeMessagePayload } from '@/types/whatsapp'
import type { Customer, CustomerAddress, CustomerFormData } from '@/types/customer'

const whatsappStore = useWhatsAppStore()
const ordersStore = useOrdersDraftsStore()
const router = useRouter()
const route = useRoute()
const { success, error: showError } = useToast()
const { on: onSignalR, off: offSignalR } = useSignalR(WHATSAPP_SIGNALR_HUB_URL)
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
const showQuickRepliesModal = ref(false)
const editingQuickReply = ref<WhatsAppQuickReply | null>(null)
const quickReplySaving = ref(false)
const quickReplyError = ref('')
const quickReplyForm = ref({
  id: null as number | null,
  branchId: null as number | null,
  shortcut: '',
  messageTemplate: '',
  isActive: true,
})
const sendError = ref('')
const contextError = ref('')
const addressSelectionNote = ref('')
const messagesEnd = ref<HTMLElement | null>(null)
const imagePreview = ref<WhatsAppMessage | null>(null)
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

const activeQuickRepliesForConversation = computed(() => {
  if (!selectedConversation.value) return []
  return whatsappStore.quickReplies
    .filter(reply => reply.isActive && reply.branchId === selectedConversation.value?.branchId)
    .sort((a, b) => b.usageCount - a.usageCount || a.shortcut.localeCompare(b.shortcut))
})

const topQuickReplies = computed(() => activeQuickRepliesForConversation.value.slice(0, 6))

const slashQuickReplyMatches = computed(() => {
  const value = draft.value.trim()
  if (!value.startsWith('/') || value.length < 2 || selectedFile.value) return []
  const query = normalizeQuickReplyShortcut(value)
  return activeQuickRepliesForConversation.value
    .filter(reply => reply.shortcut.includes(query))
    .slice(0, 8)
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

function conversationMatchesCurrentFilters(conversation: WhatsAppConversation) {
  if (selectedBranchId.value && conversation.branchId !== selectedBranchId.value) return false
  if (unreadOnly.value && conversation.unreadCount <= 0) return false

  const term = search.value.trim().toLowerCase()
  if (!term) return true

  return [
    conversation.phoneNumber,
    conversation.contactName,
    conversation.customerName,
    conversation.branchName,
  ].some(value => (value || '').toLowerCase().includes(term))
}

async function handleRealtimeMessage(payload: WhatsAppRealtimeMessagePayload) {
  if (!payload?.conversation?.id || !payload?.message?.id) return

  const activeConversationId = selectedConversation.value?.id ?? null
  const isActiveConversation = activeConversationId === payload.conversation.id
  if (!isActiveConversation && !conversationMatchesCurrentFilters(payload.conversation)) return

  whatsappStore.applyRealtimeMessage(payload, activeConversationId)

  if (!isActiveConversation) return

  const refreshed = whatsappStore.conversations.find(c => c.id === payload.conversation.id)
  if (refreshed) {
    selectedConversation.value = refreshed
  }

  if (payload.message.direction === 'inbound') {
    applyAddressSelectionFromLatestInboundMessage()
  }

  await scrollToBottom()
}

async function loadConversationContext(conversation: WhatsAppConversation) {
  selectedCustomer.value = null
  selectedAddress.value = null
  contextError.value = ''
  if (!conversation.customerId) return

  try {
    contextLoading.value = true
    addressSelectionNote.value = ''
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
    applyAddressSelectionFromLatestInboundMessage()
  } catch (error: any) {
    contextError.value = error.message || 'No se pudo cargar el cliente.'
  } finally {
    contextLoading.value = false
  }
}

function onContextAddressSelected(address?: CustomerAddress) {
  selectedAddress.value = address ?? null
  addressSelectionNote.value = address ? 'Dirección seleccionada para el pedido.' : ''
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

function normalizeText(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferAddressFromChatText(text: string, addresses: CustomerAddress[]) {
  const validAddresses = addresses.filter(a => a.address?.trim())
  if (validAddresses.length === 0) return null

  const normalized = normalizeText(text)
  const numeric = normalized.match(/^(?:opcion\s*)?#?\s*(\d+)\b/)
  if (numeric) {
    const index = Number(numeric[1]) - 1
    if (index >= 0 && index < validAddresses.length) return validAddresses[index]
  }

  if (
    validAddresses.length === 1 &&
    /\b(si|ok|okay|dale|correcto|confirmo|esa|esta|ahi|alli|alli es)\b/.test(normalized)
  ) {
    return validAddresses[0]
  }

  return validAddresses.find(address => {
    const addressText = normalizeText(address.address)
    const neighborhood = normalizeText(address.neighborhoodName || address.neighborhood?.name)
    const fullLine = normalizeText(formatAddressLineForWhatsApp(address))
    return (
      (addressText.length >= 8 && normalized.includes(addressText.slice(0, Math.min(addressText.length, 18)))) ||
      (neighborhood.length >= 4 && normalized.includes(neighborhood)) ||
      (fullLine.length >= 8 && fullLine.includes(normalized) && normalized.length >= 6)
    )
  }) ?? null
}

function selectAddressFromChatText(text: string, manual = false) {
  if (!selectedCustomer.value) return false
  const address = inferAddressFromChatText(text, selectedCustomerAddresses.value)
  if (!address) {
    if (manual) {
      contextError.value = 'No pude relacionar esa respuesta con una dirección guardada.'
    }
    return false
  }

  selectedAddress.value = address
  addressSelectionNote.value = `Dirección seleccionada desde el chat: ${formatAddressLineForWhatsApp(address)}`
  contextError.value = ''
  return true
}

function latestInboundTextMessage() {
  return [...currentMessages.value]
    .reverse()
    .find(message => message.direction === 'inbound' && message.type === 'text' && message.textBody?.trim())
}

function applyAddressSelectionFromLatestInboundMessage() {
  if (!selectedCustomer.value || selectedCustomerAddresses.value.length === 0) return
  const latest = latestInboundTextMessage()
  if (!latest) return
  selectAddressFromChatText(latest.textBody)
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

function normalizeQuickReplyShortcut(value: string) {
  return value.trim().replace(/^\/+/, '').trim().toLowerCase()
}

function findQuickReplyCommand(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || /\s/.test(trimmed)) return null
  const shortcut = normalizeQuickReplyShortcut(trimmed)
  return activeQuickRepliesForConversation.value.find(reply => reply.shortcut === shortcut) ?? null
}

async function sendQuickReply(reply: WhatsAppQuickReply) {
  if (!selectedConversation.value) return
  try {
    sending.value = true
    sendError.value = ''
    await whatsappStore.sendQuickReply(selectedConversation.value.id, reply.id)
    draft.value = ''
    await scrollToBottom()
  } catch (error: any) {
    sendError.value = error.message || 'No se pudo enviar la respuesta rápida.'
  } finally {
    sending.value = false
  }
}

function defaultQuickReplyBranchId() {
  return selectedConversation.value?.branchId
    || selectedBranchId.value
    || whatsappStore.enabledBranchIds[0]
    || null
}

async function loadQuickReplies() {
  await whatsappStore.fetchQuickReplies()
}

function resetQuickReplyForm() {
  editingQuickReply.value = null
  quickReplyError.value = ''
  quickReplyForm.value = {
    id: null,
    branchId: defaultQuickReplyBranchId(),
    shortcut: '',
    messageTemplate: '',
    isActive: true,
  }
}

async function openQuickRepliesModal() {
  resetQuickReplyForm()
  showQuickRepliesModal.value = true
  try {
    await loadQuickReplies()
  } catch (error: any) {
    quickReplyError.value = error.message || 'No se pudieron cargar las respuestas rápidas.'
  }
}

function editQuickReply(reply: WhatsAppQuickReply) {
  editingQuickReply.value = reply
  quickReplyError.value = ''
  quickReplyForm.value = {
    id: reply.id,
    branchId: reply.branchId,
    shortcut: reply.shortcut,
    messageTemplate: reply.messageTemplate,
    isActive: reply.isActive,
  }
}

async function saveQuickReply() {
  try {
    quickReplySaving.value = true
    quickReplyError.value = ''
    await whatsappStore.saveQuickReply({
      ...quickReplyForm.value,
      shortcut: normalizeQuickReplyShortcut(quickReplyForm.value.shortcut),
    })
    resetQuickReplyForm()
    success('Respuesta guardada', 2200)
  } catch (error: any) {
    quickReplyError.value = error.message || 'No se pudo guardar la respuesta rápida.'
  } finally {
    quickReplySaving.value = false
  }
}

async function removeQuickReply(reply: WhatsAppQuickReply) {
  if (!window.confirm(`¿Eliminar /${reply.shortcut}?`)) return
  try {
    await whatsappStore.deleteQuickReply(reply.id)
    if (editingQuickReply.value?.id === reply.id) resetQuickReplyForm()
  } catch (error: any) {
    quickReplyError.value = error.message || 'No se pudo eliminar la respuesta rápida.'
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
    applyAddressSelectionFromLatestInboundMessage()
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
  const quickReply = !selectedFile.value ? findQuickReplyCommand(draft.value) : null
  if (quickReply) {
    await sendQuickReply(quickReply)
    return
  }

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

function openImagePreview(message: WhatsAppMessage) {
  if (!message.mediaUrl) return
  imagePreview.value = message
}

function closeImagePreview() {
  imagePreview.value = null
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

function formatConversationPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length === 12) return digits.slice(2)
  return digits || phone
}

function shortConversationPreview(value?: string | null) {
  const text = (value || 'Sin mensajes').replace(/\s+/g, ' ').trim()
  if (text.length <= 30) return text
  return `${text.slice(0, 30).trimEnd()}.....`
}

function formatRelativeConversationTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const timestamp = date.getTime()
  if (!Number.isFinite(timestamp)) return ''

  const now = new Date()
  const diffMs = now.getTime() - timestamp
  if (diffMs < 60_000) return 'ahora'

  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 60) return `hace ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} h`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'ayer'
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `hace ${diffDays} dias`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths <= 1) return 'hace un mes'
  if (diffMonths < 12) return `hace ${diffMonths} meses`

  const diffYears = Math.floor(diffMonths / 12)
  return diffYears <= 1 ? 'hace un ano' : `hace ${diffYears} anos`
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
  onSignalR('WhatsAppMessageCreated', handleRealtimeMessage)
  try {
    await whatsappStore.ensureStatus(0)
    if (whatsappStore.enabled) {
      await whatsappStore.fetchQuickReplies()
      await reloadConversations()
    }
  } finally {
    loadingStatus.value = false
  }
})

onBeforeUnmount(() => {
  offSignalR('WhatsAppMessageCreated', handleRealtimeMessage)
  if (searchTimeout) window.clearTimeout(searchTimeout)
})

watch(
  () => route.query.conversationId,
  () => {
    void selectConversationFromRoute()
  }
)
</script>
