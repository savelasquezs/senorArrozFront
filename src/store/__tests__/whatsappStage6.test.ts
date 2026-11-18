import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWhatsAppStore } from '../whatsapp'
import type { WhatsAppConversation, WhatsAppMessage } from '@/types/whatsapp'

const api = vi.hoisted(() => ({ getConversationPage: vi.fn(), getMessagesPage: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))
const conversation = (id: number) => ({ id, branchId: 1, unreadCount: 0, attentionMode: 'human', createdAt: '2026-11-05T15:00:00Z' }) as WhatsAppConversation
const message = (id: number, conversationId = 1) => ({ id, conversationId, direction: 'inbound', type: 'text', textBody: String(id), status: 'received', timestamp: '2026-11-05T15:00:00Z', createdAt: '2026-11-05T15:00:00Z' }) as WhatsAppMessage

describe('WhatsApp bounded pagination and history', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks() })

  it('reuses a fresh cached read but revalidates unread conversations, expired data and explicit reconciliation', async () => {
    let now = 100000
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now)
    try {
      const store = useWhatsAppStore()
      store.conversations = [conversation(1)]
      api.getMessagesPage.mockResolvedValue({ data: { items: [message(1)], hasMore: false, nextCursor: null } })
      await store.fetchMessages(1)
      await store.fetchMessages(1, false, false, true)
      expect(api.getMessagesPage).toHaveBeenCalledTimes(1)
      store.conversations[0]!.unreadCount = 1
      await store.fetchMessages(1, false, false, true)
      expect(api.getMessagesPage).toHaveBeenCalledTimes(2)
      now += 15001
      await store.fetchMessages(1, false, false, true)
      await store.fetchMessages(1)
      expect(api.getMessagesPage).toHaveBeenCalledTimes(4)
    } finally { clock.mockRestore() }
  })

  it('appends unique cursor pages and bounds the list while retaining the selected chat', async () => {
    const store = useWhatsAppStore(); store.activateConversation(1)
    let offset = 0
    api.getConversationPage.mockImplementation(async () => {
      const items = Array.from({ length: 50 }, (_, index) => conversation(offset + index + 1)); offset += 50
      return { data: { items, nextCursor: String(offset), hasMore: true } }
    })
    await store.fetchConversations({ inbox: 'mine' })
    for (let index = 0; index < 7; index++) await store.fetchConversations(undefined, true)
    expect(api.getConversationPage.mock.calls[1]?.[2]).toBe('50')
    expect(store.conversations).toHaveLength(300)
    expect(new Set(store.conversations.map(item => item.id)).size).toBe(300)
    expect(store.conversations.some(item => item.id === 1)).toBe(true)
    expect(store.conversationWindowed).toBe(true)
    await store.fetchConversations({ inbox: 'mine' })
    expect(store.conversationWindowed).toBe(false)
    expect(api.getConversationPage.mock.calls[api.getConversationPage.mock.calls.length - 1]?.[2]).toBeUndefined()
  })

  it('retains at most 12 message threads, pins the active one and bounds automatic message insertion', () => {
    const store = useWhatsAppStore(); store.activateConversation(1)
    for (let id = 1; id <= 30; id++) store.upsertMessage(id, message(id, id))
    expect(Object.keys(store.messages).length).toBeLessThanOrEqual(12)
    expect(store.messages[1]).toBeDefined()
    for (let id = 1; id <= 600; id++) store.upsertMessage(1, message(id))
    expect(store.messages[1]).toHaveLength(500)
    expect(store.messages[1]?.[0]?.id).toBe(101)
    expect(store.messages[1]?.[499]?.id).toBe(600)
  })

  it('aborts a stale message request when selecting another chat and ignores a late completion', async () => {
    const store = useWhatsAppStore(); store.activateConversation(1)
    let finish!: (value: unknown) => void
    api.getMessagesPage.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    const pending = store.fetchMessages(1)
    const signal = api.getMessagesPage.mock.calls[0]?.[1] as AbortSignal
    store.activateConversation(2)
    expect(signal.aborted).toBe(true)
    finish({ data: { items: [message(10)], nextCursor: null, hasMore: false } }); await pending
    expect(store.messages[1]).toBeUndefined()
    expect(store.isLoadingMessages).toBe(false)
  })

  it('bounds reconnect catch-up and keeps the server cursor for the remaining history', async () => {
    const store = useWhatsAppStore()
    store.messages[1] = [message(1)]
    let page = 0
    api.getMessagesPage.mockImplementation(async () => {
      page++
      return { data: { items: Array.from({ length: 50 }, (_, index) => message(10000 - page * 50 + index)), nextCursor: String(page), hasMore: true } }
    })
    await store.fetchMessages(1)
    expect(api.getMessagesPage.mock.calls.length).toBeLessThanOrEqual(10)
    expect(store.messages[1]?.length).toBeLessThanOrEqual(500)
    expect(store.messageHistory[1]?.hasMore).toBe(true)
  })

  it('slides an old-history window and explicitly returns to recent messages without gaps', async () => {
    const store = useWhatsAppStore()
    store.messages[1] = Array.from({ length: 500 }, (_, index) => message(1000 + index))
    store.messageHistory[1] = { nextCursor: 'older', hasMore: true }
    api.getMessagesPage.mockResolvedValueOnce({ data: { items: Array.from({ length: 50 }, (_, index) => message(950 + index)), nextCursor: 'oldest', hasMore: true } })
    await store.fetchMessages(1, true)
    expect(store.messages[1]).toHaveLength(500)
    expect(store.messageHistory[1]?.hasMoreRecent).toBe(true)
    api.getMessagesPage.mockResolvedValueOnce({ data: { items: [message(1500)], nextCursor: '1499', hasMore: true } })
    await store.fetchMessages(1, false, true)
    expect(store.messages[1]?.map(item => item.id)).toEqual([1500])
    expect(store.messageHistory[1]?.hasMoreRecent).not.toBe(true)
    expect(store.messageHistory[1]?.nextCursor).toBe('1499')
  })
})
