import { config, mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BillingRecipientAccess from '../BillingRecipientAccess.vue'
import BillingRecipientModal from '../BillingRecipientModal.vue'
import { billingRecipientEvent } from '@/composables/useBillingRecipients'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { createPinia, setActivePinia } from 'pinia'
import { useInvoiceResources } from '@/composables/useInvoiceResources'

vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { recipients: vi.fn(), saveRecipient: vi.fn(), lookup: vi.fn(), searchRecipients: vi.fn(), saveDirectoryRecipient: vi.fn() } }))
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
        expect((wrapper.get('input[autocomplete="organization"]').element as HTMLInputElement).value).toBe('Destinatario de prueba')
        expect((wrapper.get('input[type="email"]').element as HTMLInputElement).value).toBe('factura@example.com')
        expect(wrapper.get('[role="status"]').text()).toContain('Nombre y correo completados')
        expect(api.saveRecipient).not.toHaveBeenCalled()
        expect(wrapper.emitted('saved')).toBeUndefined()
        wrapper.unmount()
    })
    it('muestra la consulta vacía junto al botón y conserva los datos manuales', async () => {
        vi.mocked(api.lookup).mockResolvedValue({ isSuccess: true, data: { data: { customerName: null, customerEmail: '' } } } as never)
        const wrapper = mountLookup()
        await wrapper.get('input[autocomplete="organization"]').setValue('Nombre manual')
        await wrapper.get('input[type="email"]').setValue('manual@example.com')
        await wrapper.findAll('button').find(b => b.text() === 'Completar con datos DIAN')!.trigger('click')
        await flushPromises()
        expect(wrapper.get('[role="alert"]').text()).toContain('Verifica el tipo y número')
        expect(wrapper.get('button').element.nextElementSibling?.getAttribute('role')).toBe('alert')
        expect((wrapper.get('input[autocomplete="organization"]').element as HTMLInputElement).value).toBe('Nombre manual')
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
        expect((wrapper.get('input[autocomplete="organization"]').element as HTMLInputElement).value).toBe('')
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
        await wrapper.get('input[type="radio"][value="order"]').setValue(true)
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
        expect((wrapper.get('input[autocomplete="organization"]').element as HTMLInputElement).value).toBe('Empresa')
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
    it('reutiliza un destinatario local por NIT y no consulta ni guarda de nuevo en DIAN', async () => {
        const profile = { ...recipient, id: undefined, profileId: 22, profileVersion: '2026-10-22T19:00:00Z', tradeName: 'Metta', address: 'Sede fiscal' }
        vi.mocked(api.lookup).mockResolvedValue({ data: { source: 'directory', recipient: profile } } as never)
        const wrapper = mountLookup(6, recipient.identification)
        await wrapper.findAll('button').find(b => b.text() === 'Completar con datos DIAN')!.trigger('click'); await flushPromises()
        expect(wrapper.text()).toContain('sin consultar DIAN otra vez')
        expect((wrapper.get('input[autocomplete="organization"]').element as HTMLInputElement).readOnly).toBe(true)
        expect(wrapper.get('input[maxlength="300"]').element).toHaveProperty('value', 'Sede fiscal')
        expect(api.saveDirectoryRecipient).not.toHaveBeenCalled(); wrapper.unmount()
    })
    it('consulta el NIT escrito en el buscador y solo crea el registro al guardar', async () => {
        vi.mocked(api.searchRecipients).mockResolvedValue({ data: { items: [], totalPages: 0 } } as never)
        vi.mocked(api.lookup).mockResolvedValue({ data: { source: 'dian', data: { customerName: 'Empresa DIAN', customerEmail: 'empresa@example.com' } } } as never)
        vi.mocked(api.saveDirectoryRecipient).mockResolvedValue({ data: { ...recipient, profileId: 22, name: 'Empresa DIAN' } } as never)
        const wrapper = mountLookup()
        await wrapper.get('input[type="search"]').setValue('900507876')
        await wrapper.get('input[type="search"]').trigger('keydown', { key: 'Enter' }); await flushPromises()
        expect(api.lookup).toHaveBeenCalledWith(6, '900507876')
        expect(wrapper.get('input[autocomplete="organization"]').element).toHaveProperty('value', 'Empresa DIAN')
        expect(api.saveDirectoryRecipient).not.toHaveBeenCalled()
        await wrapper.get('form').trigger('submit'); await flushPromises()
        expect(api.saveDirectoryRecipient).toHaveBeenCalledWith(expect.objectContaining({ identification: '900507876', email: 'empresa@example.com' }))
        expect(api.saveRecipient).not.toHaveBeenCalled(); wrapper.unmount()
    })
    it('busca empresas de otros clientes y recuerda la misma identidad para el cliente actual', async () => {
        vi.useFakeTimers()
        try {
            const profile = { ...recipient, id: undefined, profileId: 22, profileVersion: '2026-10-22T19:00:00Z', tradeName: 'Metta' }
            vi.mocked(api.recipients).mockResolvedValue({ data: [] } as never)
            vi.mocked(api.searchRecipients).mockResolvedValue({ data: { items: [profile], totalPages: 1 } } as never)
            vi.mocked(api.saveRecipient).mockResolvedValue({ data: { ...profile, id: 44, isDefault: true } } as never)
            const wrapper = mount(BillingRecipientModal, { props: { modelValue: true, customerId: 20, orderContext: true }, global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } } })
            await wrapper.get('input[type="search"]').setValue('metta'); await vi.advanceTimersByTimeAsync(300); await flushPromises()
            expect(api.searchRecipients).toHaveBeenCalledWith('metta', 1)
            await wrapper.get('ul[aria-label="Destinatarios encontrados"] button').trigger('click'); await wrapper.get('form').trigger('submit'); await flushPromises()
            expect(api.saveRecipient).toHaveBeenCalledWith(20, expect.objectContaining({ profileId: 22, id: undefined }))
            expect(api.lookup).not.toHaveBeenCalled(); wrapper.unmount()
        } finally { vi.useRealTimers() }
    })
    it('una edición compartida exige confirmación y actualiza otros clientes conservando sus predeterminados', async () => {
        const profile = { ...recipient, profileId: 22, profileVersion: '2026-10-22T19:00:00Z' }
        const resources = useInvoiceResources(); resources.updateRecipient(30, { ...profile, id: 33, isDefault: false })
        vi.mocked(api.saveRecipient).mockResolvedValue({ data: { ...profile, name: 'Empresa corregida', profileVersion: '2026-10-22T20:00:00Z' } } as never)
        const wrapper = mount(BillingRecipientModal, { props: { modelValue: true, customerId: 10, recipient: profile }, global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } } })
        await flushPromises()
        await wrapper.findAll('button').find(b => b.text() === 'Editar datos compartidos')!.trigger('click')
        await wrapper.get('input[autocomplete="organization"]').setValue('Empresa corregida'); await wrapper.get('form').trigger('submit'); await flushPromises()
        expect(api.saveRecipient).not.toHaveBeenCalled(); expect(wrapper.text()).toContain('Revisa y confirma')
        await wrapper.findAll('input[type="checkbox"]')[0]!.setValue(true); await wrapper.get('form').trigger('submit'); await flushPromises()
        expect(api.saveRecipient).toHaveBeenCalledWith(10, expect.objectContaining({ confirmSharedUpdate: true, profileVersion: profile.profileVersion }))
        expect(resources.recipients[30]?.[0]).toMatchObject({ id: 33, isDefault: false, name: 'Empresa corregida' }); wrapper.unmount()
    })
    it('descarta resultados del directorio después de cerrar el modal', async () => {
        vi.useFakeTimers()
        try {
            let finish!: (value: never) => void
            vi.mocked(api.searchRecipients).mockReturnValue(new Promise(resolve => { finish = resolve }))
            const wrapper = mountLookup()
            await wrapper.get('input[type="search"]').setValue('Empresa'); await vi.advanceTimersByTimeAsync(300)
            await wrapper.setProps({ modelValue: false }); finish({ data: { items: [{ ...recipient, profileId: 22 }], totalPages: 1 } } as never); await flushPromises()
            expect(wrapper.find('ul[aria-label="Destinatarios encontrados"]').exists()).toBe(false); wrapper.unmount()
        } finally { vi.useRealTimers() }
    })
    it('permite una copia editada solo para el pedido sin modificar el perfil compartido', async () => {
        const profile = { ...recipient, profileId: 22, profileVersion: '2026-10-22T19:00:00Z' }
        const wrapper = mount(BillingRecipientModal, { props: { modelValue: true, customerId: 10, recipient: profile, orderContext: true }, global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } } })
        await flushPromises(); await wrapper.get('input[type="radio"][value="order"]').setValue(true)
        await wrapper.findAll('button').find(b => b.text() === 'Editar para este pedido')!.trigger('click')
        await wrapper.get('input[type="email"]').setValue('solo-pedido@example.com'); await wrapper.get('form').trigger('submit'); await flushPromises()
        expect(api.saveRecipient).not.toHaveBeenCalled(); expect(api.saveDirectoryRecipient).not.toHaveBeenCalled()
        expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ profileId: undefined, id: undefined, email: 'solo-pedido@example.com', isDefault: false }); wrapper.unmount()
    })
})
