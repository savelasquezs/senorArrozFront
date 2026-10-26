import { config, flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderSidebar from '../OrderSidebar.vue'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { DateTimeService } from '@/services/domain/DateTimeService'

const harness = vi.hoisted(() => ({ store: {} as Record<string, any>, submit: vi.fn(), closeTab: vi.fn() }))
vi.mock('@/composables/useOrderPersistence', () => ({ useOrderPersistence: () => ({ ordersStore: harness.store }) }))
vi.mock('@/composables/useOrderSubmission', () => ({ useOrderSubmission: () => ({ submitOrder: harness.submit }) }))
vi.mock('@/composables/useOrderTabs', () => ({ useOrderTabs: () => ({ createNewTab: vi.fn(), closeTab: harness.closeTab }) }))
vi.mock('@/composables/useOrderValidation', async () => { const { ref } = await import('vue'); return { useOrderValidation: () => ({ canSubmitOrder: ref(true), orderErrors: ref([]) }) } })
vi.mock('@/composables/useOrderBenefitResolver', async () => { const { ref } = await import('vue'); return { useOrderBenefitResolver: () => ({ activeDailyPromotion: ref(null), activeLoyaltyStep: ref(null), activeDiscountCode: ref(null), conflictExists: ref(false), copyMessage: ref(''), resolveBenefits: vi.fn(), applyDailyPromotion: vi.fn(), applyLoyaltyBenefit: vi.fn(), applyDiscountCode: vi.fn(), clearAppliedBenefit: vi.fn() }) } })
vi.mock('@/composables/useCustomerOrderDateConflict', () => ({ findCustomerOrdersOnSameBusinessDate: vi.fn().mockResolvedValue([]) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { availability: vi.fn() } }))
const stubs = {
    OrderTabs: true, CustomerSection: true, BillingRecipientAccess: true, OrderFulfillmentBranchSelector: true,
    OrderItemList: true, PaymentSelector: true, PaidInStoreCashPanel: true, CustomerDetailModal: true,
    VueDatePickerRoot: { name: 'VueDatePickerRoot', props: ['modelValue'], emits: ['update:model-value'], template: '<input class="time-picker-stub" />' },
    BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /><slot name="footer" /></div>' },
}
describe('OrderSidebar', () => {
    beforeEach(() => {
        const pinia = createPinia(); setActivePinia(pinia); config.global.plugins = [pinia]; vi.clearAllMocks()
        harness.store = reactive(harness.store)
        Object.assign(harness.store, { updateOrderNotes: vi.fn(notes => { harness.store.currentOrder.notes = notes }), currentTabId: 'one', activeBranchId: 1, customers: [], saveToLocalStorage: vi.fn(), currentOrder: { tabId: 'one', branchId: 1, type: 'onsite', customerId: null, isLater: false, orderItems: [{ productId: 1, productName: 'Arroz', quantity: 1, unitPrice: 10000, subtotal: 10000, discount: 0 }], bankPayments: [], subtotal: 10000, total: 10000, discountTotal: 0, deliveryFee: 0, createdAt: new Date(), billingRecipient: { documentType: 3, identification: '123', name: 'Cliente', email: 'cliente@example.com' } } })
        Object.assign(harness.store, {
            updateIsLater: vi.fn(value => Object.assign(harness.store.currentOrder, {
                isLater: value, ...(value ? {} : { prepareAt: null, reservedFor: null }),
            })),
            updatePrepareAt: vi.fn(value => { harness.store.currentOrder.prepareAt = value }),
            updateReservedFor: vi.fn(value => { harness.store.currentOrder.reservedFor = value }),
        })
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
    it('keeps the total and send action outside the scroll with payments and hours directly available', () => {
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        expect(wrapper.get('payment-selector-stub').element.closest('details')).toBeNull()
        expect(wrapper.get('[data-test="sidebar-schedule"]').findAll('.time-picker-stub')).toHaveLength(2)
        expect(wrapper.get('[data-test="sidebar-schedule"]').find('input[type="checkbox"]').exists()).toBe(false)
        const footer = wrapper.get('[data-test="sidebar-footer"]')
        expect(footer.text()).toContain('10.000')
        expect(footer.findAll('button').some(button => button.text().includes('Enviar Pedido'))).toBe(true)
        expect(wrapper.get('[data-test="sidebar-scroll"]').find('[data-test="sidebar-footer"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('blocks sending while a payment is being edited and resets the block for another draft', async () => {
        harness.store.currentOrder.billingRecipient = null
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        const send = wrapper.findAll('button').find(button => button.text().includes('Enviar Pedido'))!
        wrapper.getComponent({ name: 'PaymentSelector' }).vm.$emit('editingChanged', true)
        await flushPromises()
        expect(send.attributes('disabled')).toBeDefined()
        expect(send.attributes('title')).toContain('Guarda o cancela')
        await send.trigger('click')
        expect(harness.submit).not.toHaveBeenCalled()

        harness.store.currentTabId = 'two'
        harness.store.currentOrder = { ...harness.store.currentOrder, tabId: 'two' }
        await flushPromises()
        expect(send.attributes('disabled')).toBeUndefined()
        wrapper.getComponent({ name: 'PaymentSelector' }).vm.$emit('editingChanged', true)
        await flushPromises()
        expect(send.attributes('disabled')).toBeDefined()
        wrapper.getComponent({ name: 'PaymentSelector' }).vm.$emit('editingChanged', false)
        await flushPromises()
        expect(send.attributes('disabled')).toBeUndefined()
        await send.trigger('click'); await flushPromises()
        expect(harness.submit).toHaveBeenCalledTimes(1)
        wrapper.unmount()
    })

    it('cancels note edits and closes the draft when switching order tabs', async () => {
        harness.store.currentOrder.notes = 'Original'
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        await wrapper.get('textarea').setValue('Borrador sin guardar')
        await wrapper.findAll('button').find(button => button.text() === 'Cancelar')!.trigger('click')
        expect(harness.store.updateOrderNotes).not.toHaveBeenCalled()
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Original')
        harness.store.currentTabId = 'two'
        harness.store.currentOrder = { ...harness.store.currentOrder, tabId: 'two', notes: 'Otro pedido' }
        await flushPromises()
        expect(wrapper.find('textarea').exists()).toBe(false)
        expect(harness.store.currentOrder.notes).toBe('Otro pedido')
        wrapper.unmount()
    })

    it('keeps reservation date and hour fields available without altering the saved schedule', () => {
        const prepareAt = new Date('2026-11-05T16:00:00Z')
        const reservedFor = new Date('2026-11-05T17:00:00Z')
        Object.assign(harness.store.currentOrder, { type: 'reservation', prepareAt, reservedFor })
        const wrapper = mount(OrderSidebar, { global: { stubs: { ...stubs, OrderScheduleFields: true } } })
        const schedule = wrapper.get('[data-test="sidebar-schedule"]')
        expect(harness.store.currentOrder.prepareAt).toEqual(prepareAt)
        expect(harness.store.currentOrder.reservedFor).toEqual(reservedFor)
        expect(schedule.findComponent({ name: 'OrderScheduleFields' }).exists()).toBe(true)
        wrapper.unmount()
    })

    it('programs on preparation selection, suggests one hour and submits a manually adjusted delivery', async () => {
        harness.store.currentOrder.billingRecipient = null
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        const [prepare, delivery] = wrapper.findAllComponents({ name: 'VueDatePickerRoot' })
        prepare!.vm.$emit('update:model-value', { hours: 12, minutes: 15 })
        await flushPromises()
        expect(harness.store.currentOrder.isLater).toBe(true)
        expect(DateTimeService.dateToLocalHour(harness.store.currentOrder.prepareAt)).toEqual({ hours: 12, minutes: 15, seconds: 0 })
        expect(DateTimeService.dateToLocalHour(harness.store.currentOrder.reservedFor)).toEqual({ hours: 13, minutes: 15, seconds: 0 })
        delivery!.vm.$emit('update:model-value', { hours: 13, minutes: 45 })
        await flushPromises()
        await wrapper.findAll('button').find(button => button.text().includes('Enviar Pedido'))!.trigger('click')
        await flushPromises()
        expect(harness.submit).toHaveBeenCalledTimes(1)
        const sent = harness.submit.mock.calls[0]![0]
        expect(DateTimeService.dateToLocalHour(sent.prepareAt)).toEqual({ hours: 12, minutes: 15, seconds: 0 })
        expect(DateTimeService.dateToLocalHour(sent.reservedFor)).toEqual({ hours: 13, minutes: 45, seconds: 0 })
        wrapper.unmount()
    })

    it('explains an incomplete schedule and returns to an immediate order when cleared', async () => {
        harness.store.currentOrder.billingRecipient = null
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        wrapper.findAllComponents({ name: 'VueDatePickerRoot' })[1]!.vm.$emit('update:model-value', { hours: 13, minutes: 0 })
        await flushPromises()
        expect(harness.store.currentOrder.isLater).toBe(true)
        expect(wrapper.get('[data-test="sidebar-schedule"] [role="alert"]').text()).toContain('preparación')
        const send = wrapper.findAll('button').find(button => button.text().includes('Enviar Pedido'))!
        expect(send.attributes('disabled')).toBeDefined()
        await send.trigger('click')
        expect(harness.submit).not.toHaveBeenCalled()
        await wrapper.get('[aria-label="Quitar programación"]').trigger('click')
        expect(harness.store.currentOrder).toMatchObject({ isLater: false, prepareAt: null, reservedFor: null })
        expect(wrapper.get('[data-test="sidebar-schedule"]').find('[role="alert"]').exists()).toBe(false)
        expect(send.attributes('disabled')).toBeUndefined()
        await send.trigger('click'); await flushPromises()
        expect(harness.submit.mock.calls[0]![0]).toMatchObject({ isLater: false, prepareAt: null, reservedFor: null })
        wrapper.unmount()
    })

    it('restores each draft schedule when changing tabs and keeps cleared hours empty on return', async () => {
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        wrapper.findAllComponents({ name: 'VueDatePickerRoot' })[0]!.vm.$emit('update:model-value', { hours: 12, minutes: 30 })
        await flushPromises()
        const first = harness.store.currentOrder
        const second = { ...first, tabId: 'two', isLater: false, prepareAt: null, reservedFor: null }
        harness.store.currentTabId = 'two'; harness.store.currentOrder = second
        await flushPromises()
        expect(wrapper.findAllComponents({ name: 'VueDatePickerRoot' }).map(picker => picker.props('modelValue'))).toEqual([null, null])
        harness.store.currentTabId = 'one'; harness.store.currentOrder = first
        await flushPromises()
        expect(wrapper.findAllComponents({ name: 'VueDatePickerRoot' }).map(picker => picker.props('modelValue'))).toEqual([
            { hours: 12, minutes: 30, seconds: 0 }, { hours: 13, minutes: 30, seconds: 0 },
        ])
        await wrapper.get('[aria-label="Quitar programación"]').trigger('click')
        harness.store.currentTabId = 'two'; harness.store.currentOrder = second
        await flushPromises()
        harness.store.currentTabId = 'one'; harness.store.currentOrder = first
        await flushPromises()
        expect(wrapper.findAllComponents({ name: 'VueDatePickerRoot' }).map(picker => picker.props('modelValue'))).toEqual([null, null])
        expect(first.isLater).toBe(false)
        wrapper.unmount()
    })

    it('requires an explicit delivery hour when the one-hour suggestion would leave today', async () => {
        const wrapper = mount(OrderSidebar, { global: { stubs } })
        wrapper.findAllComponents({ name: 'VueDatePickerRoot' })[0]!.vm.$emit('update:model-value', { hours: 23, minutes: 30 })
        await flushPromises()
        expect(harness.store.currentOrder.prepareAt.getTime()).not.toBeNaN()
        expect(harness.store.currentOrder.reservedFor).toBeNull()
        expect(wrapper.get('[data-test="sidebar-schedule"] [role="alert"]').text()).toContain('entrega')
        expect(wrapper.findAll('button').find(button => button.text().includes('Enviar Pedido'))!.attributes('disabled')).toBeDefined()
        wrapper.unmount()
    })

})
