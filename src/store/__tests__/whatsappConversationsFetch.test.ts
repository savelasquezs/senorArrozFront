import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWhatsAppStore } from '../whatsapp'
import type { WhatsAppConversation } from '@/types/whatsapp'

const api = vi.hoisted(() => ({ getConversations: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))
const conversation = (id: number) => ({ id, branchId: 1, unreadCount: 0, status: 'open', attentionMode: 'human' }) as WhatsAppConversation
function deferred() {
    let resolve!: (value: { data: WhatsAppConversation[] }) => void
    const promise = new Promise<{ data: WhatsAppConversation[] }>(done => { resolve = done })
    return { resolve, promise }
}
describe('WhatsApp conversation ownership', () => {
    beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks() })
    it('shares equivalent reads and ignores an old search even if its transport completes', async () => {
        const old = deferred(), latest = deferred()
        api.getConversations.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
        const store = useWhatsAppStore()
        const first = store.fetchConversations({ search: 'a' })
        const shared = store.fetchConversations({ search: 'a' })
        expect(api.getConversations).toHaveBeenCalledOnce()
        const signal = api.getConversations.mock.calls[0][1] as AbortSignal
        const second = store.fetchConversations({ search: 'b' })
        expect(signal.aborted).toBe(true)
        latest.resolve({ data: [conversation(2)] }); await second
        old.resolve({ data: [conversation(1)] }); await Promise.all([first, shared])
        expect(store.conversations.map(item => item.id)).toEqual([2])
        expect(store.isLoadingConversations).toBe(false)
    })
    it('cannot restore conversations after clearing the session', async () => {
        const old = deferred()
        api.getConversations.mockReturnValue(old.promise)
        const store = useWhatsAppStore()
        const request = store.fetchConversations()
        store.clear()
        old.resolve({ data: [conversation(1)] }); await request
        expect(store.conversations).toEqual([])
        expect(store.isLoadingConversations).toBe(false)
    })
})
