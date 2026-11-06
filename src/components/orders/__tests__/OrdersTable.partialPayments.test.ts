import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import type { OrderListItem } from '@/types/order'
import ReservationDepositCompactRow from '@/components/reservations/ReservationDepositCompactRow.vue'

const access = vi.hoisted(() => ({ canEdit: vi.fn(() => true) }))
beforeEach(() => access.canEdit.mockReturnValue(true))

vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/composables/useOrderPermissions', () => ({
    useOrderPermissions: () => ({
        canChangeStatus: () => false,
        canUncancel: () => false,
        canEditPayments: access.canEdit,
        canVerifyPayments: () => false,
        canUnverifyPayments: () => false,
        canSettleAppPayments: () => false,
        canUnsettleAppPayments: () => false,
    }),
}))

const order: OrderListItem = {
    id: 567,
    branchId: 4,
    branchName: 'Castilla',
    takenById: 1,
    takenByName: 'Caja',
    customerId: 20,
    customerName: 'María',
    customerPhone: '3001234567',
    addressId: 30,
    addressDescription: 'Calle 10 # 20-30',
    addressAdditionalInfo: null,
    neighborhoodId: 1,
    neighborhoodName: 'Castilla',
    deliveryManId: null,
    deliveryManName: null,
    guestName: null,
    type: 'delivery',
    typeDisplayName: 'Domicilio',
    deliveryFee: 5000,
    freeDeliveryRequested: false,
    reservedFor: null,
    prepareAt: null,
    status: 'taken',
    statusDisplayName: 'Tomado',
    statusTimes: {},
    subtotal: 30000,
    total: 35000,
    discountTotal: 0,
    notes: null,
    cancelledReason: null,
    createdAt: '2026-08-31T15:00:00.000Z',
    updatedAt: '2026-08-31T15:00:00.000Z',
    bankPayments: [{
        id: 10,
        orderId: 567,
        bankId: 1,
        bankName: 'Bancolombia',
        branchId: 4,
        branchName: 'Castilla',
        amount: 10000,
        verifiedAt: null,
        isVerified: false,
    }],
    appPayments: [],
    totalDeposited: 0,
    summaryLines: [],
}

describe('OrdersTable partial payments', () => {
    it('mantiene efectivo y transferencias rápidas cuando queda saldo', async () => {
        const wrapper = mount(OrdersTable, {
            props: {
                orders: [order],
                enablePaidInStoreQuickAction: true,
                quickBanks: [
                    { id: 1, name: 'Nequi' },
                    { id: 2, name: 'Banco' },
                ] as never,
            },
            global: {
                stubs: {
                    RouterLink: RouterLinkStub,
                    OrderStatusBadge: true,
                    OrderTypeBadge: true,
                    OrderSummaryLines: true,
                    OrderBankPaymentRow: true,
                    OrderAppPaymentRow: true,
                    PaidInStoreCashCompactRow: true,
                    ReservationDepositCompactRow: true,
                    BaseLoading: true,
                },
            },
        })

        expect(wrapper.text()).toContain('Pagó?')
        expect(wrapper.text()).toContain('Transf Nequi')
        expect(wrapper.text()).toContain('Transf Banco')

        const transfer = wrapper.findAll('button').find((button) => button.text() === 'Transf Banco')
        await transfer?.trigger('click')

        expect(wrapper.emitted('quick-bank-transfer')?.[0]).toEqual([order, 2])
    })
})


describe('converted reservation receipts in POS', () => {
    const deposit = { id: 17, orderId: order.id, branchId: 4, amount: 10000,
        isEffective: false, appId: 2, appName: 'Nequi', receivedAt: order.createdAt,
        receivedById: 1, receivedByName: 'Caja', createdAt: order.createdAt }
    const converted = { ...order, status: 'ready', reservedFor: order.createdAt,
        reservationDeposits: [deposit], totalDeposited: 10000,
        appPayments: [{ id: 21, orderId: order.id, appId: 2, appName: 'Nequi', amount: 10000,
            sourceReservationDepositId: 17, isSettled: false }], bankPayments: [] } as OrderListItem
    function render(overrides: Partial<OrderListItem> = {}) {
        return mount(OrdersTable, { props: { orders: [{ ...converted, ...overrides }] }, global: { stubs: {
            RouterLink: RouterLinkStub, OrderStatusBadge: true, OrderTypeBadge: true,
            OrderSummaryLines: true, OrderBankPaymentRow: true, OrderAppPaymentRow: true,
            PaidInStoreCashCompactRow: true, BaseLoading: true,
        } } })
    }
    it.each(['delivery', 'onsite'] as const)('keeps edit/delete access after conversion to %s', async type => {
        const wrapper = render({ type })
        const receipt = wrapper.findComponent(ReservationDepositCompactRow)
        expect(receipt.props('deposit')).toEqual(deposit)
        await receipt.get('button[title="Editar monto"]').trigger('click')
        await receipt.get('button[title="Eliminar abono"]').trigger('click')
        expect(wrapper.emitted('edit-reservation-deposit')![0]![1]).toEqual(deposit)
        expect(wrapper.emitted('remove-reservation-deposit')![0]![1]).toEqual(deposit)
        expect(wrapper.emitted('add-deposit')).toBeUndefined()
    })
    it.each(['delivered', 'cancelled'] as const)('keeps finalized %s receipts read-only', status => {
        const receipt = render({ status }).findComponent(ReservationDepositCompactRow)
        expect(receipt.exists()).toBe(true)
        expect(receipt.findAll('button')).toHaveLength(0)
    })
    it.each(['isSettled', 'isReversed'] as const)('blocks corrections when the linked app is %s', flag => {
        const wrapper = render({ appPayments: [{ ...converted.appPayments[0]!, [flag]: true }] })
        expect(wrapper.findComponent(ReservationDepositCompactRow).findAll('button')).toHaveLength(0)
    })
    it('does not grant payment permissions when displaying existing receipts', () => {
        access.canEdit.mockReturnValue(false)
        expect(render().findComponent(ReservationDepositCompactRow).findAll('button')).toHaveLength(0)
    })
    it('does not show receipt controls on ordinary orders without deposits', () => {
        expect(render({ reservedFor: null, reservationDeposits: [] })
            .findComponent(ReservationDepositCompactRow).exists()).toBe(false)
    })
})
