import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransferOrderBranchDialog from '@/components/orders/TransferOrderBranchDialog.vue'
import type { OrderDetailView } from '@/types/order'

const { transferBranch, getBanks } = vi.hoisted(() => ({
    transferBranch: vi.fn(), getBanks: vi.fn(),
}))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { transferBranch } }))
vi.mock('@/services/MainAPI/bankApi', () => ({ bankApi: { getBanks } }))
vi.mock('@/store/branchContext', () => ({
    useBranchContextStore: () => ({
        options: [{ id: 1, name: 'Santander' }, { id: 2, name: 'Manrique' }],
    }),
}))
const BaseDialog = defineComponent({
    props: { modelValue: Boolean },
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
})
const BaseButton = defineComponent({
    props: { disabled: Boolean, loading: Boolean },
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const order = {
    id: 81, branchId: 1, branchName: 'Santander',
    status: 'ready', managementVersion: 8,
    bankPayments: [
        { id: 3, bankId: 11, bankName: 'Banco Santander', amount: 15000, isVerified: true },
        { id: 4, bankId: 12, bankName: 'Otro Santander', amount: 5000, isVerified: false },
    ],
    appPayments: [],
} as OrderDetailView

const mountDialog = (currentOrder = order) => mount(TransferOrderBranchDialog, {
    props: { open: true, order: currentOrder },
    global: { stubs: { BaseDialog, BaseButton } },
})
const confirmButton = (wrapper: ReturnType<typeof mountDialog>) =>
    wrapper.findAll('button').find(b => b.text().includes('Confirmar traslado'))!

describe('TransferOrderBranchDialog', () => {
    beforeEach(() => {
        transferBranch.mockReset().mockResolvedValue({ ...order, branchId: 2 })
        getBanks.mockReset().mockResolvedValue({
            items: [
                { id: 20, name: 'Banco Manrique', type: 'normal', active: true, branchId: 2 },
                { id: 21, name: 'Bóveda Manrique', type: 'cash_vault', active: true, branchId: 2 },
            ],
        })
    })

    it('preserves both bank payments unless the admin explicitly changes one', async () => {
        const wrapper = mountDialog()
        await wrapper.get('#transfer-target-branch').setValue('2')
        await flushPromises()
        expect(wrapper.text()).toContain('Conservar Banco Santander')
        expect(wrapper.findAll('#transfer-payment-3 option')).toHaveLength(2)
        expect(wrapper.text()).not.toContain('Bóveda Manrique')
        await confirmButton(wrapper).trigger('click')
        await flushPromises()
        expect(transferBranch).toHaveBeenCalledWith(81, 2, order, [])
        expect(wrapper.emitted('transferred')).toEqual([[2]])
        expect(order.bankPayments[0]?.bankId).toBe(11)
    })

    it('lets the admin reassign one payment, with explicit warning about moving real money', async () => {
        const wrapper = mountDialog()
        await wrapper.get('#transfer-target-branch').setValue('2')
        await flushPromises()
        await wrapper.get('#transfer-payment-3').setValue('20')
        expect(wrapper.text()).toContain('NO transfiere el dinero')
        expect(wrapper.text()).toContain('transferencia real')
        await confirmButton(wrapper).trigger('click')
        await flushPromises()
        expect(transferBranch).toHaveBeenCalledWith(81, 2, order,
            [{ paymentId: 3, targetBankId: 20 }])
    })

    it('blocks a delivered order and requires a distinct destination', async () => {
        const delivered = mountDialog({ ...order, status: 'delivered' })
        await delivered.get('#transfer-target-branch').setValue('2')
        await flushPromises()
        expect(confirmButton(delivered).attributes('disabled')).toBeDefined()
        await confirmButton(delivered).trigger('click')
        expect(transferBranch).not.toHaveBeenCalled()
        const missingTarget = mountDialog()
        expect(confirmButton(missingTarget).attributes('disabled')).toBeDefined()
    })

    it('does not offer bank changes for app settlements', async () => {
        const linked = mountDialog({
            ...order, bankPayments: [{ ...order.bankPayments[0]!, isAppSettlement: true }],
        })
        await linked.get('#transfer-target-branch').setValue('2')
        await flushPromises()
        expect(linked.get('#transfer-payment-3').attributes('disabled')).toBeDefined()
        expect(linked.text()).toContain('Vinculado a un abono')
    })
})
