import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { nextTick, type Ref } from 'vue'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { WhatsAppCommercialDraft, WhatsAppConversation } from '@/types/whatsapp'
import type { User } from '@/types/auth'

const m = vi.hoisted(() => ({
  state: null as unknown as Ref<string>,
  route: null as unknown as { query: Record<string, string> },
  rows: [] as WhatsAppConversation[],
  handlers: new Map<string, (payload: unknown) => void>(),
  confirm: vi.fn(), success: vi.fn(), error: vi.fn(), reconcile: vi.fn(), sendProductChoices: vi.fn(), applyProductSuggestion: vi.fn(),
  hasDraftProducts: false, saveBeforeFinishing: vi.fn(),
  api: { getStatus: vi.fn(), getConversations: vi.fn(), getConversation: vi.fn(), getUnreadSummary: vi.fn(), getOperationalBranches: vi.fn(),
    getInboxLabels: vi.fn(), getInboxSummary: vi.fn(), setInboxLabel: vi.fn(),
    getQuickReplies: vi.fn(), createQuickReply: vi.fn(), updateQuickReply: vi.fn(), getMessagesPage: vi.fn(), getOrderDraft: vi.fn(), updateOperationalBranch: vi.fn(), linkConversationCustomer: vi.fn(),
    sendMessage: vi.fn(), sendQuickReply: vi.fn(), previewQuickReply: vi.fn(), changeAttention: vi.fn(), getAttention: vi.fn(),
    reactToMessage: vi.fn(), hideMessage: vi.fn(),
    getCommercialProductGroups: vi.fn(), getProductSuggestions: vi.fn() },
  customer: { getCustomerById: vi.fn(), getCustomerAddresses: vi.fn() },
}))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: {
  ...m.api,
  getConversationPage: async (filters: unknown, signal?: AbortSignal) => {
    const result = await m.api.getConversations(filters, signal)
    return { data: { items: result.data, nextCursor: null, hasMore: false } }
  },
  getCommercialDraft: async () => ({ data: null }),
}}))
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
import WhatsAppOrderPanel from '@/components/whatsapp/WhatsAppOrderPanel.vue'
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
  inboxError: string
  search: string
  changingOperationalBranch: boolean
  reloadConversations: () => Promise<boolean>
  selectConversation: (conversation: WhatsAppConversation) => Promise<void>
  changeOperationalBranch: (event: Event) => Promise<void>
}
let pinia: Pinia
const wrappers: VueWrapper[] = []
function mountView(realTabs = false) {
  const wrapper = shallowMount(WhatsAppView, { global: { plugins: [pinia], stubs: {
    BaseButton: { props: ['loading', 'disabled'], template: '<button :disabled="loading || disabled"><slot /></button>' },
    KeepAlive: { template: '<slot />' },
    WhatsAppInboxTabs: !realTabs,
    WhatsAppMessageActions: false,
    BaseDialog: { props: ['modelValue', 'title'], template: '<div v-if="modelValue" :aria-label="title"><slot /></div>' },
    WhatsAppOrderPanel: { props: ['conversation'], data: () => ({ hasDraftProducts: m.hasDraftProducts }), mounted() {
      this.$emit('product-suggestion-state', { conversationId: this.conversation.id, branchId: null, version: null,
        canApply: true, applied: new Set() })
    }, methods: { reconcile: m.reconcile, sendProductChoices: m.sendProductChoices, saveBeforeFinishing: m.saveBeforeFinishing,
      applyProductSuggestion: m.applyProductSuggestion }, template: '<div />' },
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
    m.hasDraftProducts = false
    m.saveBeforeFinishing.mockReset().mockResolvedValue(undefined)
    m.handlers.clear(); m.route.query = {}; m.state.value = 'connected'; m.rows = [conversation(), conversation(2)]
    m.api.getStatus.mockResolvedValue(reply({ enabled: true, branchIds: [1, 2] }))
    m.api.getConversations.mockImplementation(async () => reply(m.rows.map(row => ({ ...row }))))
    m.api.getUnreadSummary.mockResolvedValue(reply({ totalUnread: 0, unreadConversations: 0 }))
    m.api.getInboxLabels.mockResolvedValue(reply([{ key: 'supplier', name: 'Proveedor', editable: true }]))
    m.api.getInboxSummary.mockResolvedValue(reply({ free: { pendingOrders: 0, unreadConversations: 0 }, mine: { pendingOrders: 1, unreadConversations: 0 },
      team: { pendingOrders: 7, unreadConversations: 2 }, closed: { pendingOrders: 0, unreadConversations: 1 } }))
    m.api.getOperationalBranches.mockResolvedValue(reply([{ id: 1, name: 'Uno' }, { id: 2, name: 'Dos' }]))
    m.api.getQuickReplies.mockResolvedValue(reply([]))
    m.api.getCommercialProductGroups.mockResolvedValue(reply([]))
    m.api.getProductSuggestions.mockResolvedValue(reply({ branchId: 1, messages: [] }))
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
    localStorage.removeItem('whatsapp:theme:7')
    disposePinia(pinia); vi.clearAllTimers(); vi.useRealTimers()
  })

  it('persists the WhatsApp theme per cashier without replacing an open chat or losing its text', async () => {
    const { wrapper, vm } = mountView(true)
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const input = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await input.setValue('Mensaje en preparación')
    expect(wrapper.get('[data-wa-theme]').attributes('data-wa-theme')).toBe('light')

    await wrapper.get('[aria-label="Tema de WhatsApp"] button:nth-child(2)').trigger('click')
    expect(wrapper.get('[data-wa-theme]').attributes('data-wa-theme')).toBe('dark')
    expect(input.element.value).toBe('Mensaje en preparación')
    expect(vm.selectedConversation?.id).toBe(1)
    expect(localStorage.getItem('whatsapp:theme:7')).toBe('dark')

    const operator = useAuthStore().user!
    useAuthStore().user = { ...operator, id: 8 }
    await nextTick()
    expect(wrapper.get('[data-wa-theme]').attributes('data-wa-theme')).toBe('light')
    useAuthStore().user = operator
    await nextTick()
    expect(wrapper.get('[data-wa-theme]').attributes('data-wa-theme')).toBe('dark')
  })

  it('keeps the full team counts visible when filtering the paginated list by a label', async () => {
    const { wrapper } = mountView(true)
    await flushPromises()
    expect(wrapper.get('[role="tablist"]').text()).toContain('7 sin pedido')
    expect(wrapper.get('[title="2 conversaciones sin leer"]').exists()).toBe(true)
    await wrapper.get('select[aria-label="Filtrar por etiqueta"]').setValue('supplier')
    await flushPromises()
    expect(m.api.getConversations).toHaveBeenLastCalledWith(expect.objectContaining({ label: 'supplier' }), expect.anything())
    expect(wrapper.get('[role="tablist"]').text()).toContain('7 sin pedido')
  })

  it('shows prominent color-coded labels in the sidebar before opening a chat', async () => {
    const catalog = deferred<ReturnType<typeof reply<{ key: string; name: string; editable: boolean }[]>>>()
    m.rows = [{ ...conversation(), assignedUserId: null,
      labels: ['supplier', 'pending', 'taken', 'payment_pending', 'branch:2'] }]
    m.api.getInboxLabels.mockReturnValueOnce(catalog.promise)
    const { wrapper } = mountView(true)
    await flushPromises()

    const labels = wrapper.get('[data-test="inbox-conversation-labels"]')
    expect(wrapper.find('[data-test="whatsapp-chat-header"]').exists()).toBe(false)
    expect(labels.findAll('button').map(label => label.attributes('aria-label') ?? label.text())).toEqual([
      'Proveedor', 'Pendiente', 'Tomado', 'Pendiente de pago', 'Sucursal 2',
    ])
    expect(labels.findAll('button').slice(0, 2).map(label => label.text())).toEqual(['PR', 'PE'])
    expect(labels.get('summary').text()).toBe('+3')
    expect(labels.findAll('button').map(label => label.classes().find(name => name.startsWith('bg-')))).toEqual([
      'bg-violet-700', 'bg-amber-300', 'bg-emerald-700', 'bg-rose-700', 'bg-blue-700',
    ])

    catalog.resolve(reply([{ key: 'branch:2', name: 'Manrique', editable: false }]))
    await flushPromises()
    expect(labels.text()).toContain('Manrique')
  })

  it('toggles a sidebar label filter without opening its chat', async () => {
    m.rows = [
      { ...conversation(), assignedUserId: null, labels: ['supplier'] },
      { ...conversation(2), assignedUserId: null, labels: ['pending'] },
    ]
    const { wrapper } = mountView(true)
    await flushPromises()
    const supplier = () => wrapper.findAll('[data-test="inbox-conversation-labels"] button')
      .find(label => label.attributes('aria-label') === 'Proveedor')

    expect(supplier()?.exists()).toBe(true)
    await supplier()!.trigger('click')
    await flushPromises()
    expect(supplier()?.attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('[data-test="inbox-conversation-labels"]')).toHaveLength(1)
    expect(m.api.getConversations).toHaveBeenLastCalledWith(expect.objectContaining({ label: 'supplier' }), expect.anything())
    expect(m.route.query.label).toBe('supplier')
    expect(wrapper.find('[data-test="whatsapp-chat-header"]').exists()).toBe(false)

    await supplier()!.trigger('click')
    await flushPromises()
    expect(supplier()?.attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll('[data-test="inbox-conversation-labels"]')).toHaveLength(2)
    expect(m.route.query.label).toBeUndefined()
  })

  it('keeps the editable summary after order confirmation and sends it on request', async () => {
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0], customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    await nextTick()
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await composer.setValue('Hola, Santiago.')
    const panel = wrapper.getComponent(WhatsAppOrderPanel)
    panel.vm.$emit('draft-message', 1, 'El total serían $ 13.500.')
    await nextTick()
    expect(composer.element.value).toBe('Hola, Santiago.\n\nEl total serían $ 13.500.')
    const edited = 'Hola, Santiago. Tu pedido queda en $ 13.500.'
    await composer.setValue(edited)
    panel.vm.$emit('change', { conversationId: 1, status: 'completed', orderId: 501, commercialStatus: 'order_taken' } as WhatsAppCommercialDraft)
    await nextTick()
    expect(composer.element.value).toBe(edited)
    expect(m.api.sendMessage).not.toHaveBeenCalled()
    m.api.sendMessage.mockResolvedValueOnce(reply(null))
    await composer.trigger('keydown.enter')
    await flushPromises()
    expect(m.api.sendMessage).toHaveBeenCalledExactlyOnceWith(1, edited)
  })

  it('opens the catalog quick reply and sends the selected group through the order panel', async () => {
    m.api.getCommercialProductGroups.mockResolvedValue(reply([
      { id: 6, name: 'Arroz Paisa', isRice: true, shortcut: 'paisasin' },
      { id: 15, name: 'Papas a la francesa', isRice: false, shortcut: 'papas' },
      { id: 14, name: 'Yuca', isRice: false, shortcut: 'yucas' },
    ]))
    m.sendProductChoices.mockResolvedValueOnce([])
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0], customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    await nextTick()
    const quickReply = wrapper.findAll('button').find(item => item.text() === 'Elegir presentación')!
    await quickReply.trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[aria-label="Enviar opciones de producto"]')
    const selector = dialog.get('select')
    expect(selector.text()).toContain('Arroz Paisa')
    expect(selector.text()).toContain('Papas a la francesa')
    expect(selector.text()).toContain('Yuca')
    await selector.setValue('14')
    await dialog.get('form').trigger('submit')
    await flushPromises()
    expect(m.sendProductChoices).toHaveBeenCalledWith(14)
    expect(wrapper.find('[aria-label="Enviar opciones de producto"]').exists()).toBe(false)
  })

  it('shows the catalog quick replies and sends the exact family from the typed command', async () => {
    m.api.getCommercialProductGroups.mockResolvedValue(reply([
      { id: 2, name: 'Arroz Paisa con Chicharrón', isRice: true, shortcut: 'paisacon' },
      { id: 6, name: 'Arroz Paisa', isRice: true, shortcut: 'paisasin' },
      { id: 1, name: 'Arroz Ropa Vieja con Chicharrón', isRice: true, shortcut: 'ropaviejacon' },
      { id: 4, name: 'Arroz Ropa Vieja', isRice: true, shortcut: 'ropaviejasin' },
      { id: 15, name: 'Papas a la francesa', isRice: false, shortcut: 'papas' },
      { id: 14, name: 'Yuca', isRice: false, shortcut: 'yucas' },
    ]))
    m.sendProductChoices.mockResolvedValueOnce([])
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0], customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    await nextTick()
    await wrapper.get('button[aria-label="Crear o editar respuestas rápidas"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="Respuestas rápidas"]').text()).toContain('/ropaviejacon')
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await composer.setValue('/paisa')
    expect(wrapper.text()).toContain('/paisacon')
    expect(wrapper.text()).toContain('/paisasin')
    await composer.setValue('/paisacon')
    await composer.trigger('keydown.enter')
    await flushPromises()
    expect(m.sendProductChoices).toHaveBeenCalledExactlyOnceWith(2)
    expect(m.api.sendMessage).not.toHaveBeenCalled()
    expect(composer.element.value).toBe('')
  })

  it('uses Tab for one catalog name match and keeps the command on a simulated send failure', async () => {
    m.api.getCommercialProductGroups.mockResolvedValue(reply([
      { id: 2, name: 'Arroz Paisa con Chicharrón', isRice: true, shortcut: 'paisacon' },
      { id: 6, name: 'Arroz Paisa', isRice: true, shortcut: 'paisasin' },
    ]))
    m.sendProductChoices.mockRejectedValueOnce(new Error('No se pudo enviar')).mockResolvedValueOnce([])
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0], customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    for (const query of ['/zzz', '/paisa']) {
      await composer.setValue(query)
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
      composer.element.dispatchEvent(tab)
      expect(tab.defaultPrevented).toBe(false)
    }
    expect(m.sendProductChoices).not.toHaveBeenCalled()
    await composer.setValue('/conchi')
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    composer.element.dispatchEvent(backward)
    expect(backward.defaultPrevented).toBe(false)
    await composer.trigger('keydown', { key: 'Tab' })
    await flushPromises()
    expect(composer.element.value).toBe('/conchi')
    await composer.trigger('keydown', { key: 'Tab' })
    await flushPromises()
    expect(m.sendProductChoices.mock.calls).toEqual([[2], [2]])
    expect(composer.element.value).toBe('')
  })

  it('sends a unique saved reply with Tab and does not send an ambiguous conchi match', async () => {
    m.api.getQuickReplies.mockResolvedValue(reply([
      { id: 12, branchId: 1, shortcut: 'horarios', messageTemplate: 'Abrimos a las 11', isActive: true, usageCount: 0 },
    ]))
    m.api.getCommercialProductGroups.mockResolvedValue(reply([
      { id: 2, name: 'Arroz Paisa con Chicharrón', isRice: true, shortcut: 'paisacon' },
      { id: 1, name: 'Arroz Ropa Vieja con Chicharrón', isRice: true, shortcut: 'ropaviejacon' },
    ]))
    m.api.sendQuickReply.mockResolvedValueOnce(reply(null))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0], customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await composer.setValue('/conchi')
    await composer.trigger('keydown', { key: 'Tab' })
    expect(m.sendProductChoices).not.toHaveBeenCalled()
    expect(m.api.sendQuickReply).not.toHaveBeenCalled()
    await composer.setValue('/hora')
    await composer.trigger('keydown', { key: 'Tab' })
    await flushPromises()
    expect(m.api.sendQuickReply).toHaveBeenCalledExactlyOnceWith(1, 12)
    expect(composer.element.value).toBe('')
  })

  it('takes a free conversation from the read-only composer exactly once', async () => {
    const free = { ...conversation(), assignedUserId: null, attentionMode: 'waitingForHuman' as const,
      attentionRevision: 3, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    m.rows = [free]
    const result = deferred<ReturnType<typeof reply<Partial<WhatsAppConversation>>>>()
    m.api.changeAttention.mockReturnValue(result.promise)
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(free)
    const input = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Doble clic para tomar la conversación"]')
    expect(input.element.readOnly).toBe(true)
    expect(input.element.disabled).toBe(false)
    await input.trigger('dblclick')
    await input.trigger('dblclick')
    expect(m.api.changeAttention).toHaveBeenCalledExactlyOnceWith(1, 'take', 3, undefined, undefined)
    m.rows = [{ ...free, assignedUserId: 7, attentionMode: 'human', attentionRevision: 4 }]
    result.resolve(reply(m.rows[0]!))
    await flushPromises()
    expect(m.route.query.inbox).toBe('mine')
    expect(wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]').element.readOnly).toBe(false)
  })

  it('lets a cashier retake a team chat only after confirming the current advisor', async () => {
    useAuthStore().user!.role = 'Cashier'
    const other = { ...conversation(), assignedUserId: 8, assignedUserName: 'Caja 2', attentionRevision: 3,
      customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    m.rows = [other]
    m.route.query = { inbox: 'team' }
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(other)
    const take = wrapper.get('button[aria-label="Retomar conversación"]')
    expect(wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]').element.disabled).toBe(true)
    m.confirm.mockResolvedValueOnce(false)
    await take.trigger('click')
    await flushPromises()
    expect(m.api.changeAttention).not.toHaveBeenCalled()
    m.api.changeAttention.mockImplementationOnce(async () => {
      m.rows = [{ ...other, assignedUserId: 7, assignedUserName: 'Test', attentionRevision: 4 }]
      return reply(m.rows[0])
    })
    await take.trigger('click')
    await flushPromises()
    expect(m.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ message: expect.stringContaining('Caja 2') }))
    expect(m.api.changeAttention).toHaveBeenCalledExactlyOnceWith(1, 'takeover', 3, undefined, undefined)
    expect(m.route.query.inbox).toBe('mine')
    expect(wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]').element.disabled).toBe(false)
  })

  it('uses the confirmed revision even if another advisor takes the chat while the dialog is open', async () => {
    const other = { ...conversation(), assignedUserId: 8, assignedUserName: 'Caja 2', attentionRevision: 3 }
    m.rows = [other]
    const confirmation = deferred<boolean>()
    m.confirm.mockReturnValueOnce(confirmation.promise)
    m.api.changeAttention.mockRejectedValueOnce(new Error('La conversación cambió.'))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(other)
    await wrapper.get('button[aria-label="Retomar conversación"]').trigger('click')
    const reassigned = { ...other, assignedUserId: 9, assignedUserName: 'Caja 3', attentionRevision: 4 }
    routing(reassigned)
    m.api.getAttention.mockResolvedValue(reply(reassigned))
    confirmation.resolve(true)
    await flushPromises()
    expect(m.api.changeAttention).toHaveBeenCalledExactlyOnceWith(1, 'takeover', 3, undefined, undefined)
    expect(vm.selectedConversation?.assignedUserId).toBe(9)
  })

  it('closes an attended chat and refreshes the counter without reloading the list or thread', async () => {
    const active = { ...conversation(), labels: ['pending'], attentionRevision: 3,
      customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    const delayed = { ...active }
    const closed = { ...active, attentionMode: 'closed' as const, status: 'closed' as const, assignedUserId: null, attentionRevision: 4 }
    m.rows = [active, conversation(2)]
    m.route.query = { inbox: 'mine' }
    const { wrapper, vm } = mountView(true)
    await flushPromises()
    await vm.selectConversation(active)
    const messages = wrapper.get('[data-test="whatsapp-chat-messages"]').element
    const other = wrapper.get('button[aria-label^="Abrir chat con Chat 2"]').element
    const requests = m.api.getConversations.mock.calls.length
    const messagesRequests = m.api.getMessagesPage.mock.calls.length
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('1 sin pedido')
    m.api.changeAttention.mockResolvedValue(reply({ conversationId: 1, attentionMode: 'closed', assignedUserId: null, attentionRevision: 4 }))
    m.api.getInboxSummary.mockResolvedValue(reply({ mine: { pendingOrders: 0, unreadConversations: 0 } }))
    await wrapper.get('button[aria-label="Marcar como atendida"]').trigger('click')
    await flushPromises()
    for (const event of ['WhatsAppConversationRoutingChanged', 'WhatsAppAttentionChanged'])
      m.handlers.get(event)?.({ branchId: 1, previousOperationalBranchId: 1, conversation: { ...closed, labels: undefined } })
    for (const event of ['WhatsAppConversationRoutingChanged', 'WhatsAppAttentionChanged'])
      m.handlers.get(event)?.({ branchId: 1, previousOperationalBranchId: 1, conversation: delayed })
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(m.confirm).not.toHaveBeenCalled()
    expect(m.api.changeAttention).toHaveBeenCalledExactlyOnceWith(1, 'close', 3, undefined, 'Atención finalizada desde el POS')
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('Míos')
    expect(wrapper.find('button[aria-label^="Abrir chat con Chat 1"]').exists()).toBe(false)
    expect(wrapper.get('button[aria-label^="Abrir chat con Chat 2"]').element).toBe(other)
    expect(wrapper.get('[data-test="whatsapp-chat-messages"]').element).toBe(messages)
    expect(wrapper.text()).toContain('Conversación atendida.')
    expect(vm.selectedConversation?.labels).toEqual(['pending'])
    expect(m.api.getConversations).toHaveBeenCalledTimes(requests)
    expect(m.api.getMessagesPage).toHaveBeenCalledTimes(messagesRequests)
    expect(m.reconcile).not.toHaveBeenCalled()
  })

  it('confirms a nonempty draft and only closes after it is saved', async () => {
    m.hasDraftProducts = true
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(m.rows[0]!)
    const check = wrapper.get('button[aria-label="Marcar como atendida"]')
    m.confirm.mockResolvedValueOnce(false)
    await check.trigger('click')
    await flushPromises()
    expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('borrador con productos') }))
    expect(m.saveBeforeFinishing).not.toHaveBeenCalled()
    const save = deferred<void>()
    m.saveBeforeFinishing.mockReturnValueOnce(save.promise)
    m.api.changeAttention.mockResolvedValue(reply({ attentionMode: 'closed', assignedUserId: null, attentionRevision: 1 }))
    await check.trigger('click')
    await flushPromises()
    expect(m.api.changeAttention).not.toHaveBeenCalled()
    save.resolve()
    await flushPromises()
    expect(m.api.changeAttention).toHaveBeenCalledTimes(1)
    expect(vm.selectedConversation?.attentionMode).toBe('closed')
  })

  it('reads only the affected row when a chat enters a filtered closed inbox', async () => {
    m.rows = []
    m.route.query = { inbox: 'closed', label: 'supplier' }
    const { wrapper } = mountView(true)
    await flushPromises()
    const requests = m.api.getConversations.mock.calls.length
    const closed = { ...conversation(), status: 'closed', attentionMode: 'closed', assignedUserId: null, attentionRevision: 4 }
    m.api.getConversation.mockResolvedValue(reply({ ...closed, labels: ['supplier'] }))
    const payload = { branchId: 1, previousOperationalBranchId: 1, conversation: closed }
    m.handlers.get('WhatsAppConversationRoutingChanged')?.(payload)
    m.handlers.get('WhatsAppAttentionChanged')?.(payload)
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(m.api.getConversation).toHaveBeenCalledExactlyOnceWith(1)
    expect(m.api.getConversations).toHaveBeenCalledTimes(requests)
    expect(wrapper.find('button[aria-label^="Abrir chat con Chat 1"]').exists()).toBe(true)
  })

  it('renders shared cards, sends a quoted reply and updates reactions and hidden messages in place', async () => {
    const chat = { ...conversation(), customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    m.rows = [chat]
    const location = { id: 98, conversationId: 1, direction: 'inbound', type: 'location', status: 'received',
      textBody: 'Ubicación compartida', location: { latitude: 6.2, longitude: -75.5, name: 'Punto de prueba' },
      whatsAppMessageId: 'wamid.location', timestamp: '2026-11-19T12:00:00Z', createdAt: '2026-11-19T12:00:00Z' }
    const contact = { ...location, id: 99, type: 'contacts', location: undefined, whatsAppMessageId: 'wamid.contact',
      contacts: [{ name: 'Contacto de prueba', phones: ['+57 300 123 4567'] }] }
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [location, contact], hasMore: false, nextCursor: null }))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(chat)
    expect(wrapper.get('a[href*="maps/search"]').attributes('href')).toContain('6.2%2C-75.5')
    expect(wrapper.get('a[href="tel:+573001234567"]').text()).toBe('+57 300 123 4567')
    const bubble = () => wrapper.get('[data-message-id="98"]')
    const element = bubble().element
    await bubble().get('button[aria-label="Reaccionar"]').trigger('click')
    m.api.reactToMessage.mockResolvedValue(reply({ ...location, businessReaction: '👍' }))
    await bubble().get('button[aria-label="Me gusta"]').trigger('click')
    await flushPromises()
    expect(m.api.reactToMessage).toHaveBeenCalledExactlyOnceWith(1, 98, '👍')
    expect(bubble().get('[aria-label="Reacciones"]').text()).toContain('👍')
    expect(bubble().element).toBe(element)
    await bubble().get('button[aria-label="Responder a este mensaje"]').trigger('click')
    expect(wrapper.get('button[aria-label="Quitar cita"]').exists()).toBe(true)
    const input = wrapper.get('textarea[placeholder="Escribe un mensaje"]')
    await input.setValue('Gracias por la ubicación')
    m.api.sendMessage.mockResolvedValue(reply({ ...location, id: 100, direction: 'outbound', type: 'text', location: undefined,
      replyToWhatsAppMessageId: 'wamid.location', textBody: 'Gracias por la ubicación', whatsAppMessageId: 'wamid.reply', status: 'sent' }))
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(m.api.sendMessage).toHaveBeenCalledExactlyOnceWith(1, 'Gracias por la ubicación', 98)
    expect(wrapper.get('[data-message-id="100"]').text()).toContain('Punto de prueba')
    m.api.hideMessage.mockResolvedValue(reply({ ...location, hiddenSource: 'pos', textBody: '', location: undefined }))
    await bubble().get('button[aria-label="Ocultar en el POS"]').trigger('click')
    await flushPromises()
    expect(m.api.hideMessage).toHaveBeenCalledExactlyOnceWith(1, 98)
    expect(bubble().text()).toContain('Mensaje oculto en el POS')
    expect(bubble().element).toBe(element)
  })

  it('keeps a chat open when the draft cannot be saved', async () => {
    m.hasDraftProducts = true
    m.saveBeforeFinishing.mockRejectedValueOnce(new Error('El borrador cambió.'))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(m.rows[0]!)
    await wrapper.get('button[aria-label="Marcar como atendida"]').trigger('click')
    await flushPromises()
    expect(m.api.changeAttention).not.toHaveBeenCalled()
    expect(m.error).toHaveBeenCalledWith('Atención', 'El borrador cambió.')
    expect(vm.selectedConversation?.assignedUserId).toBe(7)
  })

  it('releases a chat to Libres without reloading or replacing the current tab', async () => {
    const active = { ...conversation(), attentionRevision: 3 }
    m.rows = [active, conversation(2)]
    m.route.query = { inbox: 'mine' }
    const { wrapper, vm } = mountView(true)
    await flushPromises()
    await vm.selectConversation(active)
    const requests = m.api.getConversations.mock.calls.length
    const free = { ...active, attentionMode: 'waitingForHuman' as const, assignedUserId: null, attentionRevision: 4 }
    m.api.changeAttention.mockResolvedValue(reply(free))
    m.api.getInboxSummary.mockResolvedValue(reply({ free: { pendingOrders: 1, unreadConversations: 0 } }))
    await wrapper.get('[data-test="whatsapp-chat-actions"]').findAll('button').find(button => button.text() === 'Soltar')!.trigger('click')
    await flushPromises()
    m.handlers.get('WhatsAppConversationRoutingChanged')?.({ branchId: 1, previousOperationalBranchId: 1, conversation: free })
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(vm.selectedConversation?.attentionMode).toBe('waitingForHuman')
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('Míos')
    expect(wrapper.findAll('[role="tab"]').find(tab => tab.text().includes('Libres'))?.text()).toContain('1 sin pedido')
    expect(wrapper.find('button[aria-label^="Abrir chat con Chat 1"]').exists()).toBe(false)
    expect(m.api.getConversations).toHaveBeenCalledTimes(requests)
  })

  it('prioritizes the exact editable conchi shortcut and inserts its quote without sending', async () => {
    m.api.getQuickReplies.mockResolvedValue(reply([
      { id: 13, branchId: 1, shortcut: 'conchi', messageTemplate: '', replyMode: 'chicharron_quote', isActive: true, usageCount: 0 },
    ]))
    m.api.getCommercialProductGroups.mockResolvedValue(reply([
      { id: 2, name: 'Arroz Paisa con Chicharrón', isRice: true, shortcut: 'paisacon' },
      { id: 1, name: 'Arroz Ropa Vieja con Chicharrón', isRice: true, shortcut: 'ropaviejacon' },
    ]))
    const text = 'Arroz Paisa Súper\nCon chicharrón: $ 77.000\nSin chicharrón: $ 66.000'
    m.api.previewQuickReply.mockResolvedValue(reply({ text }))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const input = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await input.setValue('/con')
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    input.element.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)
    expect(m.api.previewQuickReply).not.toHaveBeenCalled()
    await input.setValue('/conchi')
    expect(wrapper.text()).toContain('Tab para preparar')
    await input.trigger('keydown', { key: 'Tab' })
    await flushPromises()
    expect(m.api.previewQuickReply).toHaveBeenCalledExactlyOnceWith(1, 13, undefined)
    expect(input.element.value).toBe(text)
    expect(m.api.sendQuickReply).not.toHaveBeenCalled()
    expect(m.api.sendMessage).not.toHaveBeenCalled()
    expect(m.sendProductChoices).not.toHaveBeenCalled()
  })

  it('persists the selected quick reply mode when creating and editing a shortcut', async () => {
    const store = useWhatsAppStore()
    const definition = { branchId: 1, shortcut: 'conchi', messageTemplate: '', replyMode: 'chicharron_quote' as const, isActive: true }
    m.api.createQuickReply.mockResolvedValue(reply({ ...definition, id: 13, usageCount: 0 }))
    await store.saveQuickReply(definition)
    expect(m.api.createQuickReply).toHaveBeenCalledExactlyOnceWith(definition)

    const edited = { ...definition, replyMode: 'draft' as const, messageTemplate: 'Hola {{nombre_cliente}}' }
    m.api.updateQuickReply.mockResolvedValue(reply({ ...edited, id: 13, usageCount: 0 }))
    await store.saveQuickReply({ ...edited, id: 13 })
    expect(m.api.updateQuickReply).toHaveBeenCalledExactlyOnceWith(13, edited)
    expect(store.quickReplies[0]?.replyMode).toBe('draft')
  })

  it('opens the quote size picker and discards its late result after switching conversations', async () => {
    m.api.getQuickReplies.mockResolvedValue(reply([
      { id: 13, branchId: 1, shortcut: 'conchi', messageTemplate: '', replyMode: 'chicharron_quote', isActive: true, usageCount: 0 },
    ]))
    const response = deferred<ReturnType<typeof reply<{ text: string }>>>()
    m.api.previewQuickReply.mockResolvedValueOnce(reply({ family: 'paisa', presentations: [
      { family: 'paisa', size: 'personal' }, { family: 'paisa', size: 'super' }, { family: 'ropa vieja', size: 'duo' },
    ] })).mockReturnValueOnce(response.promise)
    const { wrapper, vm } = mountView()
    await flushPromises()
    const open = '2099-01-01T00:00:00Z'
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: open })
    const input = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await input.setValue('/conchi')
    await input.trigger('keydown', { key: 'Tab' })
    await flushPromises()
    const dialog = wrapper.get('[aria-label="Cotizar con y sin chicharrón"]')
    const selects = dialog.findAll('select')
    expect((selects[0]!.element as HTMLSelectElement).value).toBe('paisa')
    await selects[1]!.setValue('super')
    await dialog.get('form').trigger('submit')
    expect(m.api.previewQuickReply).toHaveBeenLastCalledWith(1, 13, { family: 'paisa', size: 'super' })
    await vm.selectConversation({ ...m.rows[1]!, customerServiceWindowExpiresAt: open })
    await wrapper.get('textarea[placeholder="Escribe un mensaje"]').setValue('Otro cliente')
    response.resolve(reply({ text: 'Cotización del chat anterior' }))
    await flushPromises()
    expect(wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]').element.value).toBe('Otro cliente')
    expect(m.api.sendMessage).not.toHaveBeenCalled()
  })

  it('keeps Limpiar Tomado in tools and resets active filters separately', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    const filters = wrapper.get('[aria-label="Filtros de la bandeja"]')
    const tools = wrapper.get('[aria-label="Herramientas de la bandeja"]')
    expect(filters.text()).not.toContain('Limpiar Tomado')
    expect(tools.text()).toContain('Limpiar Tomado')
    await filters.get('select[aria-label="Filtrar por etiqueta"]').setValue('supplier')
    await filters.findAll('button').find(button => button.text() === 'Restablecer filtros')!.trigger('click')
    await flushPromises()
    expect(m.api.getConversations).toHaveBeenLastCalledWith(expect.objectContaining({ label: undefined }), expect.anything())
  })

  it('shows product actions on each eligible message and only prepares a price reply in the composer', async () => {
    const inbound = { conversationId: 1, direction: 'inbound', type: 'text', timestamp: '2026-11-18T13:00:00Z' }
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [
      { ...inbound, id: 90, textBody: 'dos ropa vieja súper con chicharrón' },
      { ...inbound, id: 91, textBody: '¿Cuánto cuesta el paisa dúo?' },
      { ...inbound, id: 92, isHistorical: true, textBody: 'ropa vieja' },
      { ...inbound, id: 93, direction: 'outbound', textBody: 'paisa dúo' },
    ], nextCursor: null, hasMore: false }))
    const add = { kind: 'add', productId: 5, name: 'Ropa vieja Súper', quantity: 2, unitPrice: 66000, available: true, reply: null }
    m.api.getProductSuggestions.mockResolvedValue(reply({ branchId: 1, messages: [
      { messageId: 90, suggestions: [add] },
      { messageId: 91, suggestions: [{ kind: 'reply', productId: 8, reply: 'Paisa Dúo cuesta $ 31.000.' }] },
    ] }))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0], customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    await flushPromises()
    expect(m.api.getProductSuggestions).toHaveBeenCalledWith(1, [90, 91], expect.anything())
    const addButton = wrapper.get('[data-message-id="90"] [aria-label="Sugerencias de productos"] button')
    expect(addButton.text()).toBe('Agregar 2')
    expect(wrapper.get('[data-message-id="90"] [aria-label="Sugerencias de productos"]').text()).toContain('Ropa vieja Súper')
    await addButton.trigger('click')
    expect(m.applyProductSuggestion).toHaveBeenCalledExactlyOnceWith(90, add)
    await wrapper.get('[data-message-id="91"] [aria-label="Sugerencias de productos"] button').trigger('click')
    expect(wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]').element.value)
      .toBe('Paisa Dúo cuesta $ 31.000.')
    expect(m.api.sendMessage).not.toHaveBeenCalled()
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


  it('reconciles the shared order only when the selected conversation is routed', async () => {
    const { vm } = mountView(); await flushPromises()
    await vm.selectConversation(useWhatsAppStore().conversations[0]!)
    routing(conversation(1, 2)); await flushPromises()
    expect(vm.selectedConversation?.operationalBranchId).toBe(2)
    expect(m.reconcile).toHaveBeenCalledTimes(1)
    routing(conversation(2, 2)); await flushPromises()
    expect(m.reconcile).toHaveBeenCalledTimes(1)
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
