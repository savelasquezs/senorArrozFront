import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import WhatsAppOrderPanel from '../WhatsAppOrderPanel.vue'
import { useOrderEditorStore } from '@/composables/useOrderEditor'
import { useOrderSubmission } from '@/composables/useOrderSubmission'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useAuthStore } from '@/store/auth'
import { createOrderDraft } from '@/helpers/orderDraft'
import type { WhatsAppCommercialDraft, WhatsAppConversation } from '@/types/whatsapp'
import { UserRole } from '@/types/auth'

const api = vi.hoisted(() => ({
  getCommercialDraft: vi.fn(), startCommercialDraft: vi.fn(), saveCommercialDraft: vi.fn(),
  commercialDraftAction: vi.fn(), getCommercialHistory: vi.fn(),
}))
const details = vi.hoisted(() => ({ fetchById: vi.fn(), current: null as { id: number } | null }))
const customer = vi.hoisted(() => ({ getCustomerById: vi.fn(), getCustomerAddresses: vi.fn() }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: api }))
vi.mock('@/services/MainAPI/customerApi', () => ({ customerApi: customer }))
vi.mock('@/store/banks', () => ({ useBanksStore: () => ({ ensureListLoaded: vi.fn(), options: [] }) }))
vi.mock('@/store/apps', () => ({ useAppsStore: () => ({ ensureListLoaded: vi.fn(), options: [] }) }))
vi.mock('@/store/branchPosSettings', () => ({ useBranchPosSettingsStore: () => ({ ensureForBranch: vi.fn(), maxFreeDeliveryDiscount: 0 }) }))
vi.mock('@/store/products', () => ({ useProductsStore: () => ({ ensureCatalogLoaded: vi.fn(), catalogProducts: [] }) }))
vi.mock('@/store/ordersData', () => ({ useOrdersDataStore: () => details }))

const Editor = defineComponent({ setup() {
  editor = useOrderEditorStore()
  const { submitOrder } = useOrderSubmission()
  return () => h('button', {
    onClick: () => editor.currentOrder && submitOrder(editor.currentOrder).catch(() => {}),
  }, 'Confirmar pedido')
} })
const Dialog = { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' }

let pinia: ReturnType<typeof createPinia>
let editor: ReturnType<typeof useOrderEditorStore>
let shared: WhatsAppCommercialDraft
let wrapper: VueWrapper | undefined
function session(): WhatsAppCommercialDraft {
  return {
    sessionId: 81, conversationId: 44, version: 3,
    attemptId: '00000000-0000-4000-8000-000000000081',
    status: 'active', commercialStatus: 'in_progress', editor: null, orderId: null,
    checkoutId: null, confirmationStatus: null, confirmationError: null, internalNotes: [],
    order: { branchId: 2, takenById: 7, type: 'delivery', status: 'taken', customerId: 12,
      addressId: 31, deliveryFee: 6000, orderDetails: [{ productId: 88, quantity: 2, unitPrice: 10000, notes: 'Sin cebolla' }] },
  }
}
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.resetAllMocks()
  shared = session()
  api.getCommercialDraft.mockImplementation(async () => ({ data: shared }))
  api.saveCommercialDraft.mockResolvedValue({ data: { ...shared, version: 4 } })
  api.getCommercialHistory.mockResolvedValue({ data: [] })
  details.current = null
  details.fetchById.mockImplementation(async (id: number) => { details.current = { id } })
  api.commercialDraftAction.mockImplementation(async (_id, action) => {
    shared = { ...shared, status: 'completed', orderId: 501, confirmationStatus: action === 'retry-message' ? 'sent' : null }
    return { data: shared }
  })
  customer.getCustomerById.mockResolvedValue({ data: { id: 12, name: 'Cliente', addresses: [] } })
  customer.getCustomerAddresses.mockResolvedValue({ data: [] })
  useAuthStore().user = { id: 7, name: 'Caja', role: UserRole.CASHIER, branchId: 1, branchName: 'Origen',
    email: '', phone: '', active: true }
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined })

