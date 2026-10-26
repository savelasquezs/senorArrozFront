import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import View from '@/views/CashRegisterView.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

const api = vi.hoisted(() => ({ expected: vi.fn(), loans: vi.fn(), banks: vi.fn() }))
vi.mock('@/services/MainAPI/cashRegisterApi', () => ({ cashRegisterApi: { getExpected: api.expected, getInformalLoans: api.loans } }))
vi.mock('@/services/MainAPI/bankApi', () => ({ bankApi: { getBanks: api.banks } }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ branchId: 1, user: { id: 7 }, isAdmin: true }) }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1 }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

describe('cash register essential loading', () => {
    it('shows expected amounts while loans are pending and keeps closing disabled until validation completes', async () => {
        let finish!: (value: unknown[]) => void
        api.loans.mockReturnValue(new Promise(resolve => { finish = resolve }))
        api.banks.mockResolvedValue({ items: [] })
        api.expected.mockResolvedValue({ openingCash: 0, openingGlobalTotal: 0, salesInPeriodTotal: 0,
            expensesInPeriodTotal: 0, expectedGlobalTotal: 0, informalLoansActiveTotal: 0, inventoryValue: 0,
            undeliveredOrdersCount: 0, asOf: '2026-10-26T15:00:00Z', banks: [{ bankId: 1, bankName: 'Test', bankType: 'normal', expectedBalance: 0 }] })
        const wrapper = shallowMount(View, { global: { stubs: {
            BaseButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
        } } })
        await flushPromises()
        expect(wrapper.findComponent(BaseLoading).exists()).toBe(false)
        const close = () => wrapper.findAll('button').find(button => button.text().includes('Guardar Cuadre'))!
        expect(close().attributes('disabled')).toBeDefined()
        finish([]); await flushPromises()
        expect(close().attributes('disabled')).toBeUndefined()
        wrapper.unmount()
    })
})
