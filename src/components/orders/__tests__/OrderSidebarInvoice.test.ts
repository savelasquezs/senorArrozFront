import { config, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderSidebar from '../OrderSidebar.vue'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'

const harness = vi.hoisted(() => ({ store: {} as Record<string, any>, submit: vi.fn(), closeTab: vi.fn() }))
vi.mock('@/composables/useOrderPersistence', () => ({ useOrderPersistence: () => ({ ordersStore: harness.store }) }))
vi.mock('@/composables/useOrderSubmission', () => ({ useOrderSubmission: () => ({ submitOrder: harness.submit }) }))
vi.mock('@/composables/useOrderTabs', () => ({ useOrderTabs: () => ({ createNewTab: vi.fn(), closeTab: harness.closeTab }) }))
vi.mock('@/composables/useOrderValidation', async () => { const { ref } = await import('vue'); return { useOrderValidation: () => ({ canSubmitOrder: ref(true), orderErrors: ref([]) }) } })
vi.mock('@/composables/useOrderBenefitResolver', async () => { const { ref } = await import('vue'); return { useOrderBenefitResolver: () => ({ activeDailyPromotion: ref(null), activeLoyaltyStep: ref(null), activeDiscountCode: ref(null), conflictExists: ref(false), copyMessage: ref(''), resolveBenefits: vi.fn(), applyDailyPromotion: vi.fn(), applyLoyaltyBenefit: vi.fn(), applyDiscountCode: vi.fn(), clearAppliedBenefit: vi.fn() }) } })
vi.mock('@/composables/useCustomerOrderDateConflict', () => ({ findCustomerOrdersOnSameBusinessDate: vi.fn().mockResolvedValue([]) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { availability: vi.fn() } }))
const stubs = { OrderTabs: true, CustomerSection: true, BillingRecipientAccess: true, OrderFulfillmentBranchSelector: true, OrderItemList: true, PaymentSelector: true, PaidInStoreCashPanel: true, CustomerDetailModal: true, VueDatePicker: true, BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' } }
describe('Confirmación fiscal del cajero', () => {
    beforeEach(() => {
        const pinia = createPinia(); setActivePinia(pinia); config.global.plugins = [pinia]; vi.clearAllMocks()
        Object.assign(harness.store, { currentTabId: 'one', activeBranchId: 1, customers: [], saveToLocalStorage: vi.fn(), currentOrder: { tabId: 'one', branchId: 1, type: 'onsite', customerId: null, isLater: false, orderItems: [{ productId: 1, productName: 'Arroz', quantity: 1, unitPrice: 10000, subtotal: 10000, discount: 0 }], bankPayments: [], subtotal: 10000, total: 10000, discountTotal: 0, deliveryFee: 0, createdAt: new Date(), billingRecipient: { documentType: 3, identification: '123', name: 'Cliente', email: 'cliente@example.com' } } })
        harness.submit.mockResolvedValue(undefined)
    })
    it('una falla fiscal permite Solo pedido sin solicitar factura', async () => {
        vi.mocked(api.availability).mockRejectedValue(new Error('Proveedor no disponible'))
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        await wrapper.findAll('button').find(b => b.text().includes('Enviar Pedido'))!.trigger('click'); await flushPromises()
        expect(wrapper.text()).toContain('Puedes continuar con solo el pedido')
        expect(harness.submit).not.toHaveBeenCalled()
        expect(wrapper.findAll('button').find(b => b.text() === 'Enviar pedido y factura')!.attributes('disabled')).toBeDefined()
        await wrapper.findAll('button').find(b => b.text() === 'Solo pedido')!.trigger('click'); await flushPromises()
        expect(harness.submit).toHaveBeenCalledTimes(1)
        expect(harness.submit.mock.calls[0]![0].requestElectronicInvoice).toBe(false)
        expect(harness.closeTab).toHaveBeenCalledWith('one'); wrapper.unmount()
    })
    it('sin datos fiscales conserva el envío normal sin consultar disponibilidad', async () => {
        harness.store.currentOrder.billingRecipient = null
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        await wrapper.findAll('button').find(b => b.text().includes('Enviar Pedido'))!.trigger('click'); await flushPromises()
        expect(api.availability).not.toHaveBeenCalled(); expect(harness.submit).toHaveBeenCalledTimes(1); wrapper.unmount()
    })
})
