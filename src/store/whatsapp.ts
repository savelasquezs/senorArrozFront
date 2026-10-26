import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/store/auth'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type {
  WhatsAppConversation,
  WhatsAppConversationFilters,
  WhatsAppOperationalBranchOption,
  WhatsAppAiDiagnostics,
  WhatsAppAiProcessingChangedPayload,
  WhatsAppMessage,
  WhatsAppQuickReply,
  WhatsAppQuickReplyFilters,
  WhatsAppRealtimeMessagePayload,
  WhatsAppStatus,
  WhatsAppUnreadSummary,
} from '@/types/whatsapp'
import {
  aiOverallStatusFromActivity,
  aiProcessingActivityAt,
  isAiProcessingFailed,
  isAiProcessingPending,
  shouldApplyAiProcessingUpdate,
  upsertAiProcessing,
} from '@/utils/whatsappAiDiagnostics'

export const useWhatsAppStore = defineStore('whatsapp', () => {
  const status = ref<WhatsAppStatus | null>(null)
  const unreadSummary = ref<WhatsAppUnreadSummary>({ totalUnread: 0, unreadConversations: 0, latestMessageAt: null })
  const conversations = ref<WhatsAppConversation[]>([])
  const operationalBranches = ref<WhatsAppOperationalBranchOption[]>([])
  const messages = ref<Record<number, WhatsAppMessage[]>>({})
  const quickReplies = ref<WhatsAppQuickReply[]>([])
  const aiDiagnosticsByBranch = ref<Record<number, WhatsAppAiDiagnostics>>({})
  const aiDiagnosticsByConversation = ref<Record<number, WhatsAppAiDiagnostics>>({})
  const isLoadingStatus = ref(false)
  const isLoadingConversations = ref(false)
  const isLoadingMessages = ref(false)
  const isLoadingQuickReplies = ref(false)
  const aiDiagnosticsLoadingCount = ref(0)
  const aiDiagnosticsError = ref<string | null>(null)
  const error = ref<string | null>(null)
  let statusLoadedAt = 0
  let statusInFlight: Promise<WhatsAppStatus> | null = null
  let unreadInFlight: Promise<WhatsAppUnreadSummary> | null = null
  // One network request per conversation, with explicit invalidation on reset/logout.
  const messageRequests = new Map<number, { promise: Promise<WhatsAppMessage[]>; abort: AbortController }>()
  const messageRevisions = new Map<number, number>()
  const messageEpochs = new Map<number, number>()
  let messageScope = 0

  function markMessageChanged(conversationId: number) {
    messageRevisions.set(conversationId, (messageRevisions.get(conversationId) ?? 0) + 1)
  }

  function invalidateMessageRequest(conversationId: number) {
    const pending = messageRequests.get(conversationId)
    messageRequests.delete(conversationId)
    pending?.abort.abort()
    messageEpochs.set(conversationId, (messageEpochs.get(conversationId) ?? 0) + 1)
    isLoadingMessages.value = messageRequests.size > 0
  }

  const enabled = computed(() => status.value?.enabled === true)
  const enabledBranchIds = computed(() => status.value?.branchIds ?? [])
  const unreadTotal = computed(() => unreadSummary.value.totalUnread)
  const unreadConversationCount = computed(() => unreadSummary.value.unreadConversations)

  function refreshStatus() {
    if (statusInFlight) return statusInFlight
    isLoadingStatus.value = true
    error.value = null
    const request: Promise<WhatsAppStatus> = whatsappApi.getStatus().then(res => {
      if (statusInFlight === request) {
        status.value = res.data
        statusLoadedAt = Date.now()
        if (!res.data.enabled) {
          unreadInFlight = null
          unreadSummary.value = { totalUnread: 0, unreadConversations: 0, latestMessageAt: null }
        }
      }
      return status.value ?? { enabled: false, branchIds: [] }
    }).catch((err: any) => {
      if (statusInFlight === request) error.value = err.message || 'No se pudo consultar el estado de WhatsApp'
      throw err
    }).finally(() => {
      if (statusInFlight === request) {
        statusInFlight = null
        isLoadingStatus.value = false
      }
    })
    statusInFlight = request
    return request
  }

  async function fetchAiDiagnostics(branchId: number, conversationId?: number | null, take = 20) {
    try {
      aiDiagnosticsLoadingCount.value += 1
      aiDiagnosticsError.value = null
      const res = await whatsappApi.getAiDiagnostics(branchId, conversationId, take)
      const diagnostics = res.data
      if (!diagnostics) return null

      diagnostics.recentMessages = diagnostics.recentMessages ?? []
      const diagnosticsConversationId = conversationId || diagnostics.conversationId || null
      if (diagnosticsConversationId) {
        aiDiagnosticsByConversation.value[diagnosticsConversationId] = diagnostics
      } else {
        aiDiagnosticsByBranch.value[branchId] = diagnostics
      }

      for (const processing of diagnostics.recentMessages) {
        attachAiProcessingToMessage(processing.conversationId, processing.messageId, processing)
      }
      return diagnostics
    } catch (err: any) {
      aiDiagnosticsError.value = err.message || 'No se pudo consultar el estado de la IA'
      throw err
    } finally {
      aiDiagnosticsLoadingCount.value = Math.max(0, aiDiagnosticsLoadingCount.value - 1)
    }
  }

  async function ensureStatus(maxAgeMs = 60000) {
    if (statusInFlight) return statusInFlight
    if (status.value && Date.now() - statusLoadedAt < maxAgeMs) return status.value
    return refreshStatus()
  }

  async function fetchUnreadSummary() {
    if (!enabled.value) {
      unreadSummary.value = { totalUnread: 0, unreadConversations: 0, latestMessageAt: null }
      return unreadSummary.value
    }
    if (unreadInFlight) return unreadInFlight

    const before = unreadSummary.value
    const request: Promise<WhatsAppUnreadSummary> = whatsappApi.getUnreadSummary().then(res => {
      // Do not overwrite a newer SignalR/read update or a different branch/session.
      if (unreadInFlight === request && unreadSummary.value === before && enabled.value) {
        unreadSummary.value = res.data ?? { totalUnread: 0, unreadConversations: 0, latestMessageAt: null }
      }
      return unreadSummary.value
    }).finally(() => {
      if (unreadInFlight === request) unreadInFlight = null
    })
    unreadInFlight = request
    return request
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

  async function fetchOperationalBranches() {
    const res = await whatsappApi.getOperationalBranches()
    operationalBranches.value = res.data ?? []
    return operationalBranches.value
  }

  async function updateOperationalBranch(conversationId: number, branchId: number | null) {
    const res = await whatsappApi.updateOperationalBranch(conversationId, branchId)
    const conversation = conversations.value.find(x => x.id === conversationId)
    if (conversation && res.data) Object.assign(conversation, res.data)
    return res.data
  }

  function fetchMessages(conversationId: number): Promise<WhatsAppMessage[]> {
    const inFlight = messageRequests.get(conversationId)
    if (inFlight) return inFlight.promise

    const scope = messageScope
    const epoch = messageEpochs.get(conversationId) ?? 0
    const revision = messageRevisions.get(conversationId) ?? 0
    const abort = new AbortController()
    error.value = null
    isLoadingMessages.value = true
    const isCurrent = () => messageScope === scope
      && (messageEpochs.get(conversationId) ?? 0) === epoch
      && !abort.signal.aborted

    let request!: Promise<WhatsAppMessage[]>
    request = (async () => {
      try {
        const res = await whatsappApi.getMessages(conversationId, abort.signal)
        if (!isCurrent()) return messages.value[conversationId] ?? []

        // SignalR/send may deliver a newer message or status while HTTP is pending.
        // Preserve those updates instead of replacing the entire conversation.
        const changedDuringRequest = (messageRevisions.get(conversationId) ?? 0) !== revision
        const byId = new Map((res.data ?? []).map(message => [message.id, message]))
        if (changedDuringRequest) {
          for (const current of messages.value[conversationId] ?? []) byId.set(current.id, current)
        }
        messages.value[conversationId] = sortMessages([...byId.values()])

        const diagnostics = aiDiagnosticsByConversation.value[conversationId]
        for (const processing of diagnostics?.recentMessages ?? []) {
          attachAiProcessingToMessage(conversationId, processing.messageId, processing)
        }

        // A new inbound SignalR event must not be marked read by an older HTTP reply.
        const conversation = conversations.value.find(c => c.id === conversationId)
        if (!changedDuringRequest && conversation && conversation.unreadCount > 0) {
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
        // A canceled/invalidated request belongs to the previous session/reset.
        if (!isCurrent()) return messages.value[conversationId] ?? []
        error.value = err.message || 'No se pudieron cargar los mensajes'
        throw err
      } finally {
        if (messageRequests.get(conversationId)?.promise === request) {
          messageRequests.delete(conversationId)
          isLoadingMessages.value = messageRequests.size > 0
        }
      }
    })()
    messageRequests.set(conversationId, { promise: request, abort })
    return request
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

  async function changeAttention(conversationId: number, action: 'take' | 'return-to-ai' | 'pause-ai' | 'request-human' | 'close' | 'reopen') {
    const res = await whatsappApi.changeAttention(conversationId, action)
    const conversation = conversations.value.find(x => x.id === conversationId)
    if (conversation && res.data) Object.assign(conversation, res.data)
    return res.data
  }

  async function resetConversationForTesting(conversationId: number) {
    const res = await whatsappApi.resetConversationForTesting(conversationId)
    const conversation = conversations.value.find(x => x.id === conversationId)
    if (conversation && res.data) Object.assign(conversation, res.data)
    invalidateMessageRequest(conversationId)
    messages.value[conversationId] = []
    delete aiDiagnosticsByConversation.value[conversationId]
    return res.data
  }

  function applyAttentionChanged(conversation: WhatsAppConversation) {
    const current = conversations.value.find(x => x.id === conversation.id)
    if (current) Object.assign(current, conversation)
    else conversations.value.unshift(conversation)
  }

  async function sendMenu(conversationId: number) {
    const res = await whatsappApi.sendMenu(conversationId)
    if (res.data) upsertMessage(conversationId, res.data)
    return res.data
  }

  async function sendQuickReply(conversationId: number, quickReplyId: number) {
    const res = await whatsappApi.sendQuickReply(conversationId, quickReplyId)
    const message = res.data
    if (message) {
      upsertMessage(conversationId, message)
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (conversation) {
        conversation.lastMessageAt = message.timestamp
        conversation.lastMessagePreview = message.textBody
      }
      const reply = quickReplies.value.find(x => x.id === quickReplyId)
      if (reply) {
        reply.usageCount += 1
        reply.lastUsedAt = message.timestamp
      }
      quickReplies.value = [...quickReplies.value].sort((a, b) => b.usageCount - a.usageCount || a.shortcut.localeCompare(b.shortcut))
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

  async function fetchQuickReplies(filters?: WhatsAppQuickReplyFilters) {
    try {
      isLoadingQuickReplies.value = true
      error.value = null
      const res = await whatsappApi.getQuickReplies(filters)
      quickReplies.value = res.data ?? []
      return quickReplies.value
    } catch (err: any) {
      error.value = err.message || 'No se pudieron cargar las respuestas rápidas'
      throw err
    } finally {
      isLoadingQuickReplies.value = false
    }
  }

  async function saveQuickReply(payload: {
    id?: number | null
    branchId?: number | null
    shortcut: string
    messageTemplate: string
    isActive: boolean
  }) {
    const body = {
      branchId: payload.branchId,
      shortcut: payload.shortcut,
      messageTemplate: payload.messageTemplate,
      isActive: payload.isActive,
    }
    const res = payload.id
      ? await whatsappApi.updateQuickReply(payload.id, body)
      : await whatsappApi.createQuickReply(body)
    const reply = res.data
    if (reply) {
      const index = quickReplies.value.findIndex(x => x.id === reply.id)
      quickReplies.value = index >= 0
        ? quickReplies.value.map(x => x.id === reply.id ? reply : x)
        : [reply, ...quickReplies.value]
      quickReplies.value = [...quickReplies.value].sort((a, b) => b.usageCount - a.usageCount || a.shortcut.localeCompare(b.shortcut))
    }
    return reply
  }

  async function deleteQuickReply(id: number) {
    await whatsappApi.deleteQuickReply(id)
    quickReplies.value = quickReplies.value.filter(x => x.id !== id)
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
    const knownProcessing = aiDiagnosticsByConversation.value[conversationId]?.recentMessages.find(
      processing => processing.messageId === message.id,
    )
    const enrichedMessage = message.aiProcessing || !knownProcessing
      ? message
      : { ...message, aiProcessing: knownProcessing }
    const existing = messages.value[conversationId] ?? []
    const index = existing.findIndex(x => x.id === enrichedMessage.id)
    const updated = index >= 0
      ? existing.map(x => x.id === enrichedMessage.id ? enrichedMessage : x)
      : [...existing, enrichedMessage]
    messages.value[conversationId] = sortMessages(updated)
    markMessageChanged(conversationId)
  }

  function attachAiProcessingToMessage(
    conversationId: number,
    messageId: number,
    processing: WhatsAppMessage['aiProcessing'],
  ) {
    const conversationMessages = messages.value[conversationId]
    if (!conversationMessages?.length) return
    const index = conversationMessages.findIndex(message => message.id === messageId)
    if (index < 0) return
    if (processing
      && !shouldApplyAiProcessingUpdate(conversationMessages[index].aiProcessing, processing)) return
    conversationMessages[index] = { ...conversationMessages[index], aiProcessing: processing }
    messages.value[conversationId] = [...conversationMessages]
    markMessageChanged(conversationId)
  }

  function applyAiProcessingChanged(payload: WhatsAppAiProcessingChangedPayload) {
    if (!payload?.branchId || !payload.processing?.messageId || !payload.processing.conversationId) return
    const processing = payload.processing
    const conversationId = processing.conversationId
    const branchDiagnostics = aiDiagnosticsByBranch.value[payload.branchId]
    const existingDiagnostics = aiDiagnosticsByConversation.value[conversationId] ?? branchDiagnostics
    const knownProcessing = existingDiagnostics?.recentMessages.find(item =>
      item.messageId === processing.messageId && item.conversationId === conversationId,
    )
    if (!shouldApplyAiProcessingUpdate(knownProcessing, processing)) return

    function updatedDiagnostics(current: WhatsAppAiDiagnostics): WhatsAppAiDiagnostics {
      const previous = current.recentMessages.find(item =>
        item.messageId === processing.messageId && item.conversationId === conversationId,
      )
      const pendingDelta = Number(isAiProcessingPending(processing)) - Number(isAiProcessingPending(previous))
      const failedDelta = Number(isAiProcessingFailed(processing)) - Number(isAiProcessingFailed(previous))
      const pendingCount = Math.max(0, current.pendingCount + pendingDelta)
      const failedCountLast24Hours = Math.max(0, current.failedCountLast24Hours + failedDelta)
      const recentMessages = upsertAiProcessing(current.recentMessages, processing)
      const retrying = recentMessages.find(item =>
        isAiProcessingPending(item)
        && item.willRetry
        && Boolean(item.errorCategory || item.nextRetryAt),
      )
      const representative = failedCountLast24Hours > 0
        ? recentMessages.find(isAiProcessingFailed)
        : pendingCount > 0
          ? retrying ?? recentMessages.find(isAiProcessingPending)
          : recentMessages[0]
      const activityAt = aiProcessingActivityAt(processing)
      const previousActivity = current.lastActivityAt ? new Date(current.lastActivityAt).getTime() : 0
      const incomingActivity = activityAt ? new Date(activityAt).getTime() : 0
      return {
        ...current,
        title: representative?.title || current.title,
        summary: representative?.detail || current.summary,
        overallStatus: aiOverallStatusFromActivity(recentMessages, pendingCount, failedCountLast24Hours),
        pendingCount,
        failedCountLast24Hours,
        lastActivityAt: incomingActivity >= previousActivity ? activityAt : current.lastActivityAt,
        recentMessages,
      }
    }

    const conversationDiagnostics = aiDiagnosticsByConversation.value[conversationId]
    const conversationBase: WhatsAppAiDiagnostics = conversationDiagnostics
      ? conversationDiagnostics
      : branchDiagnostics
        ? {
            ...branchDiagnostics,
            conversationId,
            pendingCount: 0,
            failedCountLast24Hours: 0,
            lastActivityAt: null,
            recentMessages: [],
          }
      : {
          branchId: payload.branchId,
          conversationId,
          agentStatus: '',
          overallStatus: processing.severity || processing.status,
          title: processing.title || 'Actividad de IA',
          summary: processing.detail || '',
          provider: null,
          model: null,
          isActive: true,
          isVerified: false,
          attentionMode: null,
          pendingCount: 0,
          failedCountLast24Hours: 0,
          lastActivityAt: aiProcessingActivityAt(processing),
          recentMessages: [],
        }
    aiDiagnosticsByConversation.value[conversationId] = updatedDiagnostics(conversationBase)

    if (branchDiagnostics) {
      aiDiagnosticsByBranch.value[payload.branchId] = updatedDiagnostics(branchDiagnostics)
    }

    attachAiProcessingToMessage(conversationId, processing.messageId, processing)
  }

  function utcTimestamp(value: string) {
    // Compatibility with API responses produced before UTC values included `Z`.
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`
    const timestamp = new Date(normalized).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  function sortMessages(items: WhatsAppMessage[]) {
    return [...items].sort((a, b) => utcTimestamp(a.timestamp) - utcTimestamp(b.timestamp) || a.id - b.id)
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
    messageScope++
    for (const pending of messageRequests.values()) pending.abort.abort()
    messageRequests.clear()
    messageEpochs.clear()
    messageRevisions.clear()
    isLoadingMessages.value = false
    statusInFlight = null
    unreadInFlight = null
    statusLoadedAt = 0
    status.value = null
    isLoadingStatus.value = false
    conversations.value = []
    operationalBranches.value = []
    messages.value = {}
    quickReplies.value = []
    aiDiagnosticsByBranch.value = {}
    aiDiagnosticsByConversation.value = {}
    unreadSummary.value = { totalUnread: 0, unreadConversations: 0, latestMessageAt: null }
    error.value = null
    aiDiagnosticsError.value = null
  }

  const auth = useAuthStore()
  watch(() => `${auth.user?.id ?? ''}:${auth.user?.role ?? ''}:${auth.user?.branchId ?? ''}`, clear, { flush: 'sync' })

  return {
    status,
    unreadSummary,
    conversations,
    operationalBranches,
    messages,
    quickReplies,
    aiDiagnosticsByBranch,
    aiDiagnosticsByConversation,
    isLoadingStatus,
    isLoadingConversations,
    isLoadingMessages,
    isLoadingQuickReplies,
    aiDiagnosticsLoadingCount,
    aiDiagnosticsError,
    error,
    enabled,
    enabledBranchIds,
    unreadTotal,
    unreadConversationCount,
    refreshStatus,
    ensureStatus,
    fetchUnreadSummary,
    fetchAiDiagnostics,
    fetchConversations,
    fetchOperationalBranches,
    updateOperationalBranch,
    fetchMessages,
    sendMessage,
    changeAttention,
    resetConversationForTesting,
    applyAttentionChanged,
    sendMenu,
    sendQuickReply,
    sendMediaMessage,
    fetchQuickReplies,
    saveQuickReply,
    deleteQuickReply,
    applyRealtimeMessage,
    applyAiProcessingChanged,
    clear,
  }
})
