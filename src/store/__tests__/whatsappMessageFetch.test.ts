import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWhatsAppStore } from '@/store/whatsapp'
import type {
  WhatsAppConversation, WhatsAppMessage, WhatsAppRealtimeMessagePayload,
} from '@/types/whatsapp'

const api = vi.hoisted(() => ({
  getMessagesPage: vi.fn(),
  resetConversationForTesting: vi.fn(),
}))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))

const at = '2026-10-26T12:00:00Z'
function message(id: number, conversationId = 20, patch: Partial<WhatsAppMessage> = {}): WhatsAppMessage {
  return {
    id, conversationId, direction: 'inbound', type: 'text', textBody: `mensaje-${id}`,
    status: 'received', timestamp: at, createdAt: at, ...patch,
  }
}
function conversation(id = 20, unreadCount = 0): WhatsAppConversation {
  return {
    id, branchId: 1, isCentralChannel: false, hasWhatsAppIdentity: false,
    status: 'open', attentionMode: 'human', unreadCount,
    createdAt: at, updatedAt: at, attentionModeUpdatedAt: at,
  }
}
function payload(msg: WhatsAppMessage, unreadCount = 0): WhatsAppRealtimeMessagePayload {
  return { branchId: 1, conversation: conversation(msg.conversationId, unreadCount), message: msg }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { resolve, reject, promise }
}
type Response = { data: { items: WhatsAppMessage[]; nextCursor: string | null; hasMore: boolean } }
const response = (...messages: WhatsAppMessage[]): Response => ({ data: { items: messages, nextCursor: null, hasMore: false } })

