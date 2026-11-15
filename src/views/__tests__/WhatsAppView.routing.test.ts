import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { nextTick, type Ref } from 'vue'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { WhatsAppConversation } from '@/types/whatsapp'
import type { User } from '@/types/auth'

const m = vi.hoisted(() => ({
  state: null as unknown as Ref<string>,
  route: null as unknown as { query: Record<string, string> },
  rows: [] as WhatsAppConversation[],
  handlers: new Map<string, (payload: unknown) => void>(),
  confirm: vi.fn(), success: vi.fn(), error: vi.fn(),
  api: { getStatus: vi.fn(), getConversations: vi.fn(), getUnreadSummary: vi.fn(), getOperationalBranches: vi.fn(),
    getQuickReplies: vi.fn(), getMessagesPage: vi.fn(), getOrderDraft: vi.fn(), updateOperationalBranch: vi.fn(), linkConversationCustomer: vi.fn() },
  customer: { getCustomerById: vi.fn(), getCustomerAddresses: vi.fn() },
}))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: m.api }))
vi.mock('@/services/MainAPI/customerApi', () => ({ customerApi: m.customer }))
vi.mock('@/store/auth', async () => {
  const { defineStore } = await import('pinia'), { ref, computed } = await import('vue')
  return { useAuthStore: defineStore('routing-test-auth', () => {
    const user = ref<User | null>(null)
    return { user, isSuperadmin: computed(() => user.value?.role === 'Superadmin'), isAdmin: computed(() => user.value?.role === 'Admin') }
  }) }
})
vi.mock('vue-router', async () => {
  const original = await vi.importActual<typeof import('vue-router')>('vue-router')
  const { reactive } = await import('vue'); m.route = reactive({ query: {} as Record<string, string> })
  return { ...original, useRoute: () => m.route,
    useRouter: () => ({ replace: async (target: { query: Record<string, string> }) => { m.route.query = target.query }, push: vi.fn() }) }
})
vi.mock('@/composables/useSignalR', async () => {
  const { ref } = await import('vue'); m.state = ref('connected')
  return { useSignalR: () => ({ connectionState: m.state, error: ref(null),
    on: (name: string, callback: (payload: unknown) => void) => m.handlers.set(name, callback),
    off: (name: string) => m.handlers.delete(name) }) }
})
vi.mock('@/composables/useNetworkActivityManager', async () => {
  const { ref } = await import('vue'); return { useNetworkActivityManager: () => ({ isPageVisible: ref(true), isUserActive: ref(true) }) }
})
vi.mock('@/composables/useResizableColumns', async () => {
  const { ref } = await import('vue'); return { useResizableColumns: () => ({ leftWidth: ref(320), rightWidth: ref(360), resize: vi.fn(), step: vi.fn() }) }
})
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: m.success, error: m.error }) }))
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ confirmDialog: m.confirm }) }))
import WhatsAppView from '../WhatsAppView.vue'
import { useWhatsAppStore } from '@/store/whatsapp'
import { useAuthStore } from '@/store/auth'

function conversation(id = 1, branchId = 1): WhatsAppConversation {
  return { id, branchId: 1, branchName: 'Origen', isCentralChannel: true, operationalBranchId: branchId,
    operationalBranchName: `Sucursal ${branchId}`, assignedUserId: 7, attentionMode: 'human',
    phoneNumber: '3000000000', contactName: `Chat ${id}`, status: 'open', unreadCount: 0,
    createdAt: '2026-11-15T12:00:00Z', updatedAt: '2026-11-15T12:00:00Z' } as WhatsAppConversation
}
function reply<T>(data: T) { return { data } }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
interface View {
  selectedConversation: WhatsAppConversation | null
  selectedCustomer: { id: number; addresses: unknown[] } | null
  aiOrderDraft: { branchId: number } | null
  inboxError: string
  search: string
  changingOperationalBranch: boolean
  reloadConversations: () => Promise<boolean>
  selectConversation: (conversation: WhatsAppConversation) => Promise<void>
  changeOperationalBranch: (event: Event) => Promise<void>
  linkExistingCustomer: (customer: any) => Promise<void>
}
let pinia: Pinia
const wrappers: VueWrapper[] = []
function mountView() {
  const wrapper = shallowMount(WhatsAppView, { global: { plugins: [pinia], stubs: {
    BaseButton: { props: ['loading', 'disabled'], template: '<button :disabled="loading || disabled"><slot /></button>' },
  } } })
  wrappers.push(wrapper)
  return { wrapper, vm: wrapper.vm as unknown as View }
}
function unmount(wrapper: VueWrapper) { wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1) }
function routing(row: WhatsAppConversation) {
  m.rows = m.rows.map(item => item.id === row.id ? row : item)
  m.handlers.get('WhatsAppConversationRoutingChanged')?.({ branchId: row.operationalBranchId, conversation: row })
}
function inputEvent(value = '2') {
  const input = document.createElement('select')
  input.innerHTML = '<option value="0">Sin asignar</option><option value="1">Uno</option><option value="2">Dos</option>'
  input.value = value
  return { input, event: { target: input } as unknown as Event }
}

