import { config, mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OrderElectronicInvoicing from '../OrderElectronicInvoicing.vue'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import type { InvoiceDocument } from '@/types/electronicInvoicing'

vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { recipients: vi.fn(), availability: vi.fn(), documents: vi.fn(), request: vi.fn(), documentAction: vi.fn(), download: vi.fn() } }))
const current = { id: 1, documentType: 3, identification: '123', name: 'Nombre actual', email: 'actual@example.com', isDefault: true }
const documentRow: InvoiceDocument = { id: 1, kind: 'invoice', status: 'issued', environment: 'sandbox', prefix: 'SETT', number: 1, emailStatus: 'accepted', creditRequested: false, recipientJson: JSON.stringify({ Name: 'Destinatario histórico', Identification: '456', Email: 'historico@example.com' }), hasPdf: true, hasXml: true }
describe('Detalle fiscal del pedido', () => {
    beforeEach(() => {
        const pinia = createPinia(); setActivePinia(pinia); config.global.plugins = [pinia]; vi.resetAllMocks()
        vi.mocked(api.recipients).mockResolvedValue({ data: [current] } as never)
        vi.mocked(api.availability).mockResolvedValue({ data: { enabled: true } } as never)
        vi.mocked(api.documents).mockResolvedValue({ data: [documentRow] } as never)
    })
    afterEach(() => vi.useRealTimers())
    it('muestra el destinatario histórico y oculta reenvío si ese documento no tiene correo', async () => {
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises()
        expect(wrapper.get('article').text()).toContain('Destinatario histórico')
        expect(wrapper.get('article').text()).toContain('historico@example.com')
        expect(wrapper.get('article').text()).not.toContain('Nombre actual')
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, recipientJson: JSON.stringify({ Name: 'Sin correo' }) }] } as never)
        await wrapper.get('button').trigger('click'); await flushPromises()
        expect(wrapper.text()).not.toContain('Reenviar correo'); wrapper.unmount()
    })
    it('confirma la solicitud antes de llamar al backend', async () => {
        vi.mocked(api.documents).mockResolvedValue({ data: [] } as never)
        vi.mocked(api.request).mockResolvedValue({ data: {} } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises()
        const request = wrapper.findAll('button').find(b => b.text() === 'Solicitar factura electrónica')!
        await request.trigger('click'); await flushPromises()
        expect(api.request).not.toHaveBeenCalled()
        const confirm = document.querySelector('[role="dialog"]')!
        expect(confirm.textContent).toContain('actual@example.com')
        const confirmButton = [...confirm.querySelectorAll('button')].find(b => b.textContent?.includes('Confirmar factura'))!
        confirmButton.click(); await flushPromises()
        expect(api.request).toHaveBeenCalledTimes(1); expect(wrapper.text()).toContain('Solicitud guardada')
        wrapper.unmount()
    })
    it('conserva el historial aunque falle la consulta de disponibilidad', async () => {
        vi.mocked(api.availability).mockRejectedValue(new Error('No disponible'))
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises()
        expect(wrapper.get('article').text()).toContain('Destinatario histórico')
        expect(wrapper.text()).toContain('El historial sigue disponible')
        wrapper.unmount()
    })
    it('pausa la actualización cuando la pantalla está oculta y recupera al volver', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, status: 'verifying' }] } as never)
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises(); await vi.advanceTimersByTimeAsync(30000)
        expect(api.documents).toHaveBeenCalledTimes(1)
        visibility.mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange')); await flushPromises()
        expect(api.documents).toHaveBeenCalledTimes(2)
        wrapper.unmount(); visibility.mockRestore()
    })
})
