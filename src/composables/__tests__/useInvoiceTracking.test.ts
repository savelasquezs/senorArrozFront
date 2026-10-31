import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { useInvoiceTracking } from '../useInvoiceTracking'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import InvoiceActivity from '@/components/orders/InvoiceActivity.vue'
import type { InvoiceDocument } from '@/types/electronicInvoicing'

vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { documents: vi.fn(), download: vi.fn(), request: vi.fn() } }))
const row = (overrides: Partial<InvoiceDocument> = {}): InvoiceDocument => ({ id: 7, kind: 'invoice', status: 'pending', environment: 'sandbox', prefix: 'FE', number: 123, emailStatus: 'pending', creditRequested: false, recipientJson: '{}', hasPdf: false, hasXml: false, ...overrides })
const docs = (...documents: InvoiceDocument[]) => ({ data: documents }) as never

describe('Seguimiento global de facturas', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
        setActivePinia(createPinia()); vi.resetAllMocks()
        const auth = useAuthStore()
        auth.user = { id: 1, role: 'Cashier', branchId: 2 } as never
        auth.token = 'token'
        vi.mocked(api.documents).mockResolvedValue(docs(row()))
        vi.mocked(api.download).mockResolvedValue(undefined)
    })
    afterEach(() => { disposePinia(getActivePinia()!); vi.useRealTimers() })

    it('consulta etapas reales y descarga una sola vez después de la validación y generación del PDF', async () => {
        vi.mocked(api.documents)
            .mockResolvedValueOnce(docs(row()))
            .mockResolvedValueOnce(docs(row({ status: 'processing' })))
            .mockResolvedValueOnce(docs(row({ status: 'verifying', submittedAt: '2026-10-30T23:00:00Z' })))
            .mockResolvedValueOnce(docs(row({ status: 'issued' })))
            .mockResolvedValue(docs(row({ status: 'issued', hasPdf: true })))
        const tracking = useInvoiceTracking()
        tracking.track(42)
        const wrapper = mount(InvoiceActivity, { global: { plugins: [getActivePinia()!], stubs: { RouterLink: true } } })
        await vi.advanceTimersByTimeAsync(0)
        expect(wrapper.text()).toContain('esperando procesamiento')
        await vi.advanceTimersByTimeAsync(3000)
        expect(wrapper.text()).toContain('Preparando y transmitiendo')
        await vi.advanceTimersByTimeAsync(3000)
        expect(wrapper.text()).toContain('Verificando el mismo documento')
        await vi.advanceTimersByTimeAsync(3000)
        expect(wrapper.text()).toContain('Validada por DIAN · preparando PDF')
        expect(api.download).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(3000)
        expect(wrapper.text()).toContain('PDF descargado')
        expect(api.download).toHaveBeenCalledWith(7, 'pdf', 'FE123', expect.objectContaining({ branchScope: 'none', signal: expect.any(AbortSignal) }))
        await vi.advanceTimersByTimeAsync(60000)
        expect(api.download).toHaveBeenCalledTimes(1)
        expect(api.documents).toHaveBeenCalledTimes(5)
        wrapper.unmount()
    })

    it('continúa con varios pedidos al desmontar pantallas y permite minimizar el aviso', async () => {
        const tracking = useInvoiceTracking()
        tracking.track(42); tracking.track(43)
        const options = { global: { plugins: [getActivePinia()!], stubs: { RouterLink: true } } }
        const first = mount(InvoiceActivity, options)
        await first.get('button[aria-label="Minimizar facturación"]').trigger('click')
        expect(first.find('article').exists()).toBe(false)
        first.unmount()
        await vi.advanceTimersByTimeAsync(0)
        vi.mocked(api.documents).mockResolvedValue(docs(row({ status: 'issued', hasPdf: true })))
        await vi.advanceTimersByTimeAsync(3000)
        expect(api.download).toHaveBeenCalledTimes(2)
        const next = mount(InvoiceActivity, options)
        expect(next.text()).toContain('Pedido #42')
        expect(next.text()).toContain('Pedido #43')
        expect(next.findAll('article')).toHaveLength(2)
        next.unmount()
    })

    it.each(['pending', 'processing', 'verifying', 'rejected', 'scheduled'])('no descarga un documento %s aunque tenga archivo', async status => {
        vi.mocked(api.documents).mockResolvedValue(docs(row({ status, hasPdf: true })))
        useInvoiceTracking().track(42)
        await vi.advanceTimersByTimeAsync(0)
        expect(api.download).not.toHaveBeenCalled()
    })

    it('espera la entrega de una reserva con menos consultas', async () => {
        vi.mocked(api.documents).mockResolvedValueOnce(docs(row({ status: 'scheduled' })))
            .mockResolvedValue(docs(row({ status: 'issued', hasPdf: true })))
        useInvoiceTracking().track(42)
        await vi.advanceTimersByTimeAsync(29000)
        expect(api.documents).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1000)
        expect(api.download).toHaveBeenCalledTimes(1)
    })

    it('reprograma la consulta si el temporizador llega antes del instante esperado', async () => {
        const started = Date.now()
        const now = vi.spyOn(Date, 'now').mockReturnValue(started)
        try {
            const tracking = useInvoiceTracking()
            tracking.track(42)
            await vi.advanceTimersByTimeAsync(0)
            await vi.advanceTimersByTimeAsync(3000)
            expect(api.documents).toHaveBeenCalledTimes(1)
            now.mockReturnValue(started + 3000)
            await vi.advanceTimersByTimeAsync(3000)
            expect(api.documents).toHaveBeenCalledTimes(2)
        } finally { now.mockRestore() }
    })

    it('no consulta sin solicitudes ni duplica seguimientos y consultas simultáneas', async () => {
        const tracking = useInvoiceTracking()
        await vi.advanceTimersByTimeAsync(60000)
        expect(api.documents).not.toHaveBeenCalled()
        let finish!: (value: never) => void
        vi.mocked(api.documents).mockImplementation(() => new Promise(resolve => { finish = resolve }))
        tracking.track(42); tracking.track(42)
        const request = tracking.refresh(42)
        await tracking.refresh(42)
        await vi.advanceTimersByTimeAsync(10000)
        expect(api.documents).toHaveBeenCalledTimes(1)
        expect(tracking.jobs).toHaveLength(1)
        finish(docs(row()))
        await request
    })

    it('se recupera de cortes de red consultando sin reenviar la solicitud', async () => {
        vi.mocked(api.documents).mockRejectedValueOnce(new Error('Sin red'))
            .mockResolvedValue(docs(row({ status: 'issued', hasPdf: true })))
        const tracking = useInvoiceTracking()
        tracking.track(42)
        await vi.advanceTimersByTimeAsync(0)
        expect(tracking.jobs[0]?.error).toContain('Volveremos a intentarlo')
        await vi.advanceTimersByTimeAsync(10000)
        expect(tracking.jobs[0]?.phase).toBe('done')
        expect(api.request).not.toHaveBeenCalled()
    })

    it('reintenta solo la descarga si falla el PDF, sin descargar repetidamente en segundo plano', async () => {
        vi.mocked(api.documents).mockResolvedValue(docs(row({ status: 'issued', hasPdf: true })))
        vi.mocked(api.download).mockRejectedValueOnce(new Error('Descarga interrumpida')).mockResolvedValue(undefined)
        const tracking = useInvoiceTracking()
        tracking.track(42)
        await vi.advanceTimersByTimeAsync(0)
        expect(tracking.jobs[0]).toMatchObject({ phase: 'error', downloadError: true })
        await vi.advanceTimersByTimeAsync(60000)
        expect(api.download).toHaveBeenCalledTimes(1)
        await tracking.download(42)
        expect(tracking.jobs[0]?.phase).toBe('done')
        expect(api.request).not.toHaveBeenCalled()
    })

    it('detiene rechazos y retoma la misma factura después de corregirla', async () => {
        vi.mocked(api.documents).mockResolvedValueOnce(docs(row({ status: 'rejected', lastError: 'DIAN rechazó los datos' })))
            .mockResolvedValue(docs(row({ status: 'issued', hasPdf: true })))
        const tracking = useInvoiceTracking()
        tracking.track(42, 7)
        await vi.advanceTimersByTimeAsync(30000)
        expect(tracking.jobs[0]?.error).toBe('DIAN rechazó los datos')
        expect(api.documents).toHaveBeenCalledTimes(1)
        tracking.track(42, 7)
        await vi.advanceTimersByTimeAsync(0)
        expect(api.download).toHaveBeenCalledTimes(1)
        expect(api.request).not.toHaveBeenCalled()
    })

    it('sigue el documento confirmado sin descargar facturas históricas ni notas crédito', async () => {
        vi.mocked(api.request).mockResolvedValue({ data: { id: 7, status: 'pending' } } as never)
        vi.mocked(api.documents).mockResolvedValue(docs(row({ id: 9, kind: 'credit', status: 'issued', hasPdf: true }), row({ id: 8, status: 'issued', hasPdf: true }), row()))
        const tracking = useInvoiceTracking()
        await tracking.requestInvoice(42, { name: 'Empresa', identification: '123', documentType: 6 })
        expect(tracking.jobs[0]?.document?.id).toBe(7)
        expect(api.download).not.toHaveBeenCalled()
    })

    it('muestra un error de solicitud y consultar su resultado nunca vuelve a emitir', async () => {
        vi.mocked(api.request).mockRejectedValue(new Error('Timeout al confirmar'))
        const tracking = useInvoiceTracking()
        await expect(tracking.requestInvoice(42, { name: 'Empresa', identification: '123', documentType: 6 })).rejects.toThrow('Timeout')
        expect(tracking.jobs[0]?.phase).toBe('error')
        await tracking.refresh(42)
        expect(tracking.jobs[0]?.phase).toBe('tracking')
        expect(api.request).toHaveBeenCalledTimes(1)
    })

    it('no asegura que se guardó una solicitud fallida si el pedido no tiene documento', async () => {
        vi.mocked(api.request).mockRejectedValue(new Error('Sin respuesta'))
        vi.mocked(api.documents).mockResolvedValue(docs())
        const tracking = useInvoiceTracking()
        await expect(tracking.requestInvoice(42, { name: 'Empresa', identification: '123', documentType: 6 })).rejects.toThrow()
        await tracking.refresh(42)
        expect(tracking.jobs[0]).toMatchObject({ phase: 'error', error: 'No encontramos una solicitud confirmada. Revisa el pedido antes de emitir.' })
        await vi.advanceTimersByTimeAsync(30000)
        expect(api.documents).toHaveBeenCalledTimes(1)
    })

    it('cancela consultas y descarta respuestas al cambiar de usuario', async () => {
        let finish!: (value: never) => void
        vi.mocked(api.documents).mockImplementation(() => new Promise(resolve => { finish = resolve }))
        const tracking = useInvoiceTracking()
        tracking.track(42)
        const request = tracking.refresh(42)
        const signal = vi.mocked(api.documents).mock.calls[0]![1]!.signal!
        useAuthStore().user = { id: 2, role: 'Cashier', branchId: 2 } as never
        expect(signal.aborted).toBe(true)
        finish(docs(row({ status: 'issued', hasPdf: true })))
        await request
        expect(tracking.jobs).toEqual([])
        expect(api.download).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(60000)
        expect(api.documents).toHaveBeenCalledTimes(1)
    })

    it('aborta descargas pendientes al cerrar sesión y conserva el seguimiento al renovar token o seleccionar sucursal', async () => {
        let finish!: () => void
        vi.mocked(api.documents).mockResolvedValue(docs(row({ status: 'issued', hasPdf: true })))
        vi.mocked(api.download).mockImplementation(() => new Promise(resolve => { finish = resolve }))
        const tracking = useInvoiceTracking()
        tracking.track(42)
        const request = tracking.refresh(42)
        await flushPromises()
        useAuthStore().token = 'renovado'
        useBranchContextStore().selectedBranchId = 99
        expect(tracking.jobs[0]?.phase).toBe('downloading')
        const signal = vi.mocked(api.download).mock.calls[0]![3]!.signal!
        useAuthStore().token = null
        expect(signal.aborted).toBe(true)
        finish(); await request
        expect(tracking.jobs).toEqual([])
    })
})
