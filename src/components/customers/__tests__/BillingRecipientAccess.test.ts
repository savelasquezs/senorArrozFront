import { config, mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BillingRecipientAccess from '../BillingRecipientAccess.vue'
import BillingRecipientModal from '../BillingRecipientModal.vue'
import { billingRecipientEvent } from '@/composables/useBillingRecipients'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { recipients: vi.fn(), saveRecipient: vi.fn(), lookup: vi.fn() } }))
const recipient = { id: 1, documentType: 6, identification: '900123456', name: 'Empresa', email: 'factura@example.com', isDefault: true }
const stubs = { BillingRecipientModal: true }

describe('Datos de facturación reutilizables', () => {
    beforeEach(() => { const pinia = createPinia(); setActivePinia(pinia); config.global.plugins = [pinia]; vi.resetAllMocks(); vi.mocked(api.recipients).mockResolvedValue({ isSuccess: true, data: [recipient] } as never) })
    it('selecciona el predeterminado y actualiza los accesos abiertos al editarlo', async () => {
        const wrapper = mount(BillingRecipientAccess, { props: { customerId: 10 }, global: { stubs } })
        await flushPromises()
        expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(recipient)
        await wrapper.setProps({ modelValue: recipient })
        vi.mocked(api.recipients).mockResolvedValue({ isSuccess: true, data: [{ ...recipient, name: 'Empresa actualizada' }] } as never)
        window.dispatchEvent(new CustomEvent(billingRecipientEvent, { detail: 10 }))
        await flushPromises()
        expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toMatchObject({ name: 'Empresa actualizada' })
        wrapper.unmount()
    })
    it('cambiar cliente elimina la selección fiscal anterior', async () => {
        const wrapper = mount(BillingRecipientAccess, { props: { customerId: 10, modelValue: recipient }, global: { stubs } })
        await flushPromises()
        vi.mocked(api.recipients).mockResolvedValue({ isSuccess: true, data: [] } as never)
        await wrapper.setProps({ customerId: 20 })
        expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBeNull()
        wrapper.unmount()
    })
    it('guardar datos exclusivos del pedido no guarda cliente ni emite factura', async () => {
        const wrapper = mount(BillingRecipientModal, { props: { modelValue: true, recipient }, global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } } })
        await wrapper.get('form').trigger('submit')
        await flushPromises()
        expect(api.saveRecipient).not.toHaveBeenCalled()
        expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ identification: recipient.identification })
        expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe(false)
        wrapper.unmount()
    })
    it('el detalle del cliente abre su destinatario predeterminado aunque no exista selección del pedido', async () => {
        const wrapper = mount(BillingRecipientModal, { props: { modelValue: true, customerId: 10 }, global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } } })
        await flushPromises()
        expect((wrapper.get('input[maxlength="200"]').element as HTMLInputElement).value).toBe('Empresa')
        expect(wrapper.text()).toContain('Datos listos para solicitar factura.')
        wrapper.unmount()
    })
    it('los datos exclusivos del pedido dejan de vincularse al perfil editable del cliente', async () => {
        const wrapper = mount(BillingRecipientModal, { props: { modelValue: true, customerId: 10, recipient, orderContext: true }, global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } } })
        await flushPromises()
        await wrapper.findAll('input[type="radio"]')[1]!.setValue(true)
        await wrapper.get('form').trigger('submit'); await flushPromises()
        expect(api.saveRecipient).not.toHaveBeenCalled()
        expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ id: undefined, isDefault: false, name: recipient.name })
        wrapper.unmount()
    })
})
