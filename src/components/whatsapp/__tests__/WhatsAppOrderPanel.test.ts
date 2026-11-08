import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import WhatsAppOrderPanel from '../WhatsAppOrderPanel.vue'
import { useOrderEditorStore } from '@/composables/useOrderEditor'
import { useOrderSubmission } from '@/composables/useOrderSubmission'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useAuthStore } from '@/store/auth'
import { createOrderDraft } from '@/helpers/orderDraft'
import type { Customer, CustomerAddress } from '@/types/customer'
import type { WhatsAppConversation, WhatsAppOrderDraft } from '@/types/whatsapp'
import { UserRole } from '@/types/auth'

const deps = vi.hoisted(() => ({ create: vi.fn(), send: vi.fn(), getById: vi.fn(), stores: new Map<number, any>(), error: '' }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { createOrder: deps.create, getOrderById: deps.getById } }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: { sendMessage: deps.send } }))
vi.mock('@/store/banks', () => ({ useBanksStore: () => ({ ensureListLoaded: vi.fn(), options: [] }) }))
vi.mock('@/store/apps', () => ({ useAppsStore: () => ({ ensureListLoaded: vi.fn(), options: [] }) }))
vi.mock('@/store/branchPosSettings', () => ({ useBranchPosSettingsStore: () => ({ ensureForBranch: vi.fn(), maxFreeDeliveryDiscount: 0 }) }))
vi.mock('@/store/products', () => ({ useProductsStore: () => ({ ensureCatalogLoaded: vi.fn(), catalogProducts: [] }) }))
vi.mock('@/composables/useDraftCustomerHydration', async () => {
  const { ref } = await import('vue')
  return { useDraftCustomerHydration: () => ({ rehydrateCustomersFromDrafts: vi.fn(), customerHydrationPending: ref(false), customerHydrationIncomplete: ref(false) }) }
})
const Editor = defineComponent({ setup() {
  const store = useOrderEditorStore()
  deps.stores.set(store.currentOrder!.whatsappConversationId!, store)
  const { submitOrder } = useOrderSubmission()
  return () => h('button', { onClick: async () => {
    try { await submitOrder(store.currentOrder!) } catch (cause) { deps.error = (cause as Error).message }
  } }, 'Confirmar pedido')
} })
let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  deps.stores.clear()
  deps.error = ''
  const order = { id: 501, type: 'delivery', customerName: 'Cliente', total: 26000, deliveryFee: 6000, addressId: 31, addressDescription: 'Calle de prueba',
    orderDetails: [{ productId: 88, productName: 'Arroz', quantity: 2, unitPrice: 10000, discount: 0, notes: 'Sin cebolla' }] }
  deps.create.mockReset().mockResolvedValue(order)
  deps.getById.mockReset().mockResolvedValue(order)
  deps.send.mockReset().mockResolvedValue(undefined)
  useAuthStore().user = { id: 7, name: 'Caja', role: UserRole.CASHIER, branchId: 1, branchName: 'Origen', email: '', phone: '', active: true }
})
function panel(id = 44) {
  return mount(WhatsAppOrderPanel, {
    props: {
      conversation: { id, branchId: 9, isCentralChannel: true, operationalBranchId: 2, attentionMode: 'human', assignedUserId: 7 } as WhatsAppConversation,
      customer: { id: 12, name: 'Cliente', branchId: 9, addresses: [] } as unknown as Customer,
      address: { id: 31, address: 'Calle de prueba', deliveryFee: 3000, branchServices: [{ branchId: 2, deliveryFee: 6000, isCovered: true }] } as CustomerAddress,
      initialDraft: { orderType: 'delivery', items: [{ productId: 88, name: 'Arroz', quantity: 2, unitPrice: 10000, subtotal: 20000, notes: 'Sin cebolla' }] } as WhatsAppOrderDraft,
    },
    global: { plugins: [pinia], stubs: { OrderSidebar: Editor, BaseDialog: true } },
  })
}