describe('M30-F02 WhatsApp message history requests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads older pages by cursor, keeps new messages and shares an older request', async () => {
    const older = deferred<Response>()
    api.getMessagesPage.mockResolvedValueOnce({ data: { items: [message(20)], nextCursor: 'older-20', hasMore: true } })
      .mockReturnValueOnce(older.promise)
    const store = useWhatsAppStore()
    await store.fetchMessages(20)
    expect(api.getMessagesPage).toHaveBeenCalledOnce()
    const first = store.fetchMessages(20, true), second = store.fetchMessages(20, true)
    expect(api.getMessagesPage).toHaveBeenCalledTimes(2)
    expect(api.getMessagesPage.mock.calls[1][2]).toBe('older-20')
    store.applyRealtimeMessage(payload(message(21), 1))
    older.resolve(response(message(1)))
    await Promise.all([first, second])
    expect(store.messages[20].map(item => item.id)).toEqual([1, 20, 21])
    expect(store.messageHistory[20].hasMore).toBe(false)
  })

  it('fills a reconnect gap in bounded pages until reaching the retained history', async () => {
    api.getMessagesPage.mockResolvedValueOnce(response(message(1)))
      .mockResolvedValueOnce({ data: { items: [message(3)], nextCursor: 'before-3', hasMore: true } })
      .mockResolvedValueOnce({ data: { items: [message(2)], nextCursor: 'before-2', hasMore: true } })
      .mockResolvedValueOnce(response(message(1)))
    const store = useWhatsAppStore()
    await store.fetchMessages(20)
    await store.fetchMessages(20)
    expect(store.messages[20].map(item => item.id)).toEqual([1, 2, 3])
    expect(api.getMessagesPage).toHaveBeenCalledTimes(4)
  })

  it('shares one HTTP for concurrent requests to the same conversation and permits a later refresh', async () => {
    const pending = deferred<Response>()
    api.getMessagesPage.mockReturnValueOnce(pending.promise).mockResolvedValue(response(message(2)))
    const store = useWhatsAppStore()
    const first = store.fetchMessages(20)
    const second = store.fetchMessages(20)
    // Pinia wraps action promises; the invariant is one transport request, not wrapper identity.
    expect(api.getMessagesPage).toHaveBeenCalledTimes(1)
    const signal = api.getMessagesPage.mock.calls[0]?.[1] as AbortSignal
    expect(signal.aborted).toBe(false)
    expect(store.isLoadingMessages).toBe(true)
    pending.resolve(response(message(1)))
    await Promise.all([first, second])
    expect(store.messages[20].map(m => m.id)).toEqual([1])
    expect(store.isLoadingMessages).toBe(false)
    await store.fetchMessages(20)
    expect(api.getMessagesPage).toHaveBeenCalledTimes(2)
    expect(store.messages[20].map(m => m.id)).toEqual([2])
  })

  it('does not lose realtime media/messages arriving while historical HTTP is in flight', async () => {
    const pending = deferred<Response>()
    api.getMessagesPage.mockReturnValue(pending.promise)
    const store = useWhatsAppStore()
    store.conversations = [conversation()]
    const reading = store.fetchMessages(20)
    const image = message(12, 20, {
      type: 'image', textBody: '', mediaUrl: 'https://example.invalid/image.png',
      timestamp: '2026-10-26T12:01:00Z',
    })
    store.applyRealtimeMessage(payload(image, 0), 20)
    pending.resolve(response(message(10)))
    await reading
    expect(store.messages[20].map(m => m.id)).toEqual([10, 12])
    expect(store.messages[20][1].mediaUrl).toBe(image.mediaUrl)
  })

  it('preserves a newer realtime status for an existing message', async () => {
    const pending = deferred<Response>()
    api.getMessagesPage.mockReturnValue(pending.promise)
    const store = useWhatsAppStore()
    const reading = store.fetchMessages(20)
    store.applyRealtimeMessage(payload(message(10, 20, { status: 'read', direction: 'outbound' })), 20)
    pending.resolve(response(message(10, 20, { status: 'sent', direction: 'outbound' })))
    await reading
    expect(store.messages[20]).toHaveLength(1)
    expect(store.messages[20][0].status).toBe('read')
  })

  it('keeps a new unread message unread when an older history response completes', async () => {
    const pending = deferred<Response>()
    api.getMessagesPage.mockReturnValue(pending.promise)
    const store = useWhatsAppStore()
    store.conversations = [conversation()]
    const reading = store.fetchMessages(20)
    store.applyRealtimeMessage(payload(message(11), 1))
    expect(store.unreadTotal).toBe(1)
    pending.resolve(response(message(10)))
    await reading
    expect(store.unreadTotal).toBe(1)
    expect(store.conversations[0].unreadCount).toBe(1)
  })

  it('marks previous unread items as read on an unchanged successful history response', async () => {
    api.getMessagesPage.mockResolvedValue(response(message(10)))
    const store = useWhatsAppStore()
    store.conversations = [conversation(20, 3)]
    store.unreadSummary = { totalUnread: 3, unreadConversations: 1, latestMessageAt: at }
    await store.fetchMessages(20)
    expect(store.conversations[0].unreadCount).toBe(0)
    expect(store.unreadTotal).toBe(0)
  })

  it('an auth/session clear aborts old HTTP and late resolution cannot restore prior messages', async () => {
    const pending = deferred<Response>()
    api.getMessagesPage.mockReturnValue(pending.promise)
    const store = useWhatsAppStore()
    const first = store.fetchMessages(20)
    const signal = api.getMessagesPage.mock.calls[0]?.[1] as AbortSignal
    store.clear()
    expect(signal.aborted).toBe(true)
    expect(store.isLoadingMessages).toBe(false)
    pending.resolve(response(message(10)))
    expect(await first).toEqual([])
    expect(store.messages[20]).toBeUndefined()
    expect(store.error).toBeNull()
  })

  it('cannot restore deleted messages after a conversation reset', async () => {
    const pending = deferred<Response>()
    api.getMessagesPage.mockReturnValue(pending.promise)
    api.resetConversationForTesting.mockResolvedValue({ data: conversation() })
    const store = useWhatsAppStore()
    store.conversations = [conversation()]
    const old = store.fetchMessages(20)
    const signal = api.getMessagesPage.mock.calls[0]?.[1] as AbortSignal
    await store.resetConversationForTesting(20)
    expect(signal.aborted).toBe(true)
    expect(store.messages[20]).toEqual([])
    pending.resolve(response(message(10)))
    await old
    expect(store.messages[20]).toEqual([])
  })

  it('preserves the active loading flag across two conversations', async () => {
    const one = deferred<Response>(), two = deferred<Response>()
    api.getMessagesPage.mockReturnValueOnce(one.promise).mockReturnValueOnce(two.promise)
    const store = useWhatsAppStore()
    const first = store.fetchMessages(20), second = store.fetchMessages(21)
    one.resolve(response(message(10)))
    await first
    expect(store.isLoadingMessages).toBe(true)
    two.resolve(response(message(21, 21)))
    await second
    expect(store.isLoadingMessages).toBe(false)
  })

  it('ignores a late error from a cleared session and still allows a fresh request', async () => {
    const old = deferred<Response>(), fresh = deferred<Response>()
    api.getMessagesPage.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const store = useWhatsAppStore()
    const first = store.fetchMessages(20)
    store.clear()
    const second = store.fetchMessages(20)
    old.reject(new Error('obsolete request'))
    expect(await first).toEqual([])
    expect(store.error).toBeNull()
    expect(store.isLoadingMessages).toBe(true)
    fresh.resolve(response(message(21)))
    await second
    expect(store.messages[20].map(m => m.id)).toEqual([21])
    expect(store.isLoadingMessages).toBe(false)
  })

  it('still surfaces real network errors and releases a request for retry', async () => {
    api.getMessagesPage.mockRejectedValueOnce(new Error('network')).mockResolvedValue(response(message(10)))
    const store = useWhatsAppStore()
    await expect(store.fetchMessages(20)).rejects.toThrow('network')
    expect(store.error).toBe('network')
    expect(store.isLoadingMessages).toBe(false)
    await store.fetchMessages(20)
    expect(api.getMessagesPage).toHaveBeenCalledTimes(2)
    expect(store.messages[20][0].id).toBe(10)
    expect(store.error).toBeNull()
  })
})
