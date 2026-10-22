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
    const mountLookup = (documentType = 3, identification = '12345678') => mount(BillingRecipientModal, {
        props: { modelValue: true, recipient: { documentType, identification, name: '', email: '' } },
        global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } },
    })
    it.each([[6, '900507876'], [3, '71366347'], [6, '830007355']])('completa el contrato real de Plemsi para tipo %s e identificación %s sin guardar ni emitir', async (type, identification) => {
        vi.mocked(api.lookup).mockResolvedValue({ isSuccess: true, data: { code: 200, success: true, data: { customerName: 'Destinatario de prueba', customerEmail: 'factura@example.com' } } } as never)
        const wrapper = mountLookup(type as number, identification as string)
        await wrapper.findAll('button').find(b => b.text() === 'Completar con datos DIAN')!.trigger('click')
        await flushPromises()
        expect(api.lookup).toHaveBeenCalledWith(type, identification)
        expect((wrapper.get('input[maxlength="200"]').element as HTMLInputElement).value).toBe('Destinatario de prueba')
        expect((wrapper.get('input[type="email"]').element as HTMLInputElement).value).toBe('factura@example.com')
        expect(wrapper.get('[role="status"]').text()).toContain('Nombre y correo completados')
        expect(api.saveRecipient).not.toHaveBeenCalled()
        expect(wrapper.emitted('saved')).toBeUndefined()
        wrapper.unmount()
    })
    it('muestra la consulta vacía junto al botón y conserva los datos manuales', async () => {
        vi.mocked(api.lookup).mockResolvedValue({ isSuccess: true, data: { data: { customerName: null, customerEmail: '' } } } as never)
        const wrapper = mountLookup()
        await wrapper.get('input[maxlength="200"]').setValue('Nombre manual')
        await wrapper.get('input[type="email"]').setValue('manual@example.com')
        await wrapper.findAll('button').find(b => b.text() === 'Completar con datos DIAN')!.trigger('click')
        await flushPromises()
        expect(wrapper.get('[role="alert"]').text()).toContain('Verifica el tipo y número')
        expect(wrapper.get('button').element.nextElementSibling?.getAttribute('role')).toBe('alert')
        expect((wrapper.get('input[maxlength="200"]').element as HTMLInputElement).value).toBe('Nombre manual')
        expect((wrapper.get('input[type="email"]').element as HTMLInputElement).value).toBe('manual@example.com')
        wrapper.unmount()
    })
    it('completa nombre sin borrar el correo manual cuando DIAN no devuelve correo', async () => {
        vi.mocked(api.lookup).mockResolvedValue({ isSuccess: true, data: { data: { customerName: 'Nombre DIAN', customerEmail: null } } } as never)
        const wrapper = mountLookup()
        await wrapper.get('input[type="email"]').setValue('manual@example.com')
        await wrapper.findAll('button').find(b => b.text() === 'Completar con datos DIAN')!.trigger('click')
        await flushPromises()
        expect(wrapper.text()).toContain('DIAN no devolvió un correo')
        expect((wrapper.get('input[type="email"]').element as HTMLInputElement).value).toBe('manual@example.com')
        wrapper.unmount()
    })
    it('descarta respuestas y errores de una identificación que cambió durante la consulta', async () => {
        let complete!: (value: never) => void
        vi.mocked(api.lookup).mockReturnValueOnce(new Promise(resolve => { complete = resolve }))
        const wrapper = mountLookup()
        await wrapper.findAll('button').find(b => b.text() === 'Completar con datos DIAN')!.trigger('click')
        expect(wrapper.text()).toContain('Consultando datos en DIAN')
        await wrapper.get('input[maxlength="32"]').setValue('87654321')
        complete({ data: { customerName: 'Otro destinatario', customerEmail: 'otro@example.com' } } as never)
        await flushPromises()
        expect((wrapper.get('input[maxlength="200"]').element as HTMLInputElement).value).toBe('')
        let fail!: (error: Error) => void
        vi.mocked(api.lookup).mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject }))
        await wrapper.findAll('button').find(b => b.text() === 'Completar con datos DIAN')!.trigger('click')
        await wrapper.get('select').setValue(6)
        fail(new Error('Error de la consulta anterior'))
        await flushPromises()
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        wrapper.unmount()
    })
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
