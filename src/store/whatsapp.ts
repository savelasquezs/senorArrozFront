import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type {
  WhatsAppConversation,
  WhatsAppConversationFilters,
  WhatsAppMessage,
  WhatsAppRealtimeMessagePayload,
  WhatsAppStatus,
  WhatsAppUnreadSummary,
} from '@/types/whatsapp'

export const useWhatsAppStore = defineStore('whatsapp', () => {
  const status = ref<WhatsAppStatus | null>(null)
  const unreadSummary = ref<WhatsAppUnreadSummary>({ totalUnread: 0, unreadConversations: 0, latestMessageAt: null })
  const conversations = ref<WhatsAppConversation[]>([])
  const messages = ref<Record<number, WhatsAppMessage[]>>({})
  const isLoadingStatus = ref(false)
  const isLoadingConversations = ref(false)
  const isLoadingMessages = ref(false)
  const error = ref<string | null>(null)
  let statusLoadedAt = 0

  const enabled = computed(() => status.value?.enabled === true)
  const enabledBranchIds = computed(() => status.value?.branchIds ?? [])
  const unreadTotal = computed(() => unreadSummary.value.totalUnread)
  const unreadConversationCount = computed(() => unreadSummary.value.unreadConversations)

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

  async function fetchUnreadSummary() {
    if (!enabled.value) {
      unreadSummary.value = { totalUnread: 0, unreadConversations: 0, latestMessageAt: null }
      return unreadSummary.value
    }

    const res = await whatsappApi.getUnreadSummary()
    unreadSummary.value = res.data ?? { totalUnread: 0, unreadConversations: 0, latestMessageAt: null }
    return unreadSummary.value
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
      if (conversation && conversation.unreadCount > 0) {
        const previousUnread = conversation.unreadCount
        conversation.unreadCount = 0
        unreadSummary.value = {
          ...unreadSummary.value,
          totalUnread: Math.max(0, unreadSummary.value.totalUnread - previousUnread),
          unreadConversations: Math.max(0, unreadSummary.value.unreadConversations - 1),
        }
      }
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
      upsertMessage(conversationId, message)
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) {
        conversation.lastMessageAt = message.timestamp
        conversation.lastMessagePreview = message.textBody
      }
    }
    return message
  }

  async function sendMediaMessage(conversationId: number, file: File, caption?: string) {
    const res = await whatsappApi.sendMediaMessage(conversationId, file, caption)
    const message = res.data
    if (message) {
      upsertMessage(conversationId, message)
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) {
        conversation.lastMessageAt = message.timestamp
        conversation.lastMessagePreview = message.textBody || mediaPreviewLabel(message.type)
      }
    }
    return message
  }

  function mediaPreviewLabel(type: WhatsAppMessage['type']) {
    const labels: Record<WhatsAppMessage['type'], string> = {
      text: '',
      image: 'Imagen',
      audio: 'Audio',
      video: 'Video',
      document: 'Documento',
      sticker: 'Sticker',
    }
    return labels[type] || 'Archivo'
  }

  function upsertMessage(conversationId: number, message: WhatsAppMessage) {
    const existing = messages.value[conversationId] ?? []
    const index = existing.findIndex(x => x.id === message.id)
    messages.value[conversationId] = index >= 0
      ? existing.map(x => x.id === message.id ? message : x)
      : [...existing, message].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() || a.id - b.id)
  }

  function applyRealtimeMessage(payload: WhatsAppRealtimeMessagePayload, activeConversationId?: number | null) {
    const incomingConversation = { ...payload.conversation }
    const incomingMessage = payload.message
    const existingConversation = conversations.value.find(c => c.id === incomingConversation.id)
    const previousUnread = existingConversation?.unreadCount ?? 0
    const isActiveConversation = activeConversationId === incomingConversation.id

    if (isActiveConversation) {
      incomingConversation.unreadCount = 0
    }

    if (existingConversation) {
      Object.assign(existingConversation, incomingConversation)
    } else {
      conversations.value = [incomingConversation, ...conversations.value]
    }

    conversations.value = [...conversations.value].sort(
      (a, b) =>
        new Date(b.lastMessageAt ?? b.updatedAt ?? b.createdAt).getTime()
        - new Date(a.lastMessageAt ?? a.updatedAt ?? a.createdAt).getTime(),
    )

    upsertMessage(incomingMessage.conversationId, incomingMessage)

    if (incomingMessage.direction !== 'inbound') return

    if (isActiveConversation) {
      unreadSummary.value = {
        ...unreadSummary.value,
        totalUnread: Math.max(0, unreadSummary.value.totalUnread - previousUnread),
        unreadConversations: Math.max(0, unreadSummary.value.unreadConversations - (previousUnread > 0 ? 1 : 0)),
        latestMessageAt: incomingMessage.timestamp,
      }
      return
    }

    const nextUnread = incomingConversation.unreadCount
    const delta = existingConversation ? Math.max(0, nextUnread - previousUnread) : Math.max(1, nextUnread)
    unreadSummary.value = {
      totalUnread: Math.max(0, unreadSummary.value.totalUnread + delta),
      unreadConversations: Math.max(
        0,
        unreadSummary.value.unreadConversations
          + (previousUnread === 0 && nextUnread > 0 ? 1 : 0),
      ),
      latestMessageAt: incomingMessage.timestamp,
    }
  }

  function clear() {
    conversations.value = []
    messages.value = {}
    unreadSummary.value = { totalUnread: 0, unreadConversations: 0, latestMessageAt: null }
    error.value = null
  }

  return {
    status,
    unreadSummary,
    conversations,
    messages,
    isLoadingStatus,
    isLoadingConversations,
    isLoadingMessages,
    error,
    enabled,
    enabledBranchIds,
    unreadTotal,
    unreadConversationCount,
    refreshStatus,
    ensureStatus,
    fetchUnreadSummary,
    fetchConversations,
    fetchMessages,
    sendMessage,
    sendMediaMessage,
    applyRealtimeMessage,
    clear,
  }
})
