import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DeliverymenManagementView from '@/views/DeliverymenManagementView.vue'

const apiMocks = vi.hoisted(() => ({
    fetchDetail: vi.fn(),
    fetchAssignedOrders: vi.fn(),
    getDailyOverview: vi.fn(),
    getDaySummary: vi.fn(),
    getLastLocation: vi.fn(),
}))
const routerMocks = vi.hoisted(() => ({
    replace: vi.fn(),
    push: vi.fn(),
}))
const scrollIntoView = vi.hoisted(() => vi.fn())
const signalRMocks = vi.hoisted(() => ({
    on: vi.fn(),
    off: vi.fn(),
    reconnectNow: vi.fn(),
    connectionState: { __v_isRef: true, value: 'connected' },
}))

vi.mock('vue-router', () => ({
    useRoute: () => ({
        query: {
            orderId: '567',
            branchId: '999',
            date: '2026-07-23',
        },
    }),
    useRouter: () => routerMocks,
}))

vi.mock('@/store/auth', () => ({
    useAuthStore: () => ({
        userRole: 'Superadmin',
        user: { branchId: null },
    }),
}))

vi.mock('@/store/ordersDrafts', () => ({
    useOrdersDraftsStore: () => ({
        banks: [],
        loadBanks: vi.fn(),
    }),
}))

vi.mock('@/composables/useToast', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
    }),
}))

vi.mock('@/composables/useSignalR', () => ({
    useSignalR: () => signalRMocks,
}))

vi.mock('@/services/MainAPI/orderApi', () => ({
    orderApi: {
        fetchDetail: apiMocks.fetchDetail,
        fetchAssignedOrders: apiMocks.fetchAssignedOrders,
    },
}))

vi.mock('@/services/MainAPI/deliverymanApi', () => ({
    deliverymanApi: {
        getDailyOverview: apiMocks.getDailyOverview,
        getDaySummary: apiMocks.getDaySummary,
        getLastLocation: apiMocks.getLastLocation,
    },
}))

const focusedOrder = {
    id: 567,
    branchId: 4,
    branchName: 'Castilla',
    takenById: 1,
    takenByName: 'Caja',
    customerId: 2,
    customerName: 'María',
    customerPhone: '3001234567',
    addressId: 3,
    addressDescription: 'Calle 10 # 20-30',
    addressAdditionalInfo: null,
    neighborhoodId: 1,
    neighborhoodName: 'Castilla',
    latitude: 6.24,
    longitude: -75.58,
    deliveryManId: 8,
    deliveryManName: 'Abelardo',
    deliveryRouteId: 30,
    guestName: null,
    type: 'delivery',
    typeDisplayName: 'Domicilio',
    deliveryFee: 5000,
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
    orderDetails: [],
}

