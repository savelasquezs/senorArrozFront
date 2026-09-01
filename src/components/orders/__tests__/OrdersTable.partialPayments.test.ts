import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import type { OrderListItem } from '@/types/order'

vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/composables/useOrderPermissions', () => ({
    useOrderPermissions: () => ({
        canChangeStatus: () => false,
        canUncancel: () => false,
        canEditPayments: () => true,
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
