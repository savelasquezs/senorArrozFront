import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LiquidationWizardModal from '@/components/deliverymen/LiquidationWizardModal.vue'
import type { DeliverymanDetail } from '@/types/deliveryman'
import type { ExpenseHeader } from '@/types/expense'

const apiMocks = vi.hoisted(() => ({
    settleDay: vi.fn(),
}))

vi.mock('@/services/MainAPI/deliverymanApi', () => ({
    deliverymanApi: {
        settleDay: apiMocks.settleDay,
    },
}))

const detail = (currentBalance: number): DeliverymanDetail => ({
    deliverymanId: 12,
    deliverymanName: 'Abelardo',
    ordersCount: 1,
    averageDeliveryTime: 20,
    totalCash: 337000,
    totalDeliveryFee: 5000,
    totalAdvances: 0,
    baseAmount: 55000,
    currentBalance,
    ordersOnTheWayCount: 0,
    orders: [],
})

const expense = (linkedDeliverymanAdvanceId?: number): ExpenseHeader => ({
    id: 730,
    branchId: 1,
    branchName: 'Principal',
    supplierId: 1,
    supplierName: 'Proveedor General',
    deliverymanId: 12,
    linkedDeliverymanAdvanceId,
    linkedDeliverymanAdvanceAmount: linkedDeliverymanAdvanceId ? 61800 : null,
    total: 61800,
    createdById: 1,
    createdByName: 'Caja',
    createdAt: '2026-07-25T12:00:00Z',
    updatedAt: '2026-07-25T12:00:00Z',
    expenseDetails: [],
    expenseBankPayments: [],
    categoryNames: [],
    bankNames: [],
    expenseNames: [],
})

function mountModal(currentBalance: number) {
    return mount(LiquidationWizardModal, {
        props: {
            modelValue: true,
            detail: detail(currentBalance),
            selectedDate: '2026-07-25',
            bankOptions: [],
        },
        global: {
            stubs: {
                BaseDialog: {
                    props: ['modelValue'],
                    emits: ['update:modelValue'],
                    template: '<section v-if="modelValue"><slot /><slot name="footer" /></section>',
                },
                BaseButton: {
                    props: ['disabled', 'loading'],
                    emits: ['click'],
                    template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
                },
                BaseInput: { template: '<input />' },
                BaseSelect: { template: '<select />' },
                ExpenseFormModal: {
                    name: 'ExpenseFormModal',
                    props: ['isOpen', 'presetDeliverymanId'],
                    emits: ['close', 'submit'],
                    template: '<div />',
                },
            },
        },
    })
}

function settlementButton(wrapper: ReturnType<typeof mountModal>) {
    return wrapper.findAll('button').find((button) =>
        button.text().includes('Liquidar totalmente'),
    )!
}

describe('LiquidationWizardModal expense offsets', () => {
    beforeEach(() => {
        apiMocks.settleDay.mockReset().mockResolvedValue({
            advances: [],
            surplusApplied: 0,
        })
    })

    it('no vuelve a contabilizar un gasto cuyo abono ya fue creado', async () => {
        const wrapper = mountModal(392000)

        wrapper.findComponent({ name: 'ExpenseFormModal' }).vm.$emit('submit', expense(91))
        await wrapper.setProps({ detail: detail(330200) })
        await wrapper.get('textarea').setValue('+330200')
        await settlementButton(wrapper).trigger('click')
        await flushPromises()

        expect(wrapper.emitted('detail-refresh-requested')).toHaveLength(1)
        expect(apiMocks.settleDay).toHaveBeenCalledWith(12, {
            date: '2026-07-25',
            baseAmount: 55000,
            cashAmount: 330200,
            bankTransfers: [],
            expenseOffsets: [],
            mode: 1,
        })
    })

    it('mantiene como pendiente un gasto cuando no se pudo crear el abono automático', async () => {
        const wrapper = mountModal(61800)

        wrapper.findComponent({ name: 'ExpenseFormModal' }).vm.$emit('submit', expense())
        await wrapper.vm.$nextTick()
        await settlementButton(wrapper).trigger('click')
        await flushPromises()

        expect(apiMocks.settleDay).toHaveBeenCalledWith(12, {
            date: '2026-07-25',
            baseAmount: 55000,
            cashAmount: 0,
            bankTransfers: [],
            expenseOffsets: [{
                expenseHeaderId: 730,
                amount: 61800,
            }],
            mode: 1,
        })
    })
})
