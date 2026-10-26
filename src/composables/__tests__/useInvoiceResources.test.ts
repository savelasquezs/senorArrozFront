import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useInvoiceResources } from '../useInvoiceResources'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { useAuthStore } from '@/store/auth'

vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { recipients: vi.fn(), availability: vi.fn() } }))
describe('Recursos compartidos de facturación', () => {
    beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks() })
    it('deduplica consultas simultáneas y publica ediciones sin volver a consultar', async () => {
        const recipient = { id: 1, documentType: 3, identification: '123', name: 'Cliente' }
        vi.mocked(api.recipients).mockResolvedValue({ data: [recipient] } as never)
        const resources = useInvoiceResources()
        await Promise.all([resources.loadRecipients(10), resources.loadRecipients(10)])
        expect(api.recipients).toHaveBeenCalledTimes(1)
        resources.updateRecipient(10, { ...recipient, name: 'Actualizado' })
        expect((await resources.loadRecipients(10))[0]?.name).toBe('Actualizado')
        expect(api.recipients).toHaveBeenCalledTimes(1)
    })
    it('un fallo de disponibilidad puede reintentarse y no se guarda como éxito', async () => {
        vi.mocked(api.availability).mockRejectedValueOnce(new Error('API no disponible')).mockResolvedValueOnce({ data: { enabled: true } } as never)
        const resources = useInvoiceResources()
        await expect(resources.getAvailability()).rejects.toThrow('API no disponible')
        expect((await resources.getAvailability()).enabled).toBe(true)
        await resources.getAvailability(); expect(api.availability).toHaveBeenCalledTimes(2)
    })
    it('descarta respuestas de una sesión anterior', async () => {
        let finish!: (value: never) => void
        vi.mocked(api.recipients).mockImplementation(() => new Promise(resolve => { finish = resolve }))
        const resources = useInvoiceResources(), request = resources.loadRecipients(10)
        useAuthStore().user = { id: 8, role: 'Admin', branchId: 1 } as never
        finish({ data: [{ id: 1, name: 'Anterior' }] } as never)
        expect(await request).toEqual([]); expect(resources.recipients[10]).toBeUndefined()
    })
    it('una consulta antigua no pisa una edición recién guardada', async () => {
        let finish!: (value: never) => void
        vi.mocked(api.recipients).mockImplementation(() => new Promise(resolve => { finish = resolve }))
        const resources = useInvoiceResources(), request = resources.loadRecipients(10)
        resources.updateRecipient(10, { id: 1, documentType: 3, identification: '123', name: 'Nuevo' })
        finish({ data: [{ id: 1, name: 'Anterior' }] } as never)
        expect((await request)[0]?.name).toBe('Nuevo')
    })
    it('conserva destinatarios al renovar el token de la misma identidad', async () => {
        const auth = useAuthStore()
        auth.user = { id: 7, role: 'Admin', branchId: 1 } as never
        auth.token = 'original'
        vi.mocked(api.recipients).mockResolvedValue({ data: [{ id: 1, name: 'Actual' }] } as never)
        const resources = useInvoiceResources()
        await resources.loadRecipients(10)
        auth.token = 'renovado'
        expect((await resources.loadRecipients(10))[0].name).toBe('Actual')
        expect(api.recipients).toHaveBeenCalledOnce()
    })
})
