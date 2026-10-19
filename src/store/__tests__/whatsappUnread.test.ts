import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth'
import { useWhatsAppStore } from '@/store/whatsapp'
import type { WhatsAppStatus, WhatsAppUnreadSummary } from '@/types/whatsapp'

const api = vi.hoisted(() => ({ getStatus: vi.fn(), getUnreadSummary: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}
const enabled: WhatsAppStatus = { enabled: true, branchIds: [1] }
const unread: WhatsAppUnreadSummary = { totalUnread: 5, unreadConversations: 2, latestMessageAt: '2026-10-18T12:00:00Z' }
const activeStore = () => {
  const store = useWhatsAppStore()
  store.status = enabled
  return store
}

describe('WhatsApp inbox requests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('shares concurrent status requests and preserves the existing freshness cache', async () => {
    const pending = deferred<{ data: WhatsAppStatus }>()
    api.getStatus.mockReturnValue(pending.promise)
    const store = useWhatsAppStore()
    const first = store.ensureStatus()
    const second = store.refreshStatus()
    expect(api.getStatus).toHaveBeenCalledTimes(1)
    pending.resolve({ data: enabled })
    await Promise.all([first, second])
    expect(store.enabled).toBe(true)
    await store.ensureStatus()
    expect(api.getStatus).toHaveBeenCalledTimes(1)
  })

  it('shares concurrent unread requests without caching subsequent explicit refreshes', async () => {
    const pending = deferred<{ data: WhatsAppUnreadSummary }>()
    api.getUnreadSummary.mockReturnValueOnce(pending.promise).mockResolvedValue({ data: unread })
    const store = activeStore()
    const first = store.fetchUnreadSummary()
    const second = store.fetchUnreadSummary()
    expect(api.getUnreadSummary).toHaveBeenCalledTimes(1)
    pending.resolve({ data: unread })
    await Promise.all([first, second])
    expect(store.unreadSummary).toEqual(unread)
    await store.fetchUnreadSummary()
    expect(api.getUnreadSummary).toHaveBeenCalledTimes(2)
  })

  it('releases failed requests so both endpoints can be retried', async () => {
    api.getStatus.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: enabled })
    api.getUnreadSummary.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: unread })
    const store = activeStore()
    await expect(store.refreshStatus()).rejects.toThrow('offline')
    expect(store.enabled).toBe(true)
    await store.refreshStatus()
    await expect(store.fetchUnreadSummary()).rejects.toThrow('offline')
    await store.fetchUnreadSummary()
    expect(api.getStatus).toHaveBeenCalledTimes(2)
    expect(api.getUnreadSummary).toHaveBeenCalledTimes(2)
    expect(store.error).toBeNull()
    expect(store.unreadTotal).toBe(5)
  })

  it('ignores late responses after the branch-scoped clear', async () => {
    const statusPending = deferred<{ data: WhatsAppStatus }>()
    const unreadPending = deferred<{ data: WhatsAppUnreadSummary }>()
    api.getStatus.mockReturnValue(statusPending.promise)
    api.getUnreadSummary.mockReturnValue(unreadPending.promise)
    const store = activeStore()
    const first = store.refreshStatus()
    const second = store.fetchUnreadSummary()
    store.clear()
    statusPending.resolve({ data: enabled })
    unreadPending.resolve({ data: unread })
    await Promise.all([first, second])
    expect(store.status).toBeNull()
    expect(store.unreadTotal).toBe(0)
    expect(store.isLoadingStatus).toBe(false)
  })

  it('does not let an old status cleanup release a newer in-flight request', async () => {
    const old = deferred<{ data: WhatsAppStatus }>()
    const next = deferred<{ data: WhatsAppStatus }>()
    api.getStatus.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
    const store = useWhatsAppStore()
    const first = store.refreshStatus()
    store.clear()
    const second = store.refreshStatus()
    old.resolve({ data: enabled })
    await first
    expect(store.isLoadingStatus).toBe(true)
    const third = store.ensureStatus()
    expect(api.getStatus).toHaveBeenCalledTimes(2)
    next.resolve({ data: { enabled: true, branchIds: [2] } })
    await Promise.all([second, third])
    expect(store.enabledBranchIds).toEqual([2])
  })

  it('clears cached status and pending summaries when the authenticated user changes', async () => {
    const auth = useAuthStore()
    auth.user = { id: 1 } as NonNullable<typeof auth.user>
    const store = activeStore()
    const pending = deferred<{ data: WhatsAppUnreadSummary }>()
    api.getUnreadSummary.mockReturnValue(pending.promise)
    const first = store.fetchUnreadSummary()
    auth.user = { id: 2 } as NonNullable<typeof auth.user>
    expect(store.status).toBeNull()
    pending.resolve({ data: unread })
    await first
    expect(store.unreadTotal).toBe(0)
  })

  it('does not overwrite a newer realtime unread update with an older HTTP snapshot', async () => {
    const pending = deferred<{ data: WhatsAppUnreadSummary }>()
    api.getUnreadSummary.mockReturnValue(pending.promise)
    const store = activeStore()
    const first = store.fetchUnreadSummary()
    store.applyRealtimeMessage({
      branchId: 1,
      conversation: {
        id: 20, branchId: 1, phoneNumber: 'test', status: 'open', unreadCount: 1,
        createdAt: '2026-10-18T12:01:00Z', updatedAt: '2026-10-18T12:01:00Z',
        attentionMode: 'ai', attentionModeUpdatedAt: '2026-10-18T12:01:00Z',
      },
      message: {
        id: 10, conversationId: 20, direction: 'inbound', type: 'text', textBody: 'Test', status: 'received',
        timestamp: '2026-10-18T12:01:00Z', createdAt: '2026-10-18T12:01:00Z',
      },
    })
    pending.resolve({ data: { totalUnread: 0, unreadConversations: 0, latestMessageAt: null } })
    await first
    expect(store.unreadTotal).toBe(1)
  })

  it('does not query a disabled inbox or revive its unread count from a pending response', async () => {
    const store = useWhatsAppStore()
    await store.fetchUnreadSummary()
    expect(api.getUnreadSummary).not.toHaveBeenCalled()
    store.status = enabled
    const pending = deferred<{ data: WhatsAppUnreadSummary }>()
    api.getUnreadSummary.mockReturnValue(pending.promise)
    const first = store.fetchUnreadSummary()
    api.getStatus.mockResolvedValue({ data: { enabled: false, branchIds: [] } })
    await store.refreshStatus()
    pending.resolve({ data: unread })
    await first
    expect(store.unreadTotal).toBe(0)
    expect(store.enabled).toBe(false)
  })
})
