import { config, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TenantElectronicInvoicing from '../TenantElectronicInvoicing.vue'
import { electronicInvoicingApi as api } from '@/services/MainAPI/electronicInvoicingApi'
import { useAuthStore } from '@/store/auth'
import type { User } from '@/types/auth'

vi.mock('@/services/MainAPI/electronicInvoicingApi', () => ({ electronicInvoicingApi: { availability: vi.fn(), integrations: vi.fn(), integrationAction: vi.fn(), saveIntegration: vi.fn() } }))
const integration = { id: 1, name: 'Plemsi', environment: 'sandbox', isActive: false, hasToken: true, taxId: '123', legalName: 'Restaurante', billingEmail: 'emisor@example.com', resolution: '18760000001', prefix: 'SETT', nextNumber: 1, lastNumber: 100, validUntil: '2030-01-01T23:59:59Z', creditPrefix: 'NC', nextCreditNumber: 1, productionReady: false, productionEnabled: false, testedAt: '2026-10-20T15:00:00Z' }
describe('Configuración empresarial de facturación', () => {
    beforeEach(() => {
        const pinia = createPinia(); setActivePinia(pinia); config.global.plugins = [pinia]; vi.resetAllMocks()
        useAuthStore().user = { id: 1, role: 'Superadmin' } as User
        vi.mocked(api.availability).mockResolvedValue({ data: { enabled: false, productionEnabled: false } } as never)
        vi.mocked(api.integrations).mockResolvedValue({ data: [{ ...integration }] } as never)
    })
    it('bloquea producción e impide consultar con cambios sin guardar', async () => {
        const wrapper = mount(TenantElectronicInvoicing); await flushPromises()
        expect(wrapper.get('option[value="production"]').attributes('disabled')).toBeDefined()
        expect(wrapper.text()).toContain('La emisión real está bloqueada')
        await wrapper.get('input[maxlength="100"]').setValue('Otro nombre')
        expect(wrapper.text()).toContain('Hay cambios sin guardar')
        const test = wrapper.findAll('button').find(b => b.text() === 'Probar conexión y emisor')!
        expect(test.attributes('disabled')).toBeDefined(); await test.trigger('click')
        expect(api.integrationAction).not.toHaveBeenCalled(); wrapper.unmount()
    })
    it('seleccionar un rango sin consecutivo confirmado no propone su inicio', async () => {
        vi.mocked(api.integrationAction).mockResolvedValue({ data: { resolutions: [{ resolution: '18760000001', prefix: 'SETT', from: 1, to: 100, validUntil: '2030-01-01', nextNumber: null }] } } as never)
        const wrapper = mount(TenantElectronicInvoicing); await flushPromises()
        await wrapper.findAll('button').find(b => b.text() === 'Consultar numeraciones y folios')!.trigger('click'); await flushPromises()
        expect(api.integrationAction).toHaveBeenCalled()
        expect(wrapper.text()).toContain('Próximo consecutivo sin confirmar')
        await wrapper.findAll('button').find(b => b.text().includes('Próximo consecutivo sin confirmar'))!.trigger('click')
        const numbers = wrapper.findAll('input[type="number"]')
        expect((numbers[0]!.element as HTMLInputElement).value).toBe('0')
        expect(wrapper.findAll('button').find(b => b.text() === 'Activar pruebas')!.attributes('disabled')).toBeDefined()
        wrapper.unmount()
    })
    it('solo Superadmin ve el formulario empresarial', async () => {
        useAuthStore().user = { id: 2, role: 'Admin' } as User
        const wrapper = mount(TenantElectronicInvoicing); await flushPromises()
        expect(wrapper.find('form').exists()).toBe(false)
        expect(api.integrations).not.toHaveBeenCalled()
        wrapper.unmount()
    })
    it('permite registrar producción desde la primera integración cuando el servidor lo habilita', async () => {
        vi.mocked(api.integrations).mockResolvedValue({ data: [] } as never)
        vi.mocked(api.availability).mockResolvedValue({ data: { enabled: false, productionEnabled: true } } as never)
        const wrapper = mount(TenantElectronicInvoicing); await flushPromises()
        expect(wrapper.get('option[value="production"]').attributes('disabled')).toBeUndefined()
        expect(wrapper.text()).not.toContain('La emisión real está bloqueada')
        wrapper.unmount()
    })
    it('exige confirmar el consecutivo dedicado y envía esa confirmación al activar', async () => {
        const wrapper = mount(TenantElectronicInvoicing, { global: { stubs: { Teleport: true } } }); await flushPromises()
        await wrapper.findAll('button').find(b => b.text() === 'Activar pruebas')!.trigger('click'); await flushPromises()
        const confirm = wrapper.findAll('button').find(b => b.text() === 'Confirmar')!
        expect(confirm.attributes('disabled')).toBeDefined()
        expect(wrapper.text()).toContain('Próximo documento: SETT1')
        await wrapper.get('[role="dialog"] input[type="checkbox"]').setValue(true)
        vi.mocked(api.integrationAction).mockResolvedValue({ data: {} } as never)
        await confirm.trigger('click'); await flushPromises()
        expect(api.integrationAction).toHaveBeenCalledWith(1, 'activation', { enabled: true, numberingConfirmed: true })
        wrapper.unmount()
    })
})
