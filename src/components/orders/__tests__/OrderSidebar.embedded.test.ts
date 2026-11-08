import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, expect, it, vi } from 'vitest'
import OrderSidebar from '../OrderSidebar.vue'
import { provideOrderEditor } from '@/composables/useOrderEditor'
import { createOrderDraft } from '@/helpers/orderDraft'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useProductsStore } from '@/store/products'

vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ user: { id: 7 }, branchId: 1, userRole: 'Cashier', isCashier: true }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/composables/useOrderBenefitResolver', async () => {
  const { ref } = await import('vue')
  return { useOrderBenefitResolver: () => ({ activeDailyPromotion: ref(null), activeLoyaltyStep: ref(null), activeDiscountCode: ref(null), conflictExists: ref(false), copyMessage: ref(''), resolveBenefits: vi.fn(), applyDailyPromotion: vi.fn(), applyLoyaltyBenefit: vi.fn(), applyDiscountCode: vi.fn(), clearAppliedBenefit: vi.fn() }) }
})
let pinia: ReturnType<typeof createPinia>
beforeEach(() => { pinia = createPinia(); setActivePinia(pinia) })

it('uses the existing sidebar, product modal and payment selector on a scoped draft without changing POS', async () => {
  const pos = useOrdersDraftsStore()
  pos.draftOrders.set('pos', createOrderDraft('pos', 'POS', 1)); pos.currentTabId = 'pos'
  let editor!: ReturnType<typeof provideOrderEditor>
  const wrapper = mount(defineComponent({ setup() {
    editor = provideOrderEditor('embedded-order', vi.fn())
    const draft = createOrderDraft('chat-order', 'WhatsApp', 1)
    Object.assign(draft, { type: 'onsite', guestName: 'Recoge en otra sede', branchId: 2, whatsappConversationId: 1101 })
    editor.draftOrders.set(draft.tabId, draft); editor.currentTabId = draft.tabId
    return () => h(OrderSidebar)
  } }), { global: { plugins: [pinia], stubs: {
    OrderTabs: true, CustomerSection: true, BillingRecipientAccess: true, OrderFulfillmentBranchSelector: true,
    OrderItemList: true, PaymentSelector: true, CustomerDetailModal: true,
    AddProductModal: { name: 'AddProductModal', props: ['open', 'branchId'], template: '<div />' },
    BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' },
  } } })
  expect(wrapper.findComponent({ name: 'OrderTabs' }).exists()).toBe(false)
  expect(wrapper.text()).not.toContain('Pedido de esta conversación')
  expect(wrapper.findComponent({ name: 'PaymentSelector' }).props('order').tabId).toBe('chat-order')
  await wrapper.findAll('button').find(button => button.text() === 'Agregar productos')!.trigger('click')
  const modal = wrapper.findComponent({ name: 'AddProductModal' })
  expect(modal.props('open')).toBe(true)
  expect(modal.props('branchId')).toBe(2)
  modal.vm.$emit('products-added', [{ productId: 31, productName: 'Arroz', quantity: 2, unitPrice: 10000, discount: 0, notes: 'Sin cebolla' }])
  await flushPromises()
  expect(editor.currentOrder?.total).toBe(20000)
  expect(editor.currentOrder?.orderItems[0]?.notes).toBe('Sin cebolla')
  expect(pos.currentTabId).toBe('pos')
  expect(pos.currentOrder?.orderItems).toEqual([])
  expect(wrapper.text()).toContain('Confirmar pedido')
  const loadCatalog = vi.spyOn(useProductsStore(), 'ensureCatalogLoaded').mockResolvedValue(undefined)
  await wrapper.findAll('button').find(button => button.text() === 'Agregar')!.trigger('click')
  await flushPromises()
  expect(loadCatalog).toHaveBeenCalledWith(2)
  expect(wrapper.text()).toContain('Regalar producto')
  expect(wrapper.text()).not.toContain('Regalar domicilio')
  wrapper.unmount()
})
