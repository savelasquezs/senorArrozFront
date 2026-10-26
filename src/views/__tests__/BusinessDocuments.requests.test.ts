import { flushPromises, shallowMount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import BusinessDocumentsView from '../BusinessDocumentsView.vue'

const api = vi.hoisted(() => ({ getDocuments: vi.fn() }))
vi.mock('@/services/MainAPI/businessDocumentsApi', () => ({ businessDocumentsApi: api }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ isSuperadmin: true }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ confirmDialog: vi.fn() }) }))

it('cancels an older document search and ignores its late error', async () => {
    let reject!: (error: Error) => void
    api.getDocuments.mockImplementationOnce(() => new Promise((_, r) => { reject = r }))
        .mockResolvedValueOnce({ isSuccess: true, data: { items: [], totalCount: 0, page: 1, totalPages: 0 } })
    const wrapper = shallowMount(BusinessDocumentsView)
    await flushPromises()
    const signal = api.getDocuments.mock.calls[0]![1] as AbortSignal
    await wrapper.get('input[placeholder="Buscar por nombre o archivo..."]').setValue('current')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(signal.aborted).toBe(true)
    reject(new Error('obsolete failure'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('obsolete failure')
    wrapper.unmount()
})
