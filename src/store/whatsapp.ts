import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type {
  WhatsAppConversation,
  WhatsAppConversationFilters,
  WhatsAppMessage,
  WhatsAppStatus,
} from '@/types/whatsapp'

export const useWhatsAppStore = defineStore('whatsapp', () => {
  const status = ref<WhatsAppStatus | null>(null)
  const conversations = ref<WhatsAppConversation[]>([])
  const messages = ref<Record<number, WhatsAppMessage[]>>({})
  const isLoadingStatus = ref(false)
  const isLoadingConversations = ref(false)
  const isLoadingMessages = ref(false)
  const error = ref<string | null>(null)
  let statusLoadedAt = 0

  const enabled = computed(() => status.value?.enabled === true)
  const enabledBranchIds = computed(() => status.value?.branchIds ?? [])

  async function refreshStatus() {
    try {
      isLoadingStatus.value = true
      error.value = null
      const res = await whatsappApi.getStatus()
      status.value = res.data
      statusLoadedAt = Date.now()
      return res.data
    } catch (err: any) {
      error.value = err.message || 'No se pudo consultar el estado de WhatsApp'
      status.value = { enabled: false, branchIds: [] }
      throw err
    } finally {
      isLoadingStatus.value = false
    }
  }

  async function ensureStatus(maxAgeMs = 60000) {
    if (status.value && Date.now() - statusLoadedAt < maxAgeMs) return status.value
    return refreshStatus()
  }

  async function fetchConversations(filters?: WhatsAppConversationFilters) {
    try {
      isLoadingConversations.value = true
      error.value = null
      const res = await whatsappApi.getConversations(filters)
      conversations.value = res.data ?? []
      return conversations.value
    } catch (err: any) {
      error.value = err.message || 'No se pudieron cargar las conversaciones'
      throw err
    } finally {
      isLoadingConversations.value = false
    }
  }

  async function fetchMessages(conversationId: number) {
    try {
      isLoadingMessages.value = true
      error.value = null
      const res = await whatsappApi.getMessages(conversationId)
      messages.value[conversationId] = res.data ?? []
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) conversation.unreadCount = 0
      return messages.value[conversationId]
    } catch (err: any) {
      error.value = err.message || 'No se pudieron cargar los mensajes'
      throw err
    } finally {
      isLoadingMessages.value = false
    }
  }

  async function sendMessage(conversationId: number, text: string) {
    const res = await whatsappApi.sendMessage(conversationId, text)
    const message = res.data
    if (message) {
      messages.value[conversationId] = [...(messages.value[conversationId] ?? []), message]
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) {
        conversation.lastMessageAt = message.timestamp
        conversation.lastMessagePreview = message.textBody
      }
    }
    return message
  }

  function clear() {
    conversations.value = []
    messages.value = {}
    error.value = null
  }

  return {
    status,
    conversations,
    messages,
    isLoadingStatus,
    isLoadingConversations,
    isLoadingMessages,
    error,
    enabled,
    enabledBranchIds,
    refreshStatus,
    ensureStatus,
    fetchConversations,
    fetchMessages,
    sendMessage,
    clear,
  }
})
