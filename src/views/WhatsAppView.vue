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

      <div v-else class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
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
          <div v-if="selectedConversation" class="border-b border-gray-200 bg-white px-4 py-3">
            <p class="font-semibold text-gray-900">{{ conversationTitle(selectedConversation) }}</p>
            <p class="text-sm text-gray-500">
              {{ formatPhone(selectedConversation.phoneNumber) }}
              <span v-if="selectedConversation.branchName"> · {{ selectedConversation.branchName }}</span>
            </p>
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
                  <p class="whitespace-pre-wrap break-words text-sm">{{ message.textBody }}</p>
                  <div class="mt-1 flex items-center justify-end gap-2 text-[11px]" :class="message.direction === 'outbound' ? 'text-emerald-50' : 'text-gray-400'">
                    <span>{{ formatTime(message.timestamp) }}</span>
                    <span v-if="message.direction === 'outbound'">{{ statusLabel(message.status) }}</span>
                  </div>
                </div>
              </div>
              <div ref="messagesEnd" />
            </div>

            <form class="border-t border-gray-200 bg-white p-3" @submit.prevent="sendMessage">
              <div class="flex items-end gap-2">
                <textarea
                  v-model="draft"
                  rows="2"
                  maxlength="4096"
                  class="min-h-[44px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Escribe un mensaje"
                  @keydown.enter.exact.prevent="sendMessage"
                />
                <BaseButton type="submit" :loading="sending" :disabled="!draft.trim()" :icon="PaperAirplaneIcon">
                  Enviar
                </BaseButton>
              </div>
              <p v-if="sendError" class="mt-2 text-sm text-red-600">{{ sendError }}</p>
            </form>
          </template>
        </section>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  PaperAirplaneIcon,
} from '@heroicons/vue/24/outline'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { useWhatsAppStore } from '@/store/whatsapp'
import type { WhatsAppConversation, WhatsAppMessage } from '@/types/whatsapp'

const whatsappStore = useWhatsAppStore()
const loadingStatus = ref(true)
const selectedConversation = ref<WhatsAppConversation | null>(null)
const selectedBranchId = ref(0)
const search = ref('')
const unreadOnly = ref(false)
const draft = ref('')
const sending = ref(false)
const sendError = ref('')
const messagesEnd = ref<HTMLElement | null>(null)
let pollingId: number | undefined
let searchTimeout: number | undefined

const currentMessages = computed<WhatsAppMessage[]>(() =>
  selectedConversation.value ? (whatsappStore.messages[selectedConversation.value.id] ?? []) : []
)

const showBranchFilter = computed(() => whatsappStore.enabledBranchIds.length > 1)

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
}

async function selectConversation(conversation: WhatsAppConversation) {
  selectedConversation.value = conversation
  await whatsappStore.fetchMessages(conversation.id)
  await scrollToBottom()
}

async function refreshSelectedMessages() {
  if (!selectedConversation.value) return
  await whatsappStore.fetchMessages(selectedConversation.value.id)
  await scrollToBottom()
}

async function sendMessage() {
  if (!selectedConversation.value || !draft.value.trim()) return
  try {
    sending.value = true
    sendError.value = ''
    const text = draft.value.trim()
    draft.value = ''
    await whatsappStore.sendMessage(selectedConversation.value.id, text)
    await scrollToBottom()
  } catch (error: any) {
    sendError.value = error.message || 'No se pudo enviar el mensaje.'
  } finally {
    sending.value = false
  }
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
</script>