describe('DeliverymenManagementView focused order navigation', () => {
    beforeEach(() => {
        apiMocks.fetchDetail.mockReset().mockResolvedValue(focusedOrder)
        apiMocks.fetchAssignedOrders.mockReset().mockResolvedValue({
            items: [focusedOrder],
            totalCount: 1,
            page: 1,
            pageSize: 200,
            totalPages: 1,
        })
        apiMocks.getDailyOverview.mockReset().mockResolvedValue({
            deliverymen: [{
                deliverymanId: 8,
                deliverymanName: 'Abelardo',
                ordersCount: 1,
                averageDeliveryTime: 20,
                totalCash: 0,
                totalDeliveryFee: 5000,
                totalAdvances: 0,
                baseAmount: 0,
                currentBalance: 0,
            }],
            advances: [],
        })
        apiMocks.getDaySummary.mockReset().mockResolvedValue({
            deliverymanId: 8,
            deliverymanName: 'Abelardo',
            ordersCount: 1,
            averageDeliveryTime: 20,
            totalCash: 337000,
            totalDeliveryFee: 5000,
            totalAdvances: 0,
            baseAmount: 55000,
            currentBalance: 392000,
            orders: [],
        })
        apiMocks.getLastLocation.mockReset().mockResolvedValue({
            latitude: 6.23,
            longitude: -75.59,
            recordedAt: '2026-07-24T15:05:00.000Z',
            deliveryRouteId: 30,
        })
        routerMocks.replace.mockReset()
        routerMocks.push.mockReset()
        scrollIntoView.mockReset()
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: scrollIntoView,
        })
    })

    it('activa el mapa, valida sucursal y fecha con el pedido y propaga el foco', async () => {
        const wrapper = mount(DeliverymenManagementView, {
            global: {
                stubs: {
                    MainLayout: { template: '<main><slot /></main>' },
                    BaseDatePicker: { template: '<input />' },
                    BaseButton: { template: '<button><slot /></button>' },
                    DeliverymanCard: true,
                    AdvancesTable: true,
                    AdvanceForm: true,
                    DeliverymanDetailModal: true,
                    LiquidationWizardModal: true,
                    LiquidationConfirmModal: true,
                    DeliverymanOrdersModal: true,
                    AsyncComponentWrapper: {
                        props: ['orders', 'deliverymanLocations', 'focusOrderId'],
                        template: '<div data-test="delivery-map" :data-focus="focusOrderId" :data-orders="orders.length" />',
                    },
                    DeliveryMap: {
                        props: ['orders', 'deliverymanLocations', 'focusOrderId'],
                        emits: ['focus-completed'],
                        template: '<button data-test="delivery-map" :data-focus="focusOrderId" :data-orders="orders.length" @click="$emit(\'focus-completed\', focusOrderId)" />',
                    },
                },
            },
        })
        await flushPromises()
        await vi.dynamicImportSettled()
        await flushPromises()

        expect(apiMocks.fetchDetail).toHaveBeenCalledWith(567)
        expect(apiMocks.getDailyOverview).toHaveBeenCalledWith({
            date: '2026-07-24',
            branchId: 4,
        })
        expect(apiMocks.fetchAssignedOrders).toHaveBeenCalledWith(
            8,
            expect.objectContaining({
                fromDate: '2026-07-24',
                toDate: '2026-07-24',
                branchId: 4,
            }),
        )
        const map = wrapper.get('[data-test="delivery-map"]')
        expect(map.attributes('data-focus')).toBe('567')
        expect(map.attributes('data-orders')).toBe('1')
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })

        await map.trigger('click')
        expect(wrapper.get('[data-test="delivery-map"]').attributes('data-focus')).toBeUndefined()

        wrapper.unmount()
    })

    it('refresca el detalle y la tabla de abonos después de crear un gasto', async () => {
        const wrapper = mount(DeliverymenManagementView, {
            global: {
                stubs: {
                    MainLayout: { template: '<main><slot /></main>' },
                    BaseDatePicker: { template: '<input />' },
                    BaseButton: { template: '<button><slot /></button>' },
                    DeliverymanCard: true,
                    AdvancesTable: true,
                    AdvanceForm: true,
                    DeliverymanDetailModal: true,
                    LiquidationWizardModal: true,
                    LiquidationConfirmModal: true,
                    DeliverymanOrdersModal: true,
                    AsyncComponentWrapper: true,
                    DeliveryMap: true,
                },
            },
        })
        await flushPromises()
        await vi.dynamicImportSettled()
        await flushPromises()

        wrapper.findComponent({ name: 'DeliverymanCard' }).vm.$emit('view-detail', 8)
        await flushPromises()

        const createdAdvance = {
            id: 91,
            deliverymanId: 8,
            deliverymanName: 'Abelardo',
            amount: 61800,
            paymentMethod: 2,
            expenseHeaderId: 730,
            notes: 'gasto #730 - Proveedor General',
            createdAt: '2026-07-24T16:00:00Z',
            createdBy: 1,
            createdByName: 'Caja',
            branchId: 4,
            branchName: 'Castilla',
            updatedAt: '2026-07-24T16:00:00Z',
        }
        apiMocks.getDailyOverview.mockResolvedValueOnce({
            deliverymen: [{
                deliverymanId: 8,
                deliverymanName: 'Abelardo',
                ordersCount: 1,
                averageDeliveryTime: 20,
                totalCash: 337000,
                totalDeliveryFee: 5000,
                totalAdvances: 61800,
                baseAmount: 55000,
                currentBalance: 330200,
            }],
            advances: [createdAdvance],
        })
        apiMocks.getDaySummary.mockResolvedValueOnce({
            deliverymanId: 8,
            deliverymanName: 'Abelardo',
            ordersCount: 1,
            averageDeliveryTime: 20,
            totalCash: 337000,
            totalDeliveryFee: 5000,
            totalAdvances: 61800,
            baseAmount: 55000,
            currentBalance: 330200,
            orders: [],
        })

        wrapper.findComponent({ name: 'LiquidationWizardModal' }).vm.$emit('detail-refresh-requested')
        await flushPromises()

        expect(apiMocks.getDailyOverview).toHaveBeenCalledTimes(2)
        expect(apiMocks.getDaySummary).toHaveBeenCalledTimes(2)
        expect(wrapper.findComponent({ name: 'AdvancesTable' }).props('advances')).toEqual([createdAdvance])

        wrapper.unmount()
    })
})
