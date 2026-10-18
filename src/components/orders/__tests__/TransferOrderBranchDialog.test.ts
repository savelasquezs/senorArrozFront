import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransferOrderBranchDialog from '@/components/orders/TransferOrderBranchDialog.vue'
import type { OrderDetailView } from '@/types/order'

const { transferBranch } = vi.hoisted(() => ({ transferBranch: vi.fn() }))
vi.mock('@/services/MainAPI/orderApi', () => ({
    orderApi: { transferBranch },
}))
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
    status: 'delivered', managementVersion: 8,
    bankPayments: [{ id: 3, amount: 15000 }],
} as OrderDetailView

describe('TransferOrderBranchDialog', () => {
    beforeEach(() => transferBranch.mockReset())

    it('transfers even a paid delivered order without changing its snapshot payload', async () => {
        transferBranch.mockResolvedValue({ ...order, branchId: 2 })
        const wrapper = mount(TransferOrderBranchDialog, {
            props: { open: true, order },
            global: { stubs: { BaseDialog, BaseButton } },
        })
        await wrapper.get('select').setValue('2')
        const button = wrapper.findAll('button').find(b => b.text().includes('Confirmar traslado'))
        expect(button).toBeDefined()
        await button!.trigger('click')
        await flushPromises()

        expect(transferBranch).toHaveBeenCalledWith(81, 2, order)
        expect(wrapper.emitted('transferred')).toEqual([[2]])
        expect(order.branchId).toBe(1)
        expect(order.bankPayments).toHaveLength(1)
    })

    it('does not submit without a different destination', async () => {
        const wrapper = mount(TransferOrderBranchDialog, {
            props: { open: true, order },
            global: { stubs: { BaseDialog, BaseButton } },
        })
        const button = wrapper.findAll('button').find(b => b.text().includes('Confirmar traslado'))!
        expect(button.attributes('disabled')).toBeDefined()
        await button.trigger('click')
        expect(transferBranch).not.toHaveBeenCalled()
    })
})
