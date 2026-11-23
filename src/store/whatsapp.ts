import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/store/auth'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { compareWhatsAppConversationActivity, mediaPreviewLabel } from '@/utils/whatsappInbox'
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

const outgoingProgress: Partial<Record<WhatsAppMessage['status'], number>> = { sent: 1, delivered: 2, read: 3 }

export const useWhatsAppStore = defineStore('whatsapp', () => {
  const status = ref<WhatsAppStatus | null>(null)
  const unreadSummary = ref<WhatsAppUnreadSummary>({ totalUnread: 0, unreadConversations: 0, latestMessageAt: null })
  const conversations = ref<WhatsAppConversation[]>([])
  const hasMoreConversations = ref(false)
  const conversationWindowed = ref(false)
  const activeConversationId = ref<number | null>(null)
  let nextConversationCursor: string | null = null
  let conversationFilters: WhatsAppConversationFilters | undefined
  const messageUse = new Map<number, number>()
  const messageReadAt = new Map<number, number>()
  let cacheClock = 0
  const maxConversations = 300, maxMessageThreads = 12, maxMessages = 500

  function boundConversations(preferTail = false) {
    if (conversations.value.length <= maxConversations) return
    const pinned = conversations.value.find(x => x.id === activeConversationId.value)
    conversations.value = preferTail ? conversations.value.slice(-maxConversations) : conversations.value.slice(0, maxConversations)
    if (pinned && !conversations.value.some(x => x.id === pinned.id)) conversations.value[0] = pinned
    conversationWindowed.value = true
  }

  function touchMessages(id: number) {
    messageUse.set(id, ++cacheClock)
    for (const [candidate] of [...messageUse].sort((a, b) => a[1] - b[1])) {
      if (messageUse.size <= maxMessageThreads) break
      if (candidate === activeConversationId.value || candidate === id) continue
      invalidateMessageRequest(candidate)
      delete messages.value[candidate]
      delete aiDiagnosticsByConversation.value[candidate]
      messageUse.delete(candidate)
      messageRevisions.delete(candidate)
      messageEpochs.delete(candidate)
    }
  }

  function activateConversation(id: number) {
    const previous = activeConversationId.value
    activeConversationId.value = id
    if (previous && previous !== id) {
      messageRequests.get(previous)?.abort.abort()
      olderMessageRequests.get(previous)?.abort.abort()
    }
    touchMessages(id)
  }
  const operationalBranches = ref<WhatsAppOperationalBranchOption[]>([])
  const messages = ref<Record<number, WhatsAppMessage[]>>({})
  const messageHistory = ref<Record<number, { nextCursor: string | null; hasMore: boolean; hasMoreRecent?: boolean }>>({})
  const olderMessagesLoading = ref<Record<number, boolean>>({})
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
  const olderMessageRequests = new Map<number, { promise: Promise<WhatsAppMessage[]>; abort: AbortController }>()
  const messageRevisions = new Map<number, number>()
  const messageEpochs = new Map<number, number>()
  let messageScope = 0
  let conversationRequest: { key: string; abort: AbortController; promise: Promise<WhatsAppConversation[]> } | null = null

  function markMessageChanged(conversationId: number) {
    messageRevisions.set(conversationId, (messageRevisions.get(conversationId) ?? 0) + 1)
  }

  function invalidateMessageRequest(conversationId: number) {
    messageReadAt.delete(conversationId)
    const pending = messageRequests.get(conversationId)
    messageRequests.delete(conversationId)
    pending?.abort.abort()
    olderMessageRequests.get(conversationId)?.abort.abort()
    olderMessageRequests.delete(conversationId)
    delete messageHistory.value[conversationId]
    delete olderMessagesLoading.value[conversationId]
    messageEpochs.set(conversationId, (messageEpochs.get(conversationId) ?? 0) + 1)
    isLoadingMessages.value = messageRequests.size + olderMessageRequests.size > 0
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

  function fetchConversations(filters?: WhatsAppConversationFilters, moreOrSignal: boolean | AbortSignal = false): Promise<WhatsAppConversation[]> {
    const more = moreOrSignal === true
    const signal = typeof moreOrSignal === 'boolean' ? undefined : moreOrSignal
    if (signal?.aborted) return Promise.resolve(conversations.value)
    if (more && !hasMoreConversations.value) return Promise.resolve(conversations.value)
    const selectedFilters = more ? conversationFilters : filters
    const cursor = more ? nextConversationCursor ?? undefined : undefined
    const key = JSON.stringify({ filters: selectedFilters ?? {}, cursor })
    if (conversationRequest?.key === key && !conversationRequest.abort.signal.aborted) return conversationRequest.promise
    conversationRequest?.abort.abort()
    const abort = new AbortController(), scope = messageScope
    const cancel = () => abort.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    const revisions = new Map(messageRevisions)
    const isCurrent = () => scope === messageScope && !abort.signal.aborted
    const promise = (async () => {
      try {
      isLoadingConversations.value = true
      error.value = null
      const res = await whatsappApi.getConversationPage(selectedFilters, abort.signal, cursor)
      if (!isCurrent()) return conversations.value
      if (!more) conversationWindowed.value = false
      conversationFilters = selectedFilters
      nextConversationCursor = res.data.nextCursor
      hasMoreConversations.value = res.data.hasMore
      const byId = new Map((more ? conversations.value : []).map(item => [item.id, item]))
      for (const item of res.data.items) byId.set(item.id, item)
      for (const current of conversations.value) {
        const pageItem = byId.get(current.id)
        if (messageRevisions.get(current.id) === revisions.get(current.id)
          && (!pageItem || (pageItem.attentionRevision ?? 0) >= (current.attentionRevision ?? 0))) continue
        if ((selectedFilters?.label || selectedFilters?.search || selectedFilters?.deliverymenAssignedToday || selectedFilters?.suppliersOnly) && !pageItem) continue
        byId.set(current.id, pageItem ? {
          ...current, labels: pageItem.labels ?? current.labels, matchesContactQuickFilter: pageItem.matchesContactQuickFilter,
        } : current)
      }
      conversations.value = [...byId.values()]
      boundConversations(more)
      return conversations.value
    } catch (err: any) {
      if (!isCurrent()) return conversations.value
      error.value = err.message || 'No se pudieron cargar las conversaciones'
      throw err
    } finally {
      signal?.removeEventListener('abort', cancel)
      if (conversationRequest?.abort === abort) { isLoadingConversations.value = false; conversationRequest = null }
    }
    })()
    conversationRequest = { key, abort, promise }
    return promise
  }

  async function fetchOperationalBranches() {
    const res = await whatsappApi.getOperationalBranches()
    operationalBranches.value = res.data ?? []
    return operationalBranches.value
  }
  async function fetchConversation(id: number): Promise<WhatsAppConversation | null> {
    const scope = messageScope, epoch = messageEpochs.get(id) ?? 0
    const response = await whatsappApi.getConversation(id)
    if (scope !== messageScope || epoch !== (messageEpochs.get(id) ?? 0) || !response.data) return null
    applyAttentionChanged(response.data)
    return conversations.value.find(c => c.id === id) ?? null
  }

  async function updateOperationalBranch(conversationId: number, branchId: number | null) {
    const scope = messageScope
    const res = await whatsappApi.updateOperationalBranch(conversationId, branchId, conversations.value.find(x => x.id === conversationId)?.attentionRevision ?? 0)
    if (scope !== messageScope) return null
    const conversation = conversations.value.find(x => x.id === conversationId)
    if (conversation && res.data) Object.assign(conversation, res.data)
    return res.data
  }

  function fetchMessages(conversationId: number, older = false, recent = false, preferCached = false): Promise<WhatsAppMessage[]> {
    touchMessages(conversationId)
    const requests = older ? olderMessageRequests : messageRequests
    const inFlight = requests.get(conversationId)
    if (inFlight && !inFlight.abort.signal.aborted) return inFlight.promise
    if (preferCached && !older && !recent && messages.value[conversationId]?.length
      && !messageHistory.value[conversationId]?.hasMoreRecent
      && !conversations.value.find(value => value.id === conversationId)?.unreadCount
      && messageReadAt.has(conversationId)
      && Date.now() - (messageReadAt.get(conversationId) ?? 0) < 15000)
      return Promise.resolve(messages.value[conversationId])
    const before = older ? messageHistory.value[conversationId]?.nextCursor : undefined
    if (older && !before) return Promise.resolve(messages.value[conversationId] ?? [])

    const scope = messageScope
    const epoch = messageEpochs.get(conversationId) ?? 0
    const revision = messageRevisions.get(conversationId) ?? 0
    const abort = new AbortController()
    error.value = null
    isLoadingMessages.value = true
    if (older) olderMessagesLoading.value[conversationId] = true
    const isCurrent = () => messageScope === scope
      && (messageEpochs.get(conversationId) ?? 0) === epoch
      && !abort.signal.aborted

    let request!: Promise<WhatsAppMessage[]>
    request = (async () => {
      try {
        const resetWindow = !older && (recent || messageHistory.value[conversationId]?.hasMoreRecent)
        const beforeIds = new Set((messages.value[conversationId] ?? []).map(item => item.id))
        const existingIds = resetWindow ? new Set<number>() : beforeIds
        let res = await whatsappApi.getMessagesPage(conversationId, abort.signal, before ?? undefined)
        const fetched = [...(res.data?.items ?? [])]
        let overlaps = fetched.some(item => existingIds.has(item.id))
        while (!older && fetched.length < maxMessages && existingIds.size && !overlaps && res.data.hasMore && res.data.nextCursor && isCurrent()) {
          res = await whatsappApi.getMessagesPage(conversationId, abort.signal, res.data.nextCursor)
          fetched.push(...res.data.items)
          overlaps = res.data.items.some(item => existingIds.has(item.id))
        }
        if (!isCurrent()) return messages.value[conversationId] ?? []

        // SignalR/send may deliver a newer message or status while HTTP is pending.
        // Preserve those updates instead of replacing the entire conversation.
        const changedDuringRequest = (messageRevisions.get(conversationId) ?? 0) !== revision
        const byId = new Map(fetched.map(message => [message.id, message]))
        if (changedDuringRequest || older || overlaps) {
          for (const current of messages.value[conversationId] ?? []) {
            if (resetWindow && beforeIds.has(current.id)) continue
            if (changedDuringRequest || older || !byId.has(current.id)) byId.set(current.id, current)
          }
        }
        const sorted = sortMessages([...byId.values()])
        messages.value[conversationId] = older ? sorted.slice(0, maxMessages) : sorted.slice(-maxMessages)
        if (!older) messageReadAt.set(conversationId, Date.now())
        if (older || !messageHistory.value[conversationId] || !overlaps) {
          messageHistory.value[conversationId] = { nextCursor: res.data.nextCursor, hasMore: res.data.hasMore,
            ...(older && (sorted.length > maxMessages || messageHistory.value[conversationId]?.hasMoreRecent) ? { hasMoreRecent: true } : {}) }
        }

        const diagnostics = aiDiagnosticsByConversation.value[conversationId]
        for (const processing of diagnostics?.recentMessages ?? []) {
          attachAiProcessingToMessage(conversationId, processing.messageId, processing)
        }

        // A new inbound SignalR event must not be marked read by an older HTTP reply.
        const conversation = conversations.value.find(c => c.id === conversationId)
        if (!older && !changedDuringRequest && conversation && conversation.unreadCount > 0) {
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
        if (requests.get(conversationId)?.promise === request) {
          requests.delete(conversationId)
          if (older) olderMessagesLoading.value[conversationId] = false
          isLoadingMessages.value = messageRequests.size + olderMessageRequests.size > 0
        }
      }
    })()
    requests.set(conversationId, { promise: request, abort })
    return request
  }

  async function sendMessage(conversationId: number, text: string, replyToMessageId?: number) {
    const res = replyToMessageId ? await whatsappApi.sendMessage(conversationId, text, replyToMessageId)
      : await whatsappApi.sendMessage(conversationId, text)
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

  async function changeAttention(conversationId: number, action: import('@/types/whatsapp').WhatsAppAttentionAction,
    targetUserId?: number, reason?: string, selected?: WhatsAppConversation, confirmedVersion?: number) {
    const row = conversations.value.find(x => x.id === conversationId)
    const conversation = selected?.id === conversationId && (selected.attentionRevision ?? 0) > (row?.attentionRevision ?? -1)
      ? selected : row
    function apply(attention?: import('@/types/whatsapp').WhatsAppAttention | null) {
      if (!attention) return
      const latest = conversations.value.find(x => x.id === conversationId)
      for (const target of new Set([latest, selected])) {
        if (target?.id !== conversationId || (attention.attentionRevision ?? 0) < (target.attentionRevision ?? 0)) continue
        const status = attention.attentionMode === 'closed' ? 'closed' : target.status === 'closed' ? 'open' : target.status
        Object.assign(target, attention, { status })
      }
      markMessageChanged(conversationId)
    }
    try {
      const res = await whatsappApi.changeAttention(conversationId, action, confirmedVersion ?? conversation?.attentionRevision ?? 0, targetUserId, reason)
      apply(res.data)
      return res.data
    } catch (error) {
      const current = await whatsappApi.getAttention(conversationId).catch(() => null)
      apply(current?.data)
      throw error
    }
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
    markMessageChanged(conversation.id)
    const current = conversations.value.find(x => x.id === conversation.id)
    if (current && (conversation.attentionRevision ?? 0) < (current.attentionRevision ?? 0)) return
    if (current) Object.assign(current, conversation, { labels: conversation.labels ?? current.labels })
    else conversations.value.unshift(conversation)
    boundConversations()
  }

  async function sendMenu(conversationId: number) {
    const res = await whatsappApi.sendMenu(conversationId)
    if (res.data) upsertMessage(conversationId, res.data)
    return res.data
  }

  function applySentMessages(conversationId: number, sent: WhatsAppMessage[]) {
    for (const message of sent) upsertMessage(conversationId, message)
  }

  async function sendQuickReply(conversationId: number, quickReplyId: number, replyToMessageId?: number) {
    const res = await whatsappApi.sendQuickReply(conversationId, quickReplyId, replyToMessageId)
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

  async function sendMediaMessage(conversationId: number, file: File, caption?: string, replyToMessageId?: number, asSticker = false) {
    const res = asSticker ? await whatsappApi.sendMediaMessage(conversationId, file, undefined, replyToMessageId, true)
      : replyToMessageId ? await whatsappApi.sendMediaMessage(conversationId, file, caption, replyToMessageId)
      : await whatsappApi.sendMediaMessage(conversationId, file, caption)
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
    replyMode?: import('@/types/whatsapp').WhatsAppQuickReplyMode
    isActive: boolean
  }) {
    const body = {
      branchId: payload.branchId,
      shortcut: payload.shortcut,
      messageTemplate: payload.messageTemplate,
      replyMode: payload.replyMode,
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

  function upsertMessage(conversationId: number, message: WhatsAppMessage) {
    touchMessages(conversationId)
    const knownProcessing = aiDiagnosticsByConversation.value[conversationId]?.recentMessages.find(
      processing => processing.messageId === message.id,
    )
    const enrichedMessage = message.aiProcessing || !knownProcessing
      ? message
      : { ...message, aiProcessing: knownProcessing }
    const existing = messages.value[conversationId] ?? []
    const index = existing.findIndex(x => x.id === enrichedMessage.id)
    const previous = existing[index]
    if (previous?.direction === 'outbound' && (outgoingProgress[previous.status] ?? 0) > (outgoingProgress[enrichedMessage.status] ?? 0)
      && enrichedMessage.status !== 'failed') enrichedMessage.status = previous.status
    const updated = index >= 0
      ? existing.map(x => x.id === enrichedMessage.id ? enrichedMessage : x)
      : [...existing, enrichedMessage]
    messages.value[conversationId] = sortMessages(updated).slice(-maxMessages)
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

  function applyMessageUpdate(message: WhatsAppMessage, latestConversation?: WhatsAppConversation) {
    const thread = messages.value[message.conversationId]
    const current = thread?.find(item => item.id === message.id)
    if (current?.hiddenSource && !message.hiddenSource) return
    if (current?.editedAt && message.editedAt && Date.parse(current.editedAt) > Date.parse(message.editedAt)) return
    if (current) upsertMessage(message.conversationId, message)
    if (!message.hiddenSource && !message.editedAt) return
    const row = conversations.value.find(item => item.id === message.conversationId)
    if (row && row.lastMessageAt === message.timestamp && (!thread?.length || thread[thread.length - 1]?.id === message.id))
      row.lastMessagePreview = latestConversation?.lastMessagePreview
        ?? (message.hiddenSource === 'pos' ? 'Mensaje oculto en el POS'
          : message.hiddenSource ? 'Mensaje eliminado desde WhatsApp Business' : message.textBody)
  }

  function applyRealtimeMessage(payload: WhatsAppRealtimeMessagePayload, activeConversationId?: number | null) {
    if (payload.message.isUpdate) {
      applyMessageUpdate(payload.message, payload.conversation)
      return
    }
    const incomingConversation = { ...payload.conversation }
    const incomingMessage = payload.message
    const existingConversation = conversations.value.find(c => c.id === incomingConversation.id)
    const previousUnread = existingConversation?.unreadCount ?? 0
    const isActiveConversation = activeConversationId === incomingConversation.id

    if (isActiveConversation) {
      incomingConversation.unreadCount = 0
    }

    if (existingConversation && (incomingConversation.attentionRevision ?? 0) < (existingConversation.attentionRevision ?? 0)) {
      upsertMessage(incomingMessage.conversationId, incomingMessage)
      return
    }
    if (existingConversation) {
      Object.assign(existingConversation, incomingConversation)
    } else {
      conversations.value = [incomingConversation, ...conversations.value]
    }

    conversations.value = [...conversations.value].sort(compareWhatsAppConversationActivity)
    boundConversations()

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

  function forgetConversation(id: number) {
    invalidateMessageRequest(id)
    conversations.value = conversations.value.filter(c => c.id !== id)
    delete messages.value[id]
    delete aiDiagnosticsByConversation.value[id]
    markMessageChanged(id)
  }

  function clear() {
    conversationRequest?.abort.abort()
    conversationRequest = null
    isLoadingConversations.value = false
    messageScope++
    for (const pending of messageRequests.values()) pending.abort.abort()
    for (const pending of olderMessageRequests.values()) pending.abort.abort()
    olderMessageRequests.clear()
    messageHistory.value = {}
    olderMessagesLoading.value = {}
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
    nextConversationCursor = null
    hasMoreConversations.value = false
    conversationWindowed.value = false
    activeConversationId.value = null
    messageUse.clear()
    messageReadAt.clear()
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
    hasMoreConversations,
    conversationWindowed,
    activateConversation,
    operationalBranches,
    messages,
    messageHistory,
    olderMessagesLoading,
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
    fetchConversation,
    fetchOperationalBranches,
    updateOperationalBranch,
    fetchMessages,
    sendMessage,
    changeAttention,
    forgetConversation,
    resetConversationForTesting,
    applyAttentionChanged,
    sendMenu,
    applySentMessages,
    sendQuickReply,
    sendMediaMessage,
    fetchQuickReplies,
    saveQuickReply,
    deleteQuickReply,
    applyRealtimeMessage,
    applyMessageUpdate,
    upsertMessage,
    applyAiProcessingChanged,
    clear,
  }
})