it('confirms inside the chat using the destination tariff and preserves the separate POS draft', async () => {
  const pos = useOrdersDraftsStore()
  pos.draftOrders.set('pos', createOrderDraft('pos', 'POS', 1))
  pos.currentTabId = 'pos'
  const wrapper = panel()
  await flushPromises()
  expect(deps.stores.get(44).currentOrder).toMatchObject({ branchId: 2, workspaceBranchId: 1, addressId: 31, deliveryFee: 6000, total: 26000 })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(deps.create).toHaveBeenCalledWith(expect.objectContaining({ branchId: 2, whatsappConversationId: 44, deliveryFee: 6000,
    orderDetails: [expect.objectContaining({ productId: 88, quantity: 2, notes: 'Sin cebolla' })], posCreationKey: expect.any(String) }))
  expect(wrapper.text()).toContain('Pedido tomado · #501')
  expect(deps.send).toHaveBeenCalledWith(44, expect.stringContaining('Tu pedido #501 quedó confirmado:'))
  expect(wrapper.text()).toContain('Confirmación enviada por WhatsApp.')
  expect(pos.currentTabId).toBe('pos')
  expect(pos.currentOrder!.orderItems).toEqual([])
  wrapper.unmount()
})

it('restores each conversation draft and retains the creation key when retrying a timeout', async () => {
  const wrapper = panel()
  await flushPromises()
  deps.create.mockRejectedValueOnce(new Error('Timeout'))
  await wrapper.get('button').trigger('click')
  await flushPromises()
  const first = deps.create.mock.calls[0]![0]
  deps.stores.get(44).updateOrderNotes('Conservar esta nota')
  wrapper.unmount()
  const other = panel(45)
  await flushPromises()
  expect(deps.stores.get(45).currentOrder.notes).toBe('')
  other.unmount()
  const restored = panel()
  await flushPromises()
  expect(deps.stores.get(44).currentOrder.notes).toBe('Conservar esta nota')
  await restored.get('button').trigger('click')
  await flushPromises()
  expect(deps.create.mock.calls[1]![0].posCreationKey).toBe(first.posCreationKey)
  expect(restored.text()).toContain('Pedido tomado · #501')
  restored.unmount()
})

it('blocks confirmation after another advisor takes ownership', async () => {
  const wrapper = panel()
  await flushPromises()
  await wrapper.setProps({ conversation: { ...wrapper.props('conversation'), assignedUserId: 8 } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(deps.create).not.toHaveBeenCalled()
  expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
  wrapper.unmount()
})

it('starts a fresh order after confirmation without importing the old AI products again', async () => {
  const wrapper = panel()
  await flushPromises()
  await wrapper.get('button').trigger('click')
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'Nuevo pedido')!.trigger('click')
  await flushPromises()
  expect(deps.stores.get(44).currentOrder.orderItems).toEqual([])
  expect(deps.stores.get(44).currentOrder.posCreationKey).toBeUndefined()
  wrapper.unmount()
})

it('requires an explicit destination for an unrouted central conversation', async () => {
  const wrapper = panel()
  await flushPromises()
  deps.stores.get(44).currentOrder.branchId = null
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(deps.create).not.toHaveBeenCalled()
  expect(deps.error).toContain('sucursal no disponible')
  wrapper.unmount()
})

it('keeps the confirmed order when sending fails and retries only the WhatsApp message', async () => {
  const wrapper = panel()
  await flushPromises()
  deps.send.mockRejectedValueOnce(new Error('Timeout del proveedor'))
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Pedido tomado · #501')
  expect(wrapper.text()).toContain('El pedido ya existe')
  expect(deps.create).toHaveBeenCalledTimes(1)
  await wrapper.findAll('button').find(button => button.text() === 'Revisar envío y reenviar confirmación')!.trigger('click')
  await flushPromises()
  expect(deps.create).toHaveBeenCalledTimes(1)
  expect(deps.send).toHaveBeenCalledTimes(2)
  expect(wrapper.text()).toContain('Confirmación enviada por WhatsApp.')
  wrapper.unmount()
})

it.each([{ addressId: 31, label: 'Entrega programada:' }, { addressId: undefined, label: 'Recogida programada:' }])('confirms scheduled orders in Colombia: $label', async ({ addressId, label }) => {
  const order = await deps.getById()
  deps.create.mockResolvedValueOnce({ ...order, type: 'reservation', addressId, reservedFor: '2026-11-11T19:00:00Z' })
  const wrapper = panel()
  await flushPromises()
  await wrapper.get('button').trigger('click')
  await flushPromises()
  const message = deps.send.mock.calls[0]![1]
  expect(message).toContain(label)
  if (!addressId) { expect(message).not.toContain('Dirección:'); expect(message).not.toContain('Domicilio:') }
  expect(message).toContain('11 de noviembre de 2026')
  expect(message).not.toContain('Tiempo estimado:')
  wrapper.unmount()
})