async function panel(overrides: Partial<WhatsAppConversation> = {}) {
  const mounted = mount(WhatsAppOrderPanel, {
    props: {
      conversation: { id: 44, branchId: 9, isCentralChannel: true, operationalBranchId: 2,
        attentionMode: 'human', assignedUserId: 7, attentionRevision: 6, ...overrides } as WhatsAppConversation,
    },
    global: { plugins: [pinia], stubs: { OrderSidebar: Editor, BaseDialog: Dialog, OrderDetailContent: true,
      WhatsAppOrderQuickActions: { props: ['orderId', 'active'], emits: ['manage'],
        template: '<button @click="$emit(\'manage\')">Gestionar pedido #{{ orderId }}</button>' },
    } },
  })
  wrapper = mounted
  await flushPromises()
  return mounted
}
async function click(label: string) {
  const button = wrapper?.findAll('button').find(item => item.text() === label)
  expect(button).toBeDefined()
  await button!.trigger('click')
  await flushPromises()
}

it('confirms the shared order in one click and preserves the POS draft', async () => {
  const pos = useOrdersDraftsStore()
  pos.draftOrders.set('pos', createOrderDraft('pos', 'POS', 1))
  pos.currentTabId = 'pos'
  await panel()
  expect(editor.currentOrder).toMatchObject({ branchId: 2, workspaceBranchId: 1, addressId: 31, deliveryFee: 6000, total: 26000 })
  await click('Confirmar pedido')
  expect(api.commercialDraftAction).toHaveBeenCalledWith(44, 'confirm', {
    sessionId: 81, expectedVersion: 3, attentionVersion: 6,
  })
  expect(wrapper!.find('[role="dialog"]').exists()).toBe(false)
  expect(wrapper!.text()).toContain('Pedido tomado · #501')
  expect(wrapper!.text()).not.toContain('Confirmación por WhatsApp')
  expect(pos.currentTabId).toBe('pos')
})

it('recovers an already persisted order after a confirmation timeout', async () => {
  await panel()
  api.commercialDraftAction.mockImplementationOnce(async () => {
    shared = { ...shared, status: 'completed', orderId: 501 }
    throw new Error('timeout')
  })
  await click('Confirmar pedido')
  expect(api.commercialDraftAction).toHaveBeenCalledTimes(1)
  expect(wrapper!.text()).toContain('Pedido tomado · #501')
})

it('blocks the editor for an observer', async () => {
  await panel({ assignedUserId: 8 })
  expect(wrapper!.get('fieldset').attributes('disabled')).toBeDefined()
  expect(api.commercialDraftAction).not.toHaveBeenCalled()
})

it('opens a previous order and discards only the active attempt when explicitly confirmed', async () => {
  api.getCommercialHistory.mockResolvedValue({ data: [
    { id: 81, orderId: null, createdAt: '2026-11-19T12:00:00Z' },
    { id: 80, orderId: 501, createdAt: '2026-11-18T12:00:00Z' },
  ] })
  api.commercialDraftAction.mockResolvedValue({ data: { ...shared, status: 'cancelled', commercialStatus: 'no_sale', version: 4 } })
  const view = await panel()
  const row = view.get('.order-history details')
  ;(row.element as HTMLDetailsElement).open = true
  await row.trigger('toggle')
  await flushPromises()
  await row.get('li button').trigger('click')
  await flushPromises()
  expect(details.fetchById).toHaveBeenCalledExactlyOnceWith(501)
  expect(editor.currentOrder?.orderItems[0]?.quantity).toBe(2)
  expect(api.commercialDraftAction).not.toHaveBeenCalled()

  await click('Descartar borrador')
  await view.findAll('[role="dialog"] button').find(button => button.text() === 'Descartar borrador')!.trigger('click')
  await flushPromises()
  expect(api.commercialDraftAction).toHaveBeenCalledExactlyOnceWith(44, 'cancel', {
    sessionId: 81, expectedVersion: 3, attentionVersion: 6, note: undefined,
  })
  expect(view.find('fieldset').exists()).toBe(false)
  expect(view.text()).toContain('Pedido #501')
})

