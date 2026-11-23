import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { nextTick, type Ref } from 'vue'
import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { Blob as NodeBlob } from 'node:buffer'
import type { WhatsAppCommercialDraft, WhatsAppConversation, WhatsAppMessage } from '@/types/whatsapp'
import type { User } from '@/types/auth'
import type { Customer } from '@/types/customer'

const m = vi.hoisted(() => ({
  state: null as unknown as Ref<string>,
  route: null as unknown as { query: Record<string, string> },
  rows: [] as WhatsAppConversation[],
  handlers: new Map<string, (payload: unknown) => void>(),
  confirm: vi.fn(), success: vi.fn(), error: vi.fn(), reconcile: vi.fn(), sendProductChoices: vi.fn(), applyProductSuggestion: vi.fn(),
  hasDraftProducts: false, saveBeforeFinishing: vi.fn(),
  api: { getStatus: vi.fn(), getConversations: vi.fn(), getConversation: vi.fn(), getUnreadSummary: vi.fn(), getOperationalBranches: vi.fn(),
    getConversationStartOptions: vi.fn(), startConversation: vi.fn(), getOrderConversation: vi.fn(), getOrderDeliverymanContact: vi.fn(),
    getInboxLabels: vi.fn(), getInboxSummary: vi.fn(), setInboxLabel: vi.fn(),
    getQuickReplies: vi.fn(), createQuickReply: vi.fn(), updateQuickReply: vi.fn(), getMessagesPage: vi.fn(), getOrderDraft: vi.fn(), updateOperationalBranch: vi.fn(), linkConversationCustomer: vi.fn(),
    sendMessage: vi.fn(), sendMediaMessage: vi.fn(), sendQuickReply: vi.fn(), previewQuickReply: vi.fn(), changeAttention: vi.fn(), getAttention: vi.fn(),
    reactToMessage: vi.fn(), hideMessage: vi.fn(), downloadSticker: vi.fn(), forwardMessage: vi.fn(),
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
  const { reactive } = await import('vue'); m.route = reactive({ name: 'WhatsApp', query: {} as Record<string, string> })
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
import WhatsAppComposerPicker from '@/components/whatsapp/WhatsAppComposerPicker.vue'
import WhatsAppForwardDialog from '@/components/whatsapp/WhatsAppForwardDialog.vue'
import WhatsAppOrderPanel from '@/components/whatsapp/WhatsAppOrderPanel.vue'
import WhatsAppDeliveryRoutesPanel from '@/components/whatsapp/WhatsAppDeliveryRoutesPanel.vue'
import WhatsAppSupplierOrderDialog from '@/components/whatsapp/WhatsAppSupplierOrderDialog.vue'
import WhatsAppConversationTemplates from '@/components/whatsapp/WhatsAppConversationTemplates.vue'
import WhatsAppVoiceMessage from '@/components/whatsapp/WhatsAppVoiceMessage.vue'
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
function mountView(realTabs = false, attachTo?: HTMLElement) {
  const wrapper = shallowMount(WhatsAppView, { attachTo, global: { plugins: [pinia], stubs: {
    BaseButton: { props: ['loading', 'disabled'], template: '<button :disabled="loading || disabled"><slot /></button>' },
    KeepAlive: { template: '<slot />' },
    WhatsAppInboxTabs: !realTabs,
    WhatsAppMessageActions: false,
    WhatsAppConversationStarter: false,
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

function pasteFiles(input: HTMLTextAreaElement, files: File[]) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: {
    files: [], items: files.map(file => ({ kind: 'file', getAsFile: () => file })),
  } })
  input.dispatchEvent(event)
  return event
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
    vi.unstubAllGlobals()
    localStorage.removeItem('whatsapp:theme:7')
    disposePinia(pinia); vi.clearAllTimers(); vi.useRealTimers()
  })

  it('switches quick contacts across all inboxes and restores the selected tab', async () => {
    m.route.query = { inbox: 'mine' }
    const customerChat = { ...conversation(), assignedUserName: 'Asesor Demo' }
    const deliveryChat: WhatsAppConversation = { ...conversation(2), assignedUserId: null, attentionMode: 'closed',
      operationalContact: { kind: 'deliveryman', name: 'Ana Reparto' }, matchesContactQuickFilter: true }
    const supplierChat: WhatsAppConversation = { ...conversation(3), assignedUserId: 8,
      operationalContact: { kind: 'supplier', name: 'Molino Alba' }, matchesContactQuickFilter: true }
    m.api.getConversations.mockImplementation(async filters => reply(filters.deliverymenAssignedToday ? [deliveryChat]
      : filters.suppliersOnly ? [supplierChat] : [customerChat]))
    const { wrapper } = mountView(true)
    await flushPromises()
    const drivers = wrapper.get('button[aria-label="Domiciliarios con pedidos de hoy"]')
    const suppliers = wrapper.get('button[aria-label="Proveedores"]')
    const resetFilters = () => wrapper.find('button[aria-label="Restablecer filtros"]')
    expect(resetFilters().exists()).toBe(false)
    expect(wrapper.text()).toContain('Atendido por: Asesor Demo')
    await drivers.trigger('click')
    await flushPromises()
    expect(m.api.getConversations).toHaveBeenLastCalledWith(expect.objectContaining({ inbox: undefined, deliverymenAssignedToday: true }), expect.any(AbortSignal))
    expect(wrapper.text()).toContain('Ana Reparto')
    expect(wrapper.text()).toContain('Cerrados')
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    await suppliers.trigger('click')
    await flushPromises()
    expect(drivers.attributes('aria-pressed')).toBe('false')
    expect(suppliers.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Molino Alba')
    expect(wrapper.text()).not.toContain('Ana Reparto')
    await wrapper.get('select[aria-label="Filtrar por etiqueta"]').setValue('supplier')
    await resetFilters().trigger('click')
    await flushPromises()
    expect(resetFilters().exists()).toBe(false)
    expect(m.api.getConversations).toHaveBeenLastCalledWith(expect.objectContaining({ label: undefined, inbox: 'mine' }), expect.any(AbortSignal))
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('Míos')
  })

  it('opens the deliveryman chat or prepares the contact only in the current customer composer', async () => {
    const source = { ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    const courier = { ...m.rows[1]!, operationalContact: { kind: 'deliveryman' as const, name: 'Ana' } }
    const link = 'Puedes contactar a Ana en https://wa.me/573010000020'
    m.rows = [source, courier]
    m.api.getConversation.mockResolvedValue(reply(courier))
    m.api.getOrderDeliverymanContact.mockResolvedValue(reply({ conversationId: courier.id, shareText: link }))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(source)
    const input = () => wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    const panel = () => wrapper.getComponent(WhatsAppOrderPanel)
    await input().setValue('Tu pedido ya va en camino.')
    panel().vm.$emit('contact-deliveryman', 501, 'share')
    await flushPromises()
    expect(input().element.value).toBe(`Tu pedido ya va en camino.\n\n${link}`)
    expect(m.api.sendMessage).not.toHaveBeenCalled()
    expect(m.api.getOrderDeliverymanContact).toHaveBeenCalledWith(501, source.id, expect.any(AbortSignal))

    const pending = deferred<ReturnType<typeof reply<{ shareText: string }>>>()
    m.api.getOrderDeliverymanContact.mockReturnValueOnce(pending.promise)
    panel().vm.$emit('contact-deliveryman', 501, 'share')
    await vm.selectConversation(courier)
    pending.resolve(reply({ shareText: 'Texto de otro chat' }))
    await flushPromises()
    expect(input().element.value).not.toContain('Texto de otro chat')

    await vm.selectConversation(source)
    panel().vm.$emit('contact-deliveryman', 501, 'open')
    await flushPromises()
    expect(vm.selectedConversation?.id).toBe(courier.id)
  })

  it('inserts an emoji where the cashier selected text while leaving the message unsent', async () => {
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const input = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await input.setValue('Hola arroz')
    input.element.setSelectionRange(5, 10)
    wrapper.getComponent(WhatsAppComposerPicker).vm.$emit('emoji', '🍚')
    await nextTick()
    expect(input.element.value).toBe('Hola 🍚')
    expect(m.api.sendMessage).not.toHaveBeenCalled()
  })

  it('keeps supplier procurement and customer sales in the same chat without crossing composer drafts', async () => {
    const first: WhatsAppConversation = { ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z',
      operationalContact: { kind: 'supplier', name: 'Molino' } }
    const second: WhatsAppConversation = { ...first, id: 2, operationalContact: { kind: 'supplier', name: 'Bodega' } }
    m.rows = [first, second]
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(first)
    expect(wrapper.get('[data-test="whatsapp-chat-header"]').text()).toContain('Proveedor')
    const button = (label: string) => wrapper.findAll('button').find(item => item.text() === label)!
    await button('Tomar pedido de cliente').trigger('click')
    expect(wrapper.getComponent(WhatsAppOrderPanel).isVisible()).toBe(true)

    const input = () => wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await input().setValue('Hola, confirmo la entrega.')
    await button('Hacer pedido').trigger('click')
    wrapper.getComponent(WhatsAppSupplierOrderDialog).vm.$emit('prepare', 1, 'Debe llegar el martes.')
    await flushPromises()
    expect(input().element.value).toBe('Hola, confirmo la entrega.\n\nDebe llegar el martes.')
    expect(m.api.sendMessage).not.toHaveBeenCalled()

    await vm.selectConversation(second)
    await button('Hacer pedido').trigger('click')
    wrapper.getComponent(WhatsAppSupplierOrderDialog).vm.$emit('prepare', 1, 'Texto de otro proveedor')
    await flushPromises()
    expect(input().element.value).toBe('')
    expect(wrapper.findComponent(WhatsAppSupplierOrderDialog).exists()).toBe(true)
  })

  it('offers both template entry points for a free supplier and refreshes the automatic assignment', async () => {
    const supplier: WhatsAppConversation = { ...m.rows[0]!, attentionMode: 'waitingForHuman', assignedUserId: null,
      customerServiceWindowExpiresAt: '2000-01-01T00:00:00Z', operationalBranchId: null, operationalBranchName: undefined,
      operationalContact: { kind: 'supplier', name: 'Molino' } }
    m.rows = [supplier]
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(supplier)
    expect(wrapper.findComponent(WhatsAppConversationTemplates).exists()).toBe(true)

    await wrapper.findAll('button').find(item => item.text() === 'Hacer pedido')!.trigger('click')
    const dialog = wrapper.getComponent(WhatsAppSupplierOrderDialog)
    expect(dialog.props()).toMatchObject({ canInsert: false, canWriteTemplate: true, templateBranchName: 'Uno', windowOpen: false })

    const assigned: WhatsAppConversation = { ...supplier, assignedUserId: 7, attentionMode: 'human', attentionRevision: 1 }
    m.rows = [assigned]
    m.api.getConversation.mockResolvedValue(reply(assigned))
    dialog.vm.$emit('sent', supplier.id, { id: 25, conversationId: supplier.id, direction: 'Outbound', timestamp: '2026-11-23T12:00:00Z' } as WhatsAppMessage)
    await flushPromises()
    expect(vm.selectedConversation?.assignedUserId).toBe(7)
    expect(m.api.changeAttention).not.toHaveBeenCalled()

    await vm.selectConversation({ ...supplier, attentionMode: 'human', assignedUserId: 8 })
    expect(wrapper.findComponent(WhatsAppConversationTemplates).exists()).toBe(false)
  })

  it('links the selected order customer only after explicit confirmation', async () => {
    const chat = { ...m.rows[0]!, customerId: null, attentionRevision: 4 }
    const customer = { id: 12, name: 'Cliente Demo', phone1: '+57 300 000 0000' } as Customer
    m.rows = [chat]
    m.api.linkConversationCustomer.mockResolvedValue(reply({ ...chat, customerId: customer.id }))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(chat)
    const panel = wrapper.getComponent(WhatsAppOrderPanel)
    m.confirm.mockResolvedValueOnce(false)
    panel.vm.$emit('link-address-customer', customer)
    await flushPromises()
    expect(m.api.linkConversationCustomer).not.toHaveBeenCalled()

    panel.vm.$emit('link-address-customer', customer)
    await flushPromises()
    expect(m.api.linkConversationCustomer).toHaveBeenCalledExactlyOnceWith(chat.id, customer.id,
      { phoneNumber: '3000000000', expectedAttentionVersion: 4 })
    expect(vm.selectedConversation?.customerId).toBe(customer.id)
  })

  it('opens a customer from a delivery route through the existing WhatsApp order resolver', async () => {
    const deliveryman: WhatsAppConversation = { ...m.rows[0]!, operationalContact: { kind: 'deliveryman', name: 'Dom' } }
    const customer = m.rows[1]!
    m.rows = [deliveryman, customer]
    m.api.getOrderConversation.mockResolvedValue(reply({ kind: 'existing', conversationId: customer.id }))
    m.api.getConversation.mockResolvedValue(reply(customer))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(deliveryman)
    expect(wrapper.get('[data-test="whatsapp-chat-header"]').text()).toContain('Domiciliario')
    wrapper.getComponent(WhatsAppDeliveryRoutesPanel).vm.$emit('contact-customer', 501)
    await flushPromises()
    expect(m.api.getOrderConversation).toHaveBeenCalledExactlyOnceWith(501, expect.any(AbortSignal))
    expect(vm.selectedConversation?.id).toBe(customer.id)
  })

  it('shows only the courier name and reloads routes when a shared phone changes hands', async () => {
    const chat: WhatsAppConversation = {
      ...m.rows[0]!,
      contactName: 'Celular del local',
      operationalContact: { kind: 'deliveryman', name: 'Ana', isSharedPhone: true, deliverymanId: 20 },
    }
    m.rows = [chat]
    m.api.getConversation.mockResolvedValue(reply(chat))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(chat)
    await flushPromises()
    const heading = () => wrapper.get('[data-test="whatsapp-chat-header"]').text()
    expect(heading()).toContain('Ana')
    expect(heading()).not.toMatch(/Domiciliario|Celular del local|En uso|Último uso/)
    const routes = wrapper.getComponent(WhatsAppDeliveryRoutesPanel).vm

    m.handlers.get('WhatsAppMessageCreated')?.({
      conversation: { ...chat, operationalContact: { kind: 'deliveryman', name: 'Luis', isSharedPhone: true, deliverymanId: 21 } },
      message: { id: 501, conversationId: chat.id, direction: 'inbound', type: 'text', textBody: 'Hola', timestamp: '2026-11-15T15:00:00Z' },
    })
    await flushPromises()
    expect(heading()).toContain('Luis')
    expect(heading()).not.toContain('Ana')
    expect(wrapper.getComponent(WhatsAppDeliveryRoutesPanel).vm).not.toBe(routes)
    expect(wrapper.getComponent(WhatsAppDeliveryRoutesPanel).props('expectedDeliverymanId')).toBe(21)
  })

  it('starts a WhatsApp chat from the inbox using the approved branch template', async () => {
    const opened = conversation(25)
    m.api.getConversationStartOptions.mockResolvedValue(reply({
      branchId: 1, branchName: 'Santander', senderId: 'line', displayPhoneNumber: '+57 300 000 0000',
      templates: [
        { key: 'menu', name: 'carta_imagen_solicitada', status: 'APPROVED', body: 'Te compartimos la carta.', unavailableReason: null },
        { key: 'payment', name: 'pago_pedido_bancolombia', status: 'PENDING', unavailableReason: 'En revisión en Meta.' },
      ],
    }))
    m.api.startConversation.mockResolvedValue(reply({ conversationId: opened.id, sent: true }))
    m.api.getConversation.mockResolvedValue(reply(opened))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await wrapper.get('[aria-label="Nueva conversación"]').trigger('click')
    await flushPromises()
    expect(m.api.getConversationStartOptions).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect(wrapper.get<HTMLInputElement>('input[value="payment"]').element.disabled).toBe(true)
    await wrapper.get('input[type="tel"]').setValue('300 123 4567')
    await wrapper.get('input[value="menu"]').setValue(true)
    expect(wrapper.text()).toContain('Carta como imagen')
    expect(wrapper.text()).toContain('Te compartimos la carta.')
    expect(wrapper.text()).toMatch(/Carta de Santander\s*· Imagen/)
    const send = wrapper.get<HTMLButtonElement>('button[type="submit"]')
    expect(send.element.disabled).toBe(true)
    await wrapper.get('form').get('input[type="checkbox"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(m.api.startConversation).toHaveBeenCalledWith({
      branchId: 1, senderId: 'line', phone: '300 123 4567', template: 'menu', templateName: 'carta_imagen_solicitada', requestedByCustomer: true,
    }, expect.any(String))
    expect(vm.selectedConversation?.id).toBe(25)
  })

  it('starts a payment conversation using branch bank details and a manual amount only', async () => {
    m.api.getConversationStartOptions.mockResolvedValue(reply({
      branchId: 1, branchName: 'Santander', senderId: 'line', account: '00012345678', holder: 'Señor Arroz',
      templates: [{
        key: 'payment', name: 'pago_pedido_bancolombia', status: 'APPROVED',
        body: 'Cuenta Bancolombia número {{1}} a nombre de {{2}}. El total a pagar es de {{3}}. Muchas gracias.',
        unavailableReason: null,
      }],
    }))
    m.api.startConversation.mockResolvedValue(reply({ conversationId: 25, sent: true }))
    m.api.getConversation.mockResolvedValue(reply(conversation(25)))
    const { wrapper } = mountView()
    await flushPromises()
    await wrapper.get('[aria-label="Nueva conversación"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[type="tel"]').setValue('300 123 4567')
    await wrapper.get('input[value="payment"]').setValue(true)
    const form = wrapper.get('form')
    const send = form.get<HTMLButtonElement>('button[type="submit"]')
    await form.get('input[type="checkbox"]').setValue(true)
    expect(send.element.disabled).toBe(true)
    expect(form.findAll('input[type="number"]')).toHaveLength(1)
    await form.get('input[type="number"]').setValue(42000)
    expect(form.text()).toContain('Cuenta Bancolombia número 00012345678 a nombre de Señor Arroz.')
    expect(form.text()).toContain('El total a pagar es de $42.000 COP.')
    await form.trigger('submit')
    await flushPromises()

    expect(m.api.startConversation).toHaveBeenCalledExactlyOnceWith({
      branchId: 1, senderId: 'line', phone: '300 123 4567', template: 'payment', templateName: 'pago_pedido_bancolombia', requestedByCustomer: true, amount: 42000,
    }, expect.any(String))
  })

  it('lets the advisor start a conversation with the courier update template', async () => {
    m.api.getConversationStartOptions.mockResolvedValue(reply({
      branchId: 1, branchName: 'Santander', senderId: 'line',
      templates: [{
        key: 'delivery_update', name: 'novedad_entrega_domiciliario', status: 'APPROVED',
        body: 'El domiciliario nos informa que {{1}}. Quedamos atentos.', unavailableReason: null,
      }],
    }))
    m.api.startConversation.mockResolvedValue(reply({ conversationId: 25, sent: true }))
    m.api.getConversation.mockResolvedValue(reply(conversation(25)))
    const { wrapper } = mountView()
    await flushPromises()
    await wrapper.get('[aria-label="Nueva conversación"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[type="tel"]').setValue('300 123 4567')
    await wrapper.get('input[value="delivery_update"]').setValue(true)
    const form = wrapper.get('form')
    await form.get('input[type="checkbox"]').setValue(true)
    expect(form.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
    await form.get('input[placeholder="Ej. ya llegó y está intentando contactarte"]').setValue('  hay mucho tráfico  ')
    expect(form.text()).toContain('El domiciliario nos informa que hay mucho tráfico. Quedamos atentos.')
    await form.trigger('submit')
    await flushPromises()
    expect(m.api.startConversation).toHaveBeenCalledExactlyOnceWith({
      branchId: 1, senderId: 'line', phone: '300 123 4567', template: 'delivery_update',
      templateName: 'novedad_entrega_domiciliario', requestedByCustomer: true, deliveryUpdate: 'hay mucho tráfico',
    }, expect.any(String))
  })

  it('opens the exact chat and focuses its editable composer while messages load', async () => {
    m.route.query = { orderId: '25' }
    m.api.getOrderConversation.mockResolvedValue(reply({ kind: 'existing', conversationId: 90 }))
    m.api.getConversation.mockResolvedValue(reply({ ...conversation(90), customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }))
    const messages = deferred<{ data: { items: WhatsAppMessage[]; nextCursor: null; hasMore: false } }>()
    m.api.getMessagesPage.mockReturnValue(messages.promise)
    const { vm, wrapper } = mountView(false, document.body)
    await flushPromises()

    expect(m.api.getOrderConversation).toHaveBeenCalledExactlyOnceWith(25, expect.any(AbortSignal))
    expect(vm.selectedConversation?.id).toBe(90)
    const input = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('Hola')
    messages.resolve(reply({ items: [], nextCursor: null, hasMore: false }))
    await flushPromises()
    expect(input.element.value).toBe('Hola')
    expect(m.route.query.orderId).toBeUndefined()
    expect(m.api.startConversation).not.toHaveBeenCalled()
    expect(m.api.sendMessage).not.toHaveBeenCalled()
  })

  it('respects the sending restriction when opening a chat from an order', async () => {
    m.route.query = { orderId: '25' }
    m.api.getOrderConversation.mockResolvedValue(reply({ kind: 'existing', conversationId: 90 }))
    m.api.getConversation.mockResolvedValue(reply(conversation(90)))
    const { wrapper } = mountView(false, document.body)
    await flushPromises()

    const input = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]').element
    expect(input.disabled).toBe(true)
    expect(document.activeElement).not.toBe(input)
  })

  it('prefills the order phone on the enabled line with no message sent', async () => {
    m.route.query = { orderId: '25' }
    m.api.getOrderConversation.mockResolvedValue(reply({ kind: 'start', phone: '+573000123456', branchId: 2 }))
    m.api.getConversationStartOptions.mockResolvedValue(reply({ branchId: 2, branchName: 'Dos', senderId: 'line', templates: [] }))
    const { wrapper } = mountView()
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('input[type="tel"]').element.value).toBe('+573000123456')
    expect(m.api.getConversationStartOptions).toHaveBeenCalledExactlyOnceWith(2, expect.any(AbortSignal))
    expect(m.api.startConversation).not.toHaveBeenCalled()
  })

  it('renders the voice player only for visible audio with a source', async () => {
    const chat = m.rows[0]!
    const voice = {
      id: 50, conversationId: chat.id, direction: 'inbound', type: 'audio',
      timestamp: '2026-11-20T17:00:00Z', mediaUrl: 'https://example.invalid/voice.ogg',
    } as WhatsAppMessage
    m.api.getMessagesPage.mockResolvedValue(reply({
      items: [voice, { ...voice, id: 51, hiddenSource: 'pos' }, { ...voice, id: 52, mediaUrl: null }],
      nextCursor: null, hasMore: false,
    }))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(chat)

    expect(wrapper.findAllComponents(WhatsAppVoiceMessage)).toHaveLength(1)
    expect(wrapper.getComponent(WhatsAppVoiceMessage).props('src')).toBe(voice.mediaUrl)
    expect(wrapper.get('[data-message-id="51"]').text()).toContain('Mensaje oculto en el POS')
    expect(wrapper.get('[data-message-id="52"]').text()).toContain('Audio sin vista previa')
  })

  it('saves a received sticker, reloads it, and sends it as a sticker without clearing the draft', async () => {
    vi.stubGlobal('indexedDB', new IDBFactory())
    const blob = new NodeBlob(['test'], { type: 'image/webp' })
    m.api.downloadSticker.mockResolvedValue(blob)
    const chat = { ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    const inbound = {
      id: 51, conversationId: chat.id, direction: 'inbound', type: 'sticker', textBody: '',
      timestamp: '2026-11-20T17:00:00Z', mediaUrl: 'https://example.invalid/sticker.webp', mediaSha256: 'sticker-1',
    } as WhatsAppMessage
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [inbound], nextCursor: null, hasMore: false }))
    m.api.sendMediaMessage.mockResolvedValue(reply({ ...inbound, id: 52, direction: 'outbound', status: 'sent' }))
    const first = mountView()
    await flushPromises()
    await first.vm.selectConversation(chat)
    await first.wrapper.get('button[aria-label="Guardar sticker"]').trigger('click')
    await vi.waitFor(() => expect(first.wrapper.find('button[aria-label="Quitar sticker de guardados"]').exists()).toBe(true))
    expect(m.api.downloadSticker).toHaveBeenCalledWith(chat.id, inbound.id)
    unmount(first.wrapper)

    const reopened = mountView()
    await flushPromises()
    await reopened.vm.selectConversation(chat)
    const picker = reopened.wrapper.getComponent(WhatsAppComposerPicker)
    await vi.waitFor(() => expect(picker.props('stickers')).toHaveLength(1))
    const input = reopened.wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    await input.setValue('Borrador pendiente')
    picker.vm.$emit('sticker', picker.props('stickers')[0]!)
    await flushPromises()
    expect(m.api.sendMediaMessage).toHaveBeenCalledWith(chat.id, expect.objectContaining({ name: 'sticker.webp', type: 'image/webp' }), undefined, undefined, true)
    expect(input.element.value).toBe('Borrador pendiente')
    useAuthStore().user = { ...useAuthStore().user!, id: 8 }
    await flushPromises()
    await reopened.vm.selectConversation(chat)
    await vi.waitFor(() => expect(reopened.wrapper.findComponent(WhatsAppComposerPicker).props('stickers')).toHaveLength(0))
  })

  it('opens each shared contact with the information received and explains name-only cards', async () => {
    const { vm, wrapper } = mountView()
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [{
      id: 60, conversationId: 1, direction: 'inbound', type: 'contacts', textBody: '',
      timestamp: '2026-11-20T17:00:00Z',
      contacts: [{ name: 'César', phones: ['+57 300 000 0101'], emails: ['cesar@example.invalid'], organization: 'Comercio' },
        { name: 'Contacto de prueba', phones: [] }],
    }], nextCursor: null, hasMore: false }))
    await flushPromises()
    await vm.selectConversation(m.rows[0]!)
    await wrapper.get('button[aria-label="Ver contacto César"]').trigger('click')
    const details = wrapper.get('[aria-label="César"]')
    expect(details.get('a[href="tel:+573000000101"]').text()).toBe('+57 300 000 0101')
    expect(details.text()).toContain('cesar@example.invalid')
    expect(details.text()).toContain('Comercio')
    await wrapper.get('button[aria-label="Ver contacto Contacto de prueba"]').trigger('click')
    expect(wrapper.get('[aria-label="Contacto de prueba"]').text()).toContain('La tarjeta solo contiene el nombre.')
    await vm.selectConversation(m.rows[1]!)
    expect(wrapper.find('[aria-label="Contacto de prueba"]').exists()).toBe(false)
  })

  it('offers free and team chats for forwarding while filtering the source, expired and closed chats', async () => {
    const openWindow = '2099-01-01T00:00:00Z'
    m.rows = [
      { ...conversation(1), customerServiceWindowExpiresAt: openWindow },
      { ...conversation(2), assignedUserId: undefined, attentionMode: 'waitingForHuman', customerServiceWindowExpiresAt: openWindow },
      { ...conversation(3), assignedUserId: 8, customerServiceWindowExpiresAt: openWindow },
      { ...conversation(4), customerServiceWindowExpiresAt: '2000-01-01T00:00:00Z' },
      { ...conversation(5), attentionMode: 'closed', status: 'closed', customerServiceWindowExpiresAt: openWindow },
    ]
    const dialog = shallowMount(WhatsAppForwardDialog, {
      props: { modelValue: true, sourceId: 1, count: 1, sending: false, error: '' },
      global: { stubs: {
        BaseDialog: { template: '<div><slot /><slot name="footer" /></div>' },
        BaseButton: { template: '<button><slot /></button>' },
      } },
    })
    wrappers.push(dialog)
    await flushPromises()
    expect(m.api.getConversations.mock.calls[0]?.[0]).toEqual({ search: undefined })
    const destinations = dialog.get('[aria-label="Chats de destino"]').findAll('button')
    expect(destinations.map(button => button.get('span.block').text())).toEqual(['Chat 2', 'Chat 3'])
    await destinations[1]!.trigger('click')
    await dialog.findAll('button').find(button => button.text() === 'Reenviar mensaje')!.trigger('click')
    expect(dialog.emitted('forward')).toEqual([[3]])
  })

  it('forwards selected messages in chat order and retries only the unconfirmed message with the same request ID', async () => {
    const message = {
      conversationId: 1, direction: 'inbound', type: 'text', status: 'received',
    }
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [
      { ...message, id: 61, textBody: 'Primero', timestamp: '2026-11-20T17:00:00Z' },
      { ...message, id: 62, textBody: 'Segundo', timestamp: '2026-11-20T17:01:00Z' },
    ], nextCursor: null, hasMore: false }))
    m.api.forwardMessage.mockResolvedValueOnce(reply(null)).mockRejectedValueOnce(new Error('Envío pendiente')).mockResolvedValueOnce(reply(null))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(m.rows[0]!)
    await wrapper.get('[data-message-id="62"] button[aria-label="Reenviar mensaje"]').trigger('click')
    await wrapper.get<HTMLInputElement>('[data-message-id="61"] input[type="checkbox"]').setValue(true)
    expect(wrapper.text()).toContain('2 mensajes seleccionados')
    await wrapper.findAll('button').find(button => button.text() === 'Elegir chat')!.trigger('click')
    const dialog = wrapper.getComponent(WhatsAppForwardDialog)
    dialog.vm.$emit('forward', 2)
    await flushPromises()
    expect(m.api.forwardMessage.mock.calls.map(([target, source, id]) => [target, source, id])).toEqual([[2, 1, 61], [2, 1, 62]])
    expect(dialog.props('count')).toBe(1)
    expect(dialog.props('error')).toContain('Se reenviaron 1 de 2.')
    dialog.vm.$emit('forward', 2)
    await flushPromises()
    expect(m.api.forwardMessage.mock.calls[2]).toEqual(m.api.forwardMessage.mock.calls[1])
    expect(wrapper.findComponent(WhatsAppForwardDialog).exists()).toBe(false)
  })

  it('queues multiple selected, pasted and dropped files, with independent removal', async () => {
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const picker = wrapper.get<HTMLInputElement>('input[type="file"]')
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    expect(picker.element.multiple).toBe(true)
    Object.defineProperty(picker.element, 'files', { value: [new File(['1'], 'uno.jpg'), new File(['2'], 'dos.jpg')] })
    await picker.trigger('change')
    await composer.setValue('Mi texto')
    const paste = pasteFiles(composer.element, [new File(['3'], 'captura.png'), new File(['4'], 'segunda.png')])
    expect(paste.defaultPrevented).toBe(true)
    const form = wrapper.get('form.wa-composer')
    const dataTransfer = { types: ['Files'], files: [new File(['5'], 'factura.pdf'), new File(['6'], 'cuenta.pdf')] }
    await form.trigger('dragover', { dataTransfer })
    expect(form.text()).toContain('Suelta los archivos')
    await form.trigger('drop', { dataTransfer })
    expect(form.text()).not.toContain('Suelta los archivos')
    const list = wrapper.get('[aria-label="Archivos adjuntos"]')
    expect(list.findAll('li')).toHaveLength(6)
    await list.get('button[aria-label="Quitar dos.jpg"]').trigger('click')
    expect(list.findAll('li')).toHaveLength(5)
    expect(composer.element.value).toBe('Mi texto')
  })

  it('clears the composer on Enter and leaves a new draft untouched when confirmation arrives', async () => {
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    const first = deferred<ReturnType<typeof reply<null>>>()
    m.api.sendMessage.mockReturnValueOnce(first.promise).mockResolvedValueOnce(reply(null))

    await composer.setValue('Hola')
    await composer.trigger('keydown.enter', { isComposing: true })
    expect(m.api.sendMessage).not.toHaveBeenCalled()
    await composer.trigger('keydown.enter')
    expect(m.api.sendMessage).toHaveBeenCalledExactlyOnceWith(1, 'Hola')
    expect(composer.element.value).toBe('')

    await composer.setValue('Hola')
    first.resolve(reply(null))
    await flushPromises()
    expect(composer.element.value).toBe('Hola')
    await composer.trigger('keydown.enter')
    await flushPromises()
    expect(m.api.sendMessage.mock.calls).toEqual([[1, 'Hola'], [1, 'Hola']])
    expect(composer.element.value).toBe('')
  })

  it('lets the cashier recover a failed message without overwriting the next draft', async () => {
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    const first = deferred<ReturnType<typeof reply<null>>>()
    m.api.sendMessage.mockReturnValueOnce(first.promise)

    await composer.setValue('Primero')
    await composer.trigger('keydown.enter')
    await composer.setValue('Segundo')
    first.reject(new Error('Falló el envío de prueba.'))
    await flushPromises()

    expect(composer.element.value).toBe('Segundo')
    const failure = wrapper.get('.wa-compose-failure')
    expect(failure.text()).toContain('Primero')
    expect(failure.text()).toContain('Falló el envío de prueba.')
    expect(failure.get('button').attributes('disabled')).toBeDefined()
    await composer.setValue('')
    await failure.get('button').trigger('click')
    expect(composer.element.value).toBe('Primero')
    expect(wrapper.find('.wa-compose-failure').exists()).toBe(false)
  })

  it('retries the remaining attachments in order without resending a delivered caption or file', async () => {
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0]!, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    const composer = wrapper.get<HTMLTextAreaElement>('textarea[placeholder="Escribe un mensaje"]')
    const files = ['foto.png', 'recibo.pdf', 'carta.pdf'].map(name => new File(['body'], name))
    await composer.setValue('Envío de prueba')
    pasteFiles(composer.element, files)
    await nextTick()
    const firstFile = deferred<ReturnType<typeof reply<null>>>()
    m.api.sendMediaMessage.mockReturnValueOnce(firstFile.promise).mockRejectedValueOnce(new Error('Archivo temporalmente rechazado.'))
    const form = wrapper.get('form.wa-composer')
    await form.trigger('submit')
    expect(composer.element.value).toBe('')
    expect(wrapper.find('ul[aria-label="Archivos adjuntos"]').exists()).toBe(false)
    firstFile.resolve(reply(null))
    await flushPromises()
    expect(m.api.sendMediaMessage.mock.calls).toEqual([[1, files[0], 'Envío de prueba'], [1, files[1], undefined]])
    expect(wrapper.get('[role="alert"]').text()).toContain('recibo.pdf')
    expect(wrapper.get('[aria-label="Archivos adjuntos"]').text()).not.toContain('foto.png')
    expect(composer.element.value).toBe('')
    m.api.sendMediaMessage.mockResolvedValue(reply(null))
    await form.trigger('submit')
    await flushPromises()
    expect(m.api.sendMediaMessage.mock.calls.slice(2)).toEqual([[1, files[1], ''], [1, files[2], undefined]])
    expect(wrapper.find('[aria-label="Archivos adjuntos"]').exists()).toBe(false)
    expect(m.api.sendMessage).not.toHaveBeenCalled()
  })

  it('uses Colombia calendar days and keeps a single divider when loading older messages of the same day', async () => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-20T05:03:00Z'))
    const inbound = { conversationId: 1, direction: 'inbound', type: 'text', textBody: 'Prueba', status: 'received' }
    m.api.getMessagesPage.mockResolvedValueOnce(reply({ items: [
      { ...inbound, id: 92, timestamp: '2026-11-20T04:59:00' },
      { ...inbound, id: 93, timestamp: '2026-11-20T05:00:00Z' },
      { ...inbound, id: 94, timestamp: '2026-11-20T05:01:00Z' },
    ], nextCursor: 'old', hasMore: true })).mockResolvedValueOnce(reply({ items: [
      { ...inbound, id: 90, timestamp: '2026-11-18T21:00:00Z' },
      { ...inbound, id: 91, timestamp: '2026-11-19T15:00:00Z' },
    ], nextCursor: null, hasMore: false }))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(m.rows[0]!)
    await flushPromises()
    const days = () => wrapper.findAll('.wa-day-divider time').map(time => time.text())
    expect(days()).toEqual(['Ayer', 'Hoy'])
    await wrapper.findAll('button').find(button => button.text() === 'Cargar mensajes anteriores')!.trigger('click')
    await flushPromises()
    expect(days()).toEqual(['18 de noviembre de 2026', 'Ayer', 'Hoy'])
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

  it('searches across all four tabs and identifies each result in activity order', async () => {
    const { wrapper } = mountView(true)
    await flushPromises()
    const rows: WhatsAppConversation[] = [
      { ...conversation(1), lastMessageAt: '2026-11-19T12:00:00Z' },
      { ...conversation(2), assignedUserId: null, lastMessageAt: '2026-11-19T14:00:00Z' },
      { ...conversation(3), assignedUserId: 8, lastMessageAt: '2026-11-19T13:00:00Z' },
      { ...conversation(4), attentionMode: 'closed', lastMessageAt: '2026-11-10T17:00:00Z' },
    ]
    m.api.getConversations.mockResolvedValue(reply(rows))
    await wrapper.get('input[type="search"]').setValue('+57 (300) 000-0000')
    vi.advanceTimersByTime(350)
    await flushPromises()

    const filters = m.api.getConversations.mock.lastCall?.[0]
    expect(filters.search).toBe('+57 (300) 000-0000')
    expect(filters.inbox).toBeUndefined()
    expect(wrapper.findAll('.wa-inbox-source').map(badge => badge.text())).toEqual(['Libres', 'Equipo', 'Míos', 'Cerrados'])
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
  })

  it('exposes the AI states on compact markers outside of the message actions', async () => {
    const { wrapper, vm } = mountView()
    await flushPromises()
    const timestamp = '2026-11-19T12:00:00Z'
    const messages = ['completed', 'ignored'].map((status, index) => ({
      id: index + 1, conversationId: 1, direction: 'inbound', type: 'text', textBody: 'Mensaje',
      timestamp, createdAt: timestamp, status: 'received',
      aiProcessing: { status, severity: 'neutral', title: index ? 'No se procesó con IA' : 'Procesado con IA' },
    }))
    m.api.getMessagesPage.mockResolvedValue(reply({ items: messages, hasMore: false }))
    await vm.selectConversation(m.rows[0]!)
    await flushPromises()

    expect(wrapper.findAll('.wa-ai-message-marker').map(marker => marker.attributes('label')))
      .toEqual(['Procesado con IA', 'No se procesó con IA'])
    expect(wrapper.find('.wa-bubble .wa-ai-message-marker').exists()).toBe(false)
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
    await wrapper.get('button[aria-label="Ver todas las respuestas rápidas"]').trigger('click')
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
    const pending = deferred<ReturnType<typeof reply<null>>>()
    m.api.sendQuickReply.mockReturnValueOnce(pending.promise)
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
    expect(m.api.sendQuickReply).toHaveBeenCalledExactlyOnceWith(1, 12, undefined)
    expect(composer.element.value).toBe('')
    await composer.setValue('Te confirmo enseguida.')
    pending.resolve(reply(null))
    await flushPromises()
    expect(composer.element.value).toBe('Te confirmo enseguida.')
  })

  it.each(['library', 'suggestion', 'Enter', 'Tab'])('lets a cashier quote a message using %s', async (method) => {
    useAuthStore().user!.role = 'Cashier'
    useAuthStore().user!.branchId = 2
    const chat: WhatsAppConversation = { ...m.rows[0]!, operationalBranchId: 2, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    m.rows = [chat]
    m.api.getQuickReplies.mockResolvedValue(reply([
      { id: 12, branchId: 2, shortcut: 'recibido', messageTemplate: 'Listo, recibido.', isActive: true, usageCount: 0 },
    ]))
    const inbound: WhatsAppMessage = { id: 44, conversationId: 1, whatsAppMessageId: 'wamid.demo',
      direction: 'inbound', type: 'text', textBody: '¿Recibieron el pedido?', status: 'received',
      timestamp: '2026-11-15T12:01:00Z', createdAt: '2026-11-15T12:01:00Z' }
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [inbound], nextCursor: null, hasMore: false }))
    m.api.sendQuickReply.mockResolvedValue(reply(null))
    const { vm, wrapper } = mountView()
    await flushPromises()
    await vm.selectConversation(chat)
    await wrapper.get('button[aria-label="Responder a este mensaje"]').trigger('click')
    if (method === 'library') {
      await wrapper.get('button[aria-label="Ver todas las respuestas rápidas"]').trigger('click')
      await flushPromises()
      await wrapper.findAll('button').find(button => button.text() === 'Usar')!.trigger('click')
    } else {
      const composer = wrapper.get('textarea[placeholder="Escribe un mensaje"]')
      await composer.setValue(method === 'Enter' ? '/recibido' : method === 'Tab' ? '/reci' : '/')
      const suggestion = wrapper.get('.wa-quick-suggestion')
      expect(suggestion.text()).toContain('/recibido')
      if (method === 'suggestion') await suggestion.trigger('click')
      else await composer.trigger('keydown', { key: method })
    }
    await flushPromises()
    expect(m.api.sendQuickReply).toHaveBeenCalledExactlyOnceWith(1, 12, 44)
    expect(wrapper.find('button[aria-label="Quitar cita"]').exists()).toBe(false)
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

  it('copies visible text and captions from the message toolbar even when the chat is read-only', async () => {
    const chat = { ...conversation(), assignedUserId: 8 }
    m.rows = [chat]
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const message = {
      id: 95, conversationId: 1, direction: 'inbound', type: 'text', status: 'received',
      textBody: '  Hola 🍚\n¿Tienen domicilio?', timestamp: '2026-11-19T12:00:00Z',
    }
    m.api.getMessagesPage.mockResolvedValue(reply({
      items: [
        message,
        { ...message, id: 96, direction: 'outbound', type: 'image', status: 'sent',
          mediaUrl: 'https://example.invalid/carta.jpg', textBody: 'Carta del día' },
        { ...message, id: 97, hiddenSource: 'pos' },
        { ...message, id: 98, type: 'image', mediaUrl: 'https://example.invalid/foto.jpg', textBody: undefined },
      ],
      hasMore: false,
      nextCursor: null,
    }))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(chat)
    const action = (id: number) => wrapper.find(`[data-message-id="${id}"] button[aria-label="Copiar mensaje"]`)
    expect(action(97).exists()).toBe(false)
    expect(action(98).exists()).toBe(false)
    await action(95).trigger('click')
    await action(96).trigger('click')
    expect(writeText.mock.calls).toEqual([[message.textBody], ['Carta del día']])
    expect(m.success).toHaveBeenCalledWith('Mensaje copiado', 2200)
    expect(m.api.sendMessage).not.toHaveBeenCalled()
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
    await wrapper.get('button[aria-label="Ver contacto Contacto de prueba"]').trigger('click')
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

  it('keeps message controls discoverable and permits observers to select a forwardable message', async () => {
    const chat = { ...conversation(), assignedUserId: 8, customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' }
    m.rows = [chat]
    m.api.getMessagesPage.mockResolvedValue(reply({ items: [{
      id: 99, conversationId: 1, direction: 'inbound', type: 'text', status: 'received',
      textBody: 'Un mensaje', whatsAppMessageId: 'wamid.local', timestamp: '2026-11-19T12:00:00Z',
    }], hasMore: false }))
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation(chat)

    const controls = wrapper.get('.message-actions').findAll('button')
    expect(controls.map(button => button.attributes('aria-label')))
      .toEqual(['Responder a este mensaje', 'Reaccionar', 'Copiar mensaje', 'Reenviar mensaje', 'Ocultar en el POS'])
    for (const button of controls.filter(button => !['Copiar mensaje', 'Reenviar mensaje'].includes(button.attributes('aria-label')))) {
      expect(button.attributes('aria-disabled')).toBe('true')
      expect(button.attributes('title')).toContain('Toma la conversación')
      await button.trigger('click')
    }
    expect(wrapper.find('[aria-label="Reacciones disponibles"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Quitar cita"]').exists()).toBe(false)
    expect(m.api.hideMessage).not.toHaveBeenCalled()
    expect(m.api.reactToMessage).not.toHaveBeenCalled()
    await wrapper.get('button[aria-label="Reenviar mensaje"]').trigger('click')
    expect(wrapper.text()).toContain('1 mensaje seleccionado')
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
      { ...inbound, id: 94, textBody: 'ropa vieja para tres' },
      { ...inbound, id: 95, textBody: 'Producto elegido: Arroz ropa vieja Trío', draftProductApplied: true },
    ], nextCursor: null, hasMore: false }))
    const add = { kind: 'add', productId: 5, name: 'Ropa vieja Súper', quantity: 2, unitPrice: 66000, available: true, reply: null }
    m.api.getProductSuggestions.mockResolvedValue(reply({ branchId: 1, messages: [
      { messageId: 90, suggestions: [add] },
      { messageId: 91, suggestions: [{ kind: 'reply', productId: 8, reply: 'Paisa Dúo cuesta $ 31.000.' }] },
      { messageId: 94, suggestions: [{ kind: 'choices', productId: 40, choiceGroupId: 4, choiceIndex: 0,
        name: 'Ropa Vieja · Trío', quantity: 1, available: true }] },
    ] }))
    m.sendProductChoices.mockResolvedValueOnce([])
    const { wrapper, vm } = mountView()
    await flushPromises()
    await vm.selectConversation({ ...m.rows[0], customerServiceWindowExpiresAt: '2099-01-01T00:00:00Z' })
    await flushPromises()
    expect(m.api.getProductSuggestions).toHaveBeenCalledWith(1, [90, 91, 94], expect.anything())
    const addButton = wrapper.get('[data-message-id="90"] [aria-label="Sugerencias de productos"] button')
    expect(addButton.text()).toBe('Agregar 2')
    expect(wrapper.get('[data-message-id="90"] [aria-label="Sugerencias de productos"]').text()).toContain('Ropa vieja Súper')
    await addButton.trigger('click')
    expect(m.applyProductSuggestion).toHaveBeenCalledExactlyOnceWith(90, add)
    await wrapper.get('[data-message-id="91"] [aria-label="Sugerencias de productos"] button').trigger('click')
    const choices = wrapper.get('[data-message-id="94"] [aria-label="Sugerencias de productos"] button')
    expect(choices.text()).toBe('Enviar opciones')
    await choices.trigger('click')
    expect(m.sendProductChoices).toHaveBeenCalledExactlyOnceWith(4, { messageId: 94, choiceIndex: 0, productId: 40 })
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
