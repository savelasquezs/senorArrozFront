import { config, mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OrderElectronicInvoicing from '../OrderElectronicInvoicing.vue'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import type { InvoiceDocument } from '@/types/electronicInvoicing'
import type { OrderDetailView } from '@/types/order'
import { invoiceOrderSummary, invoiceSnapshotSummary } from '@/helpers/invoicePresentation'

vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { recipients: vi.fn(), availability: vi.fn(), documents: vi.fn(), request: vi.fn(), documentAction: vi.fn(), download: vi.fn() } }))
const current = { id: 1, documentType: 3, identification: '123', name: 'Nombre actual', email: 'actual@example.com', isDefault: true }
const documentRow: InvoiceDocument = { id: 1, kind: 'invoice', status: 'issued', environment: 'sandbox', prefix: 'SETT', number: 1, emailStatus: 'accepted', creditRequested: false, recipientJson: JSON.stringify({ Name: 'Destinatario histórico', Identification: '456', Email: 'historico@example.com' }), hasPdf: true, hasXml: true }
const order = { id: 1, total: 23000, deliveryFee: 3000, bankPayments: [{ bankName: 'Bancolombia', amount: 10000 }], appPayments: [], notes: 'Sin cebolla', orderDetails: [{ productName: 'Arroz familiar', quantity: 2, unitPrice: 12000, discount: 4000 }] } as unknown as OrderDetailView
async function openHistory(wrapper: ReturnType<typeof mount>) {
    await wrapper.findAll('button').find(b => b.text().includes('Ver avance y detalle'))!.trigger('click')
    await flushPromises()
    return document.querySelector('[role="dialog"]')!
}
describe('Detalle fiscal del pedido', () => {
    beforeEach(() => {
        const pinia = createPinia(); setActivePinia(pinia); config.global.plugins = [pinia]; vi.resetAllMocks()
        vi.mocked(api.recipients).mockResolvedValue({ data: [current] } as never)
        vi.mocked(api.availability).mockResolvedValue({ data: { enabled: true } } as never)
        vi.mocked(api.documents).mockResolvedValue({ data: [documentRow] } as never)
    })
    afterEach(() => vi.useRealTimers())
    it.each([
        ['delivered', 'Correo entregado', 'done'], ['bounced', 'Correo rebotado', 'error'],
        ['delayed', 'Entrega demorada', 'active'], ['failed', 'Correo no entregado', 'error'],
    ])('muestra confirmación %s sin cambiar validación DIAN', async (status, label, state) => {
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, emailChannel: 'application', emailStatus: 'sent', emailDelivery: { status, occurredAt: '2026-10-23T02:20:00Z', error: status === 'bounced' ? 'Mailbox unavailable' : null } }] } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, status: 'delivered' } })
        await flushPromises()
        const steps = wrapper.findAll('[aria-label="Avance de la factura"] li')
        expect(steps[2]!.attributes('data-state')).toBe('done')
        expect(steps[3]!.text()).toContain(label)
        expect(steps[3]!.attributes('data-state')).toBe(state)
        const dialog = await openHistory(wrapper)
        if (status === 'bounced') expect(dialog.textContent).toContain('Mailbox unavailable')
        if (status === 'delayed') expect([...dialog.querySelectorAll('button')].find(b => b.textContent?.includes('Entrega en curso'))!.disabled).toBe(true)
        expect(api.documentAction).not.toHaveBeenCalled()
        expect(api.request).not.toHaveBeenCalled()
        wrapper.unmount()
    })
    it('actualiza automáticamente el correo aceptado hasta confirmar entrega y detiene las consultas después', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
        const row = { ...documentRow, emailStatus: 'sent', emailChannel: 'application', emailSentAt: new Date().toISOString() }
        vi.mocked(api.documents).mockResolvedValueOnce({ data: [row] } as never)
            .mockResolvedValue({ data: [{ ...row, emailDelivery: { status: 'delivered' } }] } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, status: 'delivered' } })
        await flushPromises()
        expect(wrapper.text()).toContain('Correo aceptado para envío')
        await vi.advanceTimersByTimeAsync(10000); await flushPromises()
        expect(wrapper.text()).toContain('Correo entregado')
        await vi.advanceTimersByTimeAsync(30000); await flushPromises()
        expect(api.documents).toHaveBeenCalledTimes(2)
        wrapper.unmount()
    })
    it('confirma un reenvío propio y advierte sobre la copia histórica de Plemsi', async () => {
        vi.mocked(api.documentAction).mockResolvedValue({ data: {} } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'delivered' } })
        await flushPromises()
        const history = await openHistory(wrapper)
        ;[...history.querySelectorAll('button')].find(b => b.textContent === 'Reenviar correo')!.click()
        await flushPromises()
        expect(api.documentAction).not.toHaveBeenCalled()
        const confirm = [...document.querySelectorAll('[role="dialog"]')].find(d => d.textContent?.includes('Confirmar reenvío'))!
        expect(confirm.textContent).toContain('historico@example.com')
        expect(confirm.textContent).toContain('Plemsi ya envió una copia')
        ;[...confirm.querySelectorAll('button')].find(b => b.textContent === 'Confirmar reenvío')!.click()
        await flushPromises()
        expect(api.documentAction).toHaveBeenCalledWith(1, 'email')
        expect(api.request).not.toHaveBeenCalled()
        wrapper.unmount()
    })
    it.each(['queued', 'verifying'])('impide otro correo mientras está %s', async emailStatus => {
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, emailChannel: 'application', emailStatus }] } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, status: 'delivered' } })
        await flushPromises()
        const history = await openHistory(wrapper)
        const email = [...history.querySelectorAll('button')].find(b => /Correo en cola|Envío por verificar/.test(b.textContent ?? ''))!
        expect(email.disabled).toBe(true)
        expect(api.documentAction).not.toHaveBeenCalled()
        wrapper.unmount()
    })
    it('muestra el destinatario histórico y oculta reenvío si ese documento no tiene correo', async () => {
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises()
        const history = await openHistory(wrapper)
        expect(history.querySelector('article')!.textContent).toContain('Destinatario histórico')
        expect(history.querySelector('article')!.textContent).toContain('historico@example.com')
        expect(history.querySelector('article')!.textContent).not.toContain('Nombre actual')
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, recipientJson: JSON.stringify({ Name: 'Sin correo' }) }] } as never)
        await wrapper.findAll('button').find(b => b.text() === 'Actualizar')!.trigger('click'); await flushPromises()
        expect(history.textContent).not.toContain('Reenviar correo'); wrapper.unmount()
    })
    it('confirma la solicitud antes de llamar al backend', async () => {
        vi.mocked(api.documents).mockResolvedValue({ data: [] } as never)
        vi.mocked(api.request).mockResolvedValue({ data: {} } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken', order } })
        await flushPromises()
        const request = wrapper.findAll('button').find(b => b.text() === 'Solicitar factura electrónica')!
        await request.trigger('click'); await flushPromises()
        expect(api.request).not.toHaveBeenCalled()
        const confirm = document.querySelector('[role="dialog"]')!
        expect(confirm.textContent).toContain('actual@example.com')
        expect(confirm.textContent).toContain('Arroz familiar')
        expect(confirm.textContent).toContain('Bancolombia')
        expect(confirm.textContent).toContain('Domicilio')
        expect(confirm.textContent).toContain('23.000')
        expect(confirm.textContent).toContain('Descuentos')
        const confirmButton = [...confirm.querySelectorAll('button')].find(b => b.textContent?.includes('Confirmar factura'))!
        confirmButton.click(); await flushPromises()
        expect(api.request).toHaveBeenCalledTimes(1); expect(wrapper.text()).toContain('Solicitud guardada')
        wrapper.unmount()
    })
    it('conserva el historial aunque falle la consulta de disponibilidad', async () => {
        vi.mocked(api.availability).mockRejectedValue(new Error('No disponible'))
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises()
        expect((await openHistory(wrapper)).textContent).toContain('Destinatario histórico')
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
    it('bloquea confirmar un pedido que cambió mientras se revisaba', async () => {
        vi.mocked(api.documents).mockResolvedValue({ data: [] } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken', order } })
        await flushPromises()
        await wrapper.findAll('button').find(b => b.text() === 'Solicitar factura electrónica')!.trigger('click')
        await wrapper.setProps({ stale: true })
        const dialog = document.querySelector('[role="dialog"]')!
        expect(dialog.textContent).toContain('El pedido cambió')
        expect([...dialog.querySelectorAll('button')].find(b => b.textContent?.includes('Confirmar factura'))!.disabled).toBe(true)
        expect(api.request).not.toHaveBeenCalled()
        wrapper.unmount()
    })
    it.each(['pending', 'processing', 'verifying', 'rejected'])('no da por validada la DIAN para un documento %s', async status => {
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, status, emailStatus: 'pending', hasPdf: false, submittedAt: '2026-10-22T18:00:00Z' }] } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises()
        const steps = wrapper.findAll('[aria-label="Avance de la factura"] li')
        expect(steps[2]!.attributes('data-state')).toBe('pending')
        expect(steps[3]!.attributes('data-state')).not.toBe('done')
        expect(wrapper.text()).not.toContain('Descargar copia PDF')
        wrapper.unmount()
    })
    it('conserva validación DIAN aunque falle el correo y permite descargar la copia oficial', async () => {
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, emailStatus: 'pending', lastError: 'Error de correo' }] } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken' } })
        await flushPromises()
        expect(wrapper.findAll('[aria-label="Avance de la factura"] li')[2]!.attributes('data-state')).toBe('done')
        expect(wrapper.findAll('[aria-label="Avance de la factura"] li')[3]!.attributes('data-state')).toBe('active')
        await wrapper.findAll('button').find(b => b.text() === 'Descargar copia PDF')!.trigger('click')
        await flushPromises()
        expect(api.download).toHaveBeenCalledWith(1, 'pdf', 'SETT1')
        expect(api.request).not.toHaveBeenCalled()
        wrapper.unmount()
    })
    it('identifica el rechazo DIAN, muestra cada regla y reintenta el mismo documento con los datos elegidos', async () => {
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, status: 'rejected', dianRejected: true, hasPdf: false, hasXml: false, emailStatus: 'pending', submittedAt: '2026-10-22T18:00:00Z', lastError: 'DIAN rechazó el documento:\nRegla: FAU04, Rechazo: Base inválida.\nRegla: FAK24, Rechazo: DV inválido.' }] } as never)
        vi.mocked(api.documentAction).mockResolvedValue({ data: {} } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'delivered', order } })
        await flushPromises()
        const dialog = await openHistory(wrapper)
        const steps = dialog.querySelectorAll('[aria-label="Avance de la factura"] li')
        expect(steps[1]!.getAttribute('data-state')).toBe('done')
        expect(steps[2]!.getAttribute('data-state')).toBe('error')
        expect(dialog.querySelector('[role="alert"]')!.textContent).toContain('\nRegla: FAK24')
        expect(dialog.textContent).not.toContain('Descargar copia PDF')
        expect(dialog.textContent).not.toContain('no confirma todavía la recepción')
        const retry = [...dialog.querySelectorAll('button')].find(b => b.textContent?.includes('Reintentar con los datos seleccionados'))!
        retry.click(); await flushPromises()
        expect(api.documentAction).toHaveBeenCalledWith(1, 'retry', current)
        expect(wrapper.text()).toContain('Reintento solicitado con los datos corregidos y el mismo consecutivo.')
        expect(api.request).not.toHaveBeenCalled()
        wrapper.unmount()
    })
    it('usa importes históricos en el detalle y no los actuales del pedido', async () => {
        vi.mocked(api.documents).mockResolvedValue({ data: [{ ...documentRow, snapshotJson: JSON.stringify({ order: { Id: 1, Total: 5000, DeliveryFee: 0, lines: [{ name: 'Producto histórico', Quantity: 1, UnitPrice: 5000, Discount: 0 }] } }) }] } as never)
        const wrapper = mount(OrderElectronicInvoicing, { props: { orderId: 1, customerId: 10, status: 'taken', order } })
        await flushPromises()
        const dialog = await openHistory(wrapper)
        expect(dialog.textContent).toContain('Producto histórico')
        expect(dialog.textContent).not.toContain('Arroz familiar')
        wrapper.unmount()
    })
    it('muestra regalos, descuentos y anticipos bancarios sin contarlos dos veces', () => {
        const summary = invoiceOrderSummary({ ...order, reservationDeposits: [{ id: 2, amount: 5000, isEffective: false, bankName: 'Banco' }], totalDeposited: 5000, bankPayments: [{ amount: 5000, sourceReservationDepositId: 2 }], orderDetails: [...order.orderDetails, { productName: 'Regalo', quantity: 1, unitPrice: 1000, discount: 1000 }] } as OrderDetailView)
        expect(summary.payments).toEqual([{ label: 'Anticipo · Banco', amount: 5000 }])
        expect(summary.balance).toBe(18000)
        expect(summary.lines[1]).toMatchObject({ unitPrice: 1000, discount: 1000 })
        const historical = invoiceSnapshotSummary(JSON.stringify({ order: { Id: 1, Total: 23000, lines: [], bankPayments: [{ Amount: 5000, SourceReservationDepositId: 2 }], deposits: [{ Amount: 5000, IsEffective: false }] } }))!
        expect(historical.payments).toHaveLength(1)
        expect(historical.balance).toBe(18000)
    })
})
