import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import View from '@/views/WhatsAppTemplatesView.vue'

const mocks = vi.hoisted(() => ({ templates: vi.fn(), customers: vi.fn(), ensure: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/store/whatsapp', () => ({ useWhatsAppStore: () => ({ enabled: true, enabledBranchIds: [1], ensureStatus: mocks.ensure }) }))
vi.mock('@/services/MainAPI/whatsappApi', () => ({ whatsappApi: { getTemplates: mocks.templates } }))
vi.mock('@/services/MainAPI/customerApi', () => ({ customerApi: { getCustomers: mocks.customers } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

describe('WhatsApp template initialization', () => {
    it('shows templates without an artificial timer or waiting for customer options, then aborts on exit', async () => {
        mocks.templates.mockResolvedValue({ data: [{ id: 1, name: 'ready_template', status: 'APPROVED', componentsJson: '[]' }] })
        mocks.customers.mockReturnValue(new Promise(() => {}))
        const wrapper = shallowMount(View)
        await flushPromises()
        expect(mocks.customers).toHaveBeenCalledOnce()
        expect(wrapper.text()).toContain('ready_template')
        const signal = mocks.customers.mock.calls[0][1] as AbortSignal
        wrapper.unmount()
        expect(signal.aborted).toBe(true)
    })
})