it('opens a legacy first draft automatically only for the person attending', async () => {
  api.getCommercialDraft.mockResolvedValue({ data: null })
  api.startCommercialDraft.mockResolvedValue({ data: { ...session(), order: { ...session().order, orderDetails: [] } } })
  const view = await panel({ assignedUserId: null })
  expect(api.startCommercialDraft).not.toHaveBeenCalled()
  expect(view.text()).not.toContain('Iniciar pedido')
  await view.setProps({ conversation: { ...view.props().conversation, assignedUserId: 7, attentionRevision: 7 } })
  await flushPromises()
  expect(api.startCommercialDraft).toHaveBeenCalledExactlyOnceWith(44, { sessionId: 0, expectedVersion: 0, attentionVersion: 7 })
  expect(editor.currentOrder?.orderItems).toEqual([])
  expect(view.get('fieldset').attributes('disabled')).toBeUndefined()
})

it('loads the latest saved draft when taking over and locks it when reassigned', async () => {
  const view = await panel({ assignedUserId: 8 })
  shared = { ...shared, version: 4, order: { ...shared.order, orderDetails: [{ productId: 88, quantity: 3, unitPrice: 10000 }] } }
  await view.setProps({ conversation: { ...view.props().conversation, assignedUserId: 7, attentionRevision: 7 } })
  await flushPromises()
  expect(api.startCommercialDraft).not.toHaveBeenCalled()
  expect(editor.currentOrder?.orderItems[0]?.quantity).toBe(3)
  expect(view.get('fieldset').attributes('disabled')).toBeUndefined()
  await view.setProps({ conversation: { ...view.props().conversation, assignedUserId: 8, attentionRevision: 8 } })
  expect(view.get('fieldset').attributes('disabled')).toBeDefined()
})

it('starts a new versioned attempt after a confirmed order', async () => {
  shared = { ...shared, status: 'completed', orderId: 501 }
  api.startCommercialDraft.mockResolvedValue({ data: { ...session(), sessionId: 82,
    order: { ...session().order, orderDetails: [] } } })
  await panel()
  await click('Nuevo pedido')
  await click('Iniciar nuevo pedido')
  expect(api.startCommercialDraft).toHaveBeenCalledWith(44, { sessionId: 81, expectedVersion: 3, attentionVersion: 6 })
  expect(editor.currentOrder?.orderItems).toEqual([])
})

it('keeps opening the confirmed order from the quick actions component', async () => {
  shared = { ...shared, status: 'completed', orderId: 501 }
  await panel()
  await click('Gestionar pedido #501')
  expect(details.fetchById).toHaveBeenCalledExactlyOnceWith(501)
  expect(wrapper!.find('[role="dialog"]').exists()).toBe(true)
})

it('requires an explicit destination on an unrouted central conversation', async () => {
  shared.order.branchId = 0
  await panel({ operationalBranchId: null })
  expect(editor.currentOrder?.branchId).toBeNull()
})

it('restores the preparation branch when the older editor snapshot has no branch', async () => {
  shared.order.branchId = 1
  shared.editor = { ...createOrderDraft('legacy', 'WhatsApp', 1), branchId: null }
  await panel({ isCentralChannel: false, branchId: 1, operationalBranchId: null })
  expect(editor.currentOrder?.branchId).toBe(1)
})

it('retries an eligible message without recreating the confirmed order', async () => {
  shared = { ...shared, status: 'completed', orderId: 501,
    confirmationStatus: 'failed', confirmationError: 'provider_rejected_retryable' }
  await panel()
  expect(wrapper!.text()).toContain('El pedido ya existe')
  await click('Reintentar mensaje')
  expect(api.commercialDraftAction).toHaveBeenCalledOnce()
  expect(api.commercialDraftAction).toHaveBeenCalledWith(44, 'retry-message',
    expect.objectContaining({ sessionId: 81, expectedVersion: 3 }))
})

it.each([{ addresses: [] }, { addresses: undefined }])('only fetches addresses when the customer response omitted them', async ({ addresses }) => {
  customer.getCustomerById.mockResolvedValue({ data: { id: 12, name: 'Cliente', addresses } })
  await panel()
  expect(customer.getCustomerAddresses).toHaveBeenCalledTimes(addresses === undefined ? 1 : 0)
})
