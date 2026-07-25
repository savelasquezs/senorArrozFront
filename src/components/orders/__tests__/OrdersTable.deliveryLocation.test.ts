import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import type { OrderListItem } from '@/types/order'

const toastMocks = vi.hoisted(() => ({
    success: vi.fn(),
    error: vi.fn(),
}))

vi.mock('@/composables/useToast', () => ({
    useToast: () => toastMocks,
}))

vi.mock('@/composables/useOrderPermissions', () => ({
    useOrderPermissions: () => ({
        canChangeStatus: () => false,
        canUncancel: () => false,
        canEditPayments: () => false,
        canVerifyPayments: () => false,
        canSettleAppPayments: () => false,
    }),
}))

function order(overrides: Partial<OrderListItem> = {}): OrderListItem {
    return {
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
        addressAdditionalInfo: 'Apto 401',
        neighborhoodId: 1,
        neighborhoodName: 'Castilla',
        deliveryManId: 8,
        deliveryManName: 'Abelardo',
        guestName: null,
        type: 'delivery',
        typeDisplayName: 'Domicilio',
        deliveryFee: 5000,
        freeDeliveryRequested: false,
        reservedFor: null,
        prepareAt: null,
        status: 'on_the_way',
        statusDisplayName: 'En camino',
        statusTimes: {},
        subtotal: 30000,
        total: 35000,
        discountTotal: 0,
        notes: null,
        cancelledReason: null,
        createdAt: '2026-07-24T15:00:00.000Z',
        updatedAt: '2026-07-24T15:00:00.000Z',
        bankPayments: [],
        appPayments: [],
        totalDeposited: 0,
        summaryLines: [],
        ...overrides,
    }
}

function mountTable(row: OrderListItem) {
    return mount(OrdersTable, {
        props: { orders: [row] },
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
}

describe('OrdersTable delivery location actions', () => {
    const writeText = vi.fn()

    beforeEach(() => {
        writeText.mockReset()
        writeText.mockResolvedValue(undefined)
        toastMocks.success.mockReset()
        toastMocks.error.mockReset()
        vi.stubGlobal('navigator', { clipboard: { writeText } })
    })

    it('enlaza un domicilio en camino con pedido, sucursal y fecha', () => {
        const wrapper = mountTable(order())
        const link = wrapper.get('[aria-label="Ver ubicación del pedido 567"]')

        expect(link.attributes('class')).toContain('contextual-hover-action')
        expect(link.attributes('to')).toBeUndefined()
        const routeLink = wrapper.findAllComponents(RouterLinkStub)
            .find((item) => item.attributes('aria-label') === 'Ver ubicación del pedido 567')
        expect(routeLink?.props('to')).toEqual({
            name: 'DeliverymenManagement',
            query: {
                orderId: '567',
                branchId: '4',
                date: '2026-07-24',
            },
        })
    })

    it('no muestra el enlace fuera del estado en camino', () => {
        const wrapper = mountTable(order({ status: 'ready' }))
        expect(wrapper.find('[aria-label="Ver ubicación del pedido 567"]').exists()).toBe(false)
    })

    it('copia el mensaje contextual del domiciliario', async () => {
        const wrapper = mountTable(order())
        await wrapper.get('[aria-label="Copiar mensaje sobre el pedido 567"]').trigger('click')

        expect(writeText).toHaveBeenCalledWith(
            'Abelardo, me están preguntando por el pedido número 567, que va para la dirección Calle 10 # 20-30, Apto 401, ¿cuánto demora en llegar?',
        )
        expect(toastMocks.success).toHaveBeenCalledWith('Mensaje copiado', 2500, 'Pedido #567')
    })
})