describe('M38-F04 view + real Pinia store integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const mock of [...Object.values(m.api), ...Object.values(m.customer)]) mock.mockReset()
    m.confirm.mockReset().mockResolvedValue(true)
    m.handlers.clear(); m.route.query = {}; m.state.value = 'connected'; m.rows = [conversation(), conversation(2)]
    m.api.getStatus.mockResolvedValue(reply({ enabled: true, branchIds: [1, 2] }))
    m.api.getConversations.mockImplementation(async () => reply(m.rows.map(row => ({ ...row }))))
    m.api.getUnreadSummary.mockResolvedValue(reply({ totalUnread: 0, unreadConversations: 0 }))
    m.api.getOperationalBranches.mockResolvedValue(reply([{ id: 1, name: 'Uno' }, { id: 2, name: 'Dos' }]))
    m.api.getQuickReplies.mockResolvedValue(reply([]))
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [], nextCursor: null, hasMore: false }))
    m.api.getOrderDraft.mockImplementation(async (id: number) => reply({ conversationId: id,
      branchId: m.rows.find(row => row.id === id)?.operationalBranchId ?? 1, items: [], activities: [], total: 0 }))
    m.customer.getCustomerById.mockResolvedValue(reply({ id: 3, name: 'Cliente de prueba', addresses: [] }))
    m.customer.getCustomerAddresses.mockResolvedValue(reply([]))
    pinia = createPinia(); setActivePinia(pinia)
    useAuthStore().user = { id: 7, name: 'Test', email: 'test@example.invalid', phone: '', active: true,
      role: 'Superadmin', branchId: 1, branchName: 'Test', accountType: 'personal' }
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  })
  afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount()
    disposePinia(pinia); vi.clearAllTimers(); vi.useRealTimers()
  })

  it('retains a fresh read when a routing event arrives during the initial GET', async () => {
    const first = deferred<ReturnType<typeof reply<WhatsAppConversation[]>>>()
    m.api.getConversations.mockReturnValueOnce(first.promise)
    mountView(); await flushPromises(); expect(m.api.getConversations).toHaveBeenCalledTimes(1)
    routing(conversation(1, 2)); routing(conversation(1, 2))
    first.resolve(reply([conversation()])); await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(2)
    expect(useWhatsAppStore().conversations[0]!.operationalBranchId).toBe(2)
  })

  it('waits for both reads after an early summary error before the trailing refresh', async () => {
    const list = deferred<ReturnType<typeof reply<WhatsAppConversation[]>>>()
    m.api.getConversations.mockReturnValueOnce(list.promise)
    m.api.getUnreadSummary.mockRejectedValueOnce(new Error('summary failed'))
    const { vm } = mountView(); await flushPromises(); routing(conversation(1, 2)); await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(1)
    list.resolve(reply([conversation()])); await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(2)
    expect(m.api.getUnreadSummary).toHaveBeenCalledTimes(2)
    expect(vm.inboxError).toBe(''); expect(useWhatsAppStore().conversations[0]!.operationalBranchId).toBe(2)
  })

  it('coalesces the refresh button and routing events through the same coordinator', async () => {
    const { vm } = mountView(); await flushPromises()
    const list = deferred<ReturnType<typeof reply<WhatsAppConversation[]>>>()
    m.api.getConversations.mockReturnValueOnce(list.promise)
    const refresh = vm.reloadConversations(); await flushPromises()
    routing(conversation(1, 2)); routing(conversation(1, 2)); await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(2)
    list.resolve(reply([conversation()])); await refresh; await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(3)
    expect(useWhatsAppStore().conversations[0]!.operationalBranchId).toBe(2)
  })

  it('aborts old filters immediately and starts new filters without waiting for old HTTP', async () => {
    const { wrapper, vm } = mountView(); await flushPromises()
    const old = deferred<ReturnType<typeof reply<WhatsAppConversation[]>>>()
    m.api.getConversations.mockReturnValueOnce(old.promise)
    const pending = vm.reloadConversations(); await flushPromises()
    const signal = m.api.getConversations.mock.calls[1]![1] as AbortSignal
    await wrapper.get('input[type="search"]').setValue('Chat 2')
    expect(signal.aborted).toBe(true)
    m.api.getConversations.mockResolvedValue(reply([conversation(2)]))
    vi.advanceTimersByTime(350); await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(3)
    expect(m.api.getConversations.mock.calls[2]![0].search).toBe('Chat 2')
    old.resolve(reply([conversation()])); await pending; await flushPromises()
    expect(useWhatsAppStore().conversations.map(row => row.id)).toEqual([2])
  })

  it('never reuses an aborted same-key request on A to B to A', async () => {
    const { wrapper, vm } = mountView(); await flushPromises()
    const old = deferred<ReturnType<typeof reply<WhatsAppConversation[]>>>()
    m.api.getConversations.mockReturnValueOnce(old.promise)
    const pending = vm.reloadConversations(); await flushPromises()
    await wrapper.get('input[type="search"]').setValue('temporary')
    await wrapper.get('input[type="search"]').setValue('')
    vi.advanceTimersByTime(350); await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(3)
    old.resolve(reply([])); await pending; await flushPromises()
    expect(useWhatsAppStore().conversations).toHaveLength(2)
  })

  it('does not switch back to a transferred chat after the operator selected another', async () => {
    const { vm } = mountView(); await flushPromises(); await vm.selectConversation(useWhatsAppStore().conversations[0]!)
    const put = deferred<ReturnType<typeof reply<WhatsAppConversation>>>()
    m.api.updateOperationalBranch.mockReturnValue(put.promise)
    const mutation = vm.changeOperationalBranch(inputEvent().event); await flushPromises()
    await vm.selectConversation(useWhatsAppStore().conversations[1]!)
    const calls = m.api.getOrderDraft.mock.calls.length
    m.rows[0] = conversation(1, 2); put.resolve(reply(m.rows[0]!)); await mutation; await flushPromises()
    expect(vm.selectedConversation?.id).toBe(2)
    expect(m.api.getOrderDraft).toHaveBeenCalledTimes(calls)
  })

  it('ignores a confirmed transfer response after unmount without starting another GET', async () => {
    const { wrapper, vm } = mountView(); await flushPromises(); await vm.selectConversation(useWhatsAppStore().conversations[0]!)
    const put = deferred<ReturnType<typeof reply<WhatsAppConversation>>>()
    m.api.updateOperationalBranch.mockReturnValue(put.promise)
    const mutation = vm.changeOperationalBranch(inputEvent().event); await flushPromises()
    const before = m.api.getConversations.mock.calls.length, contexts = m.api.getOrderDraft.mock.calls.length
    unmount(wrapper); put.resolve(reply(conversation(1, 2))); await mutation; await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(before)
    expect(m.api.getOrderDraft).toHaveBeenCalledTimes(contexts)
    expect(m.success).not.toHaveBeenCalled()
  })

  it('locks transfer before confirmation and allows a new attempt after cancel', async () => {
    const { vm } = mountView(); await flushPromises(); await vm.selectConversation(useWhatsAppStore().conversations[0]!)
    const dialog = deferred<boolean>(); m.confirm.mockReturnValueOnce(dialog.promise)
    const first = vm.changeOperationalBranch(inputEvent().event)
    await vm.changeOperationalBranch(inputEvent().event)
    expect(m.confirm).toHaveBeenCalledTimes(1); expect(m.api.updateOperationalBranch).not.toHaveBeenCalled()
    dialog.resolve(false); await first; expect(vm.changingOperationalBranch).toBe(false)
    m.api.updateOperationalBranch.mockImplementation(async () => { m.rows[0] = conversation(1, 2); return reply(m.rows[0]!) })
    await vm.changeOperationalBranch(inputEvent().event); await flushPromises()
    expect(m.api.updateOperationalBranch).toHaveBeenCalledTimes(1)
  })

  it('does not transfer a different selection after the confirmation dialog resolves', async () => {
    const { vm } = mountView(); await flushPromises(); await vm.selectConversation(useWhatsAppStore().conversations[0]!)
    const dialog = deferred<boolean>(); m.confirm.mockReturnValueOnce(dialog.promise)
    const mutation = vm.changeOperationalBranch(inputEvent().event)
    await vm.selectConversation(useWhatsAppStore().conversations[1]!)
    dialog.resolve(true); await mutation
    expect(m.api.updateOperationalBranch).not.toHaveBeenCalled()
  })

  it('invalidates the old branch context and rejects a late draft from that branch', async () => {
    const { vm } = mountView(); await flushPromises()
    const old = deferred<ReturnType<typeof reply<{ branchId: number; items: never[] }>>>()
    m.api.getOrderDraft.mockReturnValueOnce(old.promise)
    const selection = vm.selectConversation(useWhatsAppStore().conversations[0]!); await flushPromises()
    routing(conversation(1, 2)); await flushPromises()
    expect(vm.aiOrderDraft?.branchId).toBe(2)
    old.resolve(reply({ branchId: 1, items: [] })); await selection; await flushPromises()
    expect(vm.aiOrderDraft?.branchId).toBe(2)
    expect(m.api.getOrderDraft).toHaveBeenCalledTimes(2)
    routing(conversation(2, 2)); await flushPromises()
    expect(m.api.getOrderDraft).toHaveBeenCalledTimes(2)
  })

  it('reconciles after a short disconnect even when diagnostics are closed', async () => {
    const { vm } = mountView(); await flushPromises()
    m.state.value = 'reconnecting'; await nextTick()
    m.rows[0] = conversation(1, 2)
    m.state.value = 'connected'; await flushPromises()
    expect(m.api.getConversations).toHaveBeenCalledTimes(2)
    expect(useWhatsAppStore().conversations[0]!.operationalBranchId).toBe(2)
    expect(vm.inboxError).toBe('')
  })

  it('does not mistake an empty addresses array for an incomplete customer', async () => {
    const { vm } = mountView(); await flushPromises()
    await vm.selectConversation({ ...conversation(), customerId: 3 })
    expect(vm.selectedCustomer?.addresses).toEqual([])
    expect(m.customer.getCustomerAddresses).not.toHaveBeenCalled()
    m.api.linkConversationCustomer.mockResolvedValue(reply({ ...conversation(), customerId: 3 }))
    await vm.linkExistingCustomer({ id: 3, name: 'Cliente de prueba', addresses: [] })
    expect(m.customer.getCustomerAddresses).not.toHaveBeenCalled()
  })

  it('preserves the address fallback for older incomplete customer responses', async () => {
    const { vm } = mountView(); await flushPromises()
    m.customer.getCustomerById.mockResolvedValue(reply({ id: 3, name: 'Legacy' }))
    m.customer.getCustomerAddresses.mockResolvedValue(reply([{ id: 9, isPrimary: true }]))
    await vm.selectConversation({ ...conversation(), customerId: 3 })
    expect(m.customer.getCustomerAddresses).toHaveBeenCalledTimes(1)
    expect(vm.selectedCustomer?.addresses).toEqual([{ id: 9, isPrimary: true }])
  })

  it('keeps a confirmed transfer when its follow-up read fails, with a retryable warning', async () => {
    const { vm } = mountView(); await flushPromises(); await vm.selectConversation(useWhatsAppStore().conversations[0]!)
    m.api.updateOperationalBranch.mockImplementation(async () => { m.rows[0] = conversation(1, 2); return reply(m.rows[0]!) })
    m.api.getConversations.mockRejectedValueOnce(new Error('GET failed'))
    const { event, input } = inputEvent()
    await vm.changeOperationalBranch(event); await flushPromises()
    expect(vm.selectedConversation?.operationalBranchId).toBe(2); expect(input.value).toBe('2')
    expect(m.success).toHaveBeenCalledWith('Sucursal operativa actualizada', 2200)
    expect(m.error).toHaveBeenCalledWith('Sucursal actualizada', expect.stringContaining('El cambio se guardó'))
    expect(vm.inboxError).not.toBe('')
    await vm.reloadConversations(); expect(vm.inboxError).toBe('')
    expect(m.api.updateOperationalBranch).toHaveBeenCalledTimes(1)
  })

  it('stops the initial-load continuation after leaving the page', async () => {
    const status = deferred<ReturnType<typeof reply<{ enabled: boolean; branchIds: number[] }>>>()
    m.api.getStatus.mockReturnValue(status.promise)
    const { wrapper } = mountView(); await flushPromises(); unmount(wrapper)
    status.resolve(reply({ enabled: true, branchIds: [1] })); await flushPromises()
    expect(m.api.getConversations).not.toHaveBeenCalled()
    expect(m.api.getOperationalBranches).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores old transfer state after logout', async () => {
    const { vm } = mountView(); await flushPromises(); await vm.selectConversation(useWhatsAppStore().conversations[0]!)
    const put = deferred<ReturnType<typeof reply<WhatsAppConversation>>>()
    m.api.updateOperationalBranch.mockReturnValue(put.promise)
    const mutation = vm.changeOperationalBranch(inputEvent().event); await flushPromises()
    useAuthStore().user = null
    put.resolve(reply(conversation(1, 2))); await mutation; await flushPromises()
    expect(vm.selectedConversation).toBeNull(); expect(useWhatsAppStore().conversations).toEqual([])
    expect(m.success).not.toHaveBeenCalled()
  })
})
