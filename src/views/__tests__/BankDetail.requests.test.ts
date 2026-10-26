import { shallowMount, flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import BankDetail from '../BankDetail.vue'

const mocks = vi.hoisted(() => ({ detail: vi.fn(), apps: vi.fn(), payments: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '7' } }) }))
vi.mock('@/store/banks', () => ({ useBanksStore: () => ({ fetchDetail: mocks.detail, isLoading: false,
    currentDetail: { id: 7, name: 'Banco', branchName: 'Sucursal', active: true } }) }))
vi.mock('@/store/apps', () => ({ useAppsStore: () => ({ fetchByBank: mocks.apps, byBank: [] }) }))
vi.mock('@/store/bankPayments', () => ({ useBankPaymentsStore: () => ({}) }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({}) }))
vi.mock('@/services/MainAPI/bankPaymentApi', () => ({ bankPaymentApi: { getBankPayments: mocks.payments } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: vi.fn(), success: vi.fn() }) }))
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ confirmDialog: vi.fn() }) }))

it('starts payments independently of the detail and exposes pages beyond the first 100 rows', async () => {
    let finish!: () => void
    mocks.detail.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
    mocks.apps.mockResolvedValue(undefined)
    mocks.payments.mockResolvedValue({ items: [], totalCount: 151 })
    const wrapper = shallowMount(BankDetail, { global: { stubs: {
        BaseCard: { template: '<section><slot name="header" /><slot /></section>' },
        BasePagination: { emits: ['change'], template: '<button data-test="next" @click="$emit(\'change\', 3)">Next</button>' },
    } } })
    await flushPromises()
    expect(mocks.payments).toHaveBeenCalledWith({ bankId: 7, page: 1, pageSize: 50 }, expect.any(AbortSignal))
    expect(wrapper.text()).toContain('Información del Banco')
    await wrapper.get('[data-test="next"]').trigger('click')
    await flushPromises()
    expect(mocks.payments).toHaveBeenLastCalledWith({ bankId: 7, page: 3, pageSize: 50 }, expect.any(AbortSignal))
    finish(); wrapper.unmount()
})
