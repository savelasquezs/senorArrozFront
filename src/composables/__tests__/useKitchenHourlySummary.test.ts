import { describe, expect, it } from 'vitest'
import { buildKitchenDailyCategorySummary, buildKitchenHourlySummary } from '@/composables/useKitchenHourlySummary'
import type { OrderDetailItem, OrderListItem } from '@/types/order'

const makeOrder = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
    id: 1,
    branchId: 1,
    branchName: 'Centro',
    takenById: 1,
    takenByName: 'Caja',
    customerId: null,
    customerName: null,
    customerPhone: null,
    addressId: null,
    addressDescription: null,
    neighborhoodId: null,
    neighborhoodName: null,
    deliveryManId: null,
    deliveryManName: null,
    guestName: null,
    type: 'onsite',
    typeDisplayName: 'En sitio',
    deliveryFee: null,
    reservedFor: null,
    prepareAt: null,
    status: 'taken',
    statusDisplayName: 'Tomado',
    statusTimes: {},
    subtotal: 0,
    total: 0,
    discountTotal: 0,
    notes: null,
    cancelledReason: null,
    createdAt: '2026-05-07T13:10:00.000Z',
    updatedAt: '2026-05-07T13:10:00.000Z',
    bankPayments: [],
    appPayments: [],
    totalDeposited: 0,
    summaryLines: [],
    ...overrides,
})

const makeItem = (overrides: Partial<OrderDetailItem> = {}): OrderDetailItem => ({
    id: 1,
    orderId: 1,
    productId: 1,
    productCategoryId: 10,
    productCategoryName: 'Arroz ropa vieja con chicharrón Súper',
    productName: 'Súper Familiar',
    productDescription: null,
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    subtotal: 0,
    notes: null,
    createdAt: '2026-05-07T13:10:00.000Z',
    updatedAt: '2026-05-07T13:10:00.000Z',
    ...overrides,
})

describe('buildKitchenHourlySummary', () => {
    it('agrupa por hora redondeada y manda pedidos inmediatos a la hora actual', () => {
        const now = new Date('2026-05-07T15:45:00.000-05:00')
        const orders = [
            makeOrder({
                id: 1,
                prepareAt: '2026-05-07T10:20:00.000-05:00',
                createdAt: '2026-05-07T09:00:00.000-05:00',
            }),
            makeOrder({
                id: 2,
                prepareAt: null,
                createdAt: '2026-05-07T11:10:00.000-05:00',
            }),
        ]
        const items = new Map<number, OrderDetailItem[]>([
            [1, [makeItem({ orderId: 1, productName: 'Trío' })]],
            [2, [makeItem({ id: 2, orderId: 2, productName: 'Personal' })]],
        ])

        const result = buildKitchenHourlySummary(orders, items, '2026-05-07', now)

        expect(result.hourSlots.map((slot) => slot.label)).toEqual(['10 am', '3 pm'])
        expect(result.defaultHourKey).toBe('15')
        expect(result.groupedByHour['10'][0]?.lines[0]).toEqual({ name: 'Trío', quantity: 1 })
        expect(result.groupedByHour['15'][0]?.lines[0]).toEqual({ name: 'Personal', quantity: 1 })
    })

    it('filtra por estado y por fecha usando prepareAt o createdAt', () => {
        const now = new Date('2026-05-07T15:45:00.000-05:00')
        const orders = [
            makeOrder({
                id: 1,
                status: 'taken',
                prepareAt: '2026-05-07T10:20:00.000-05:00',
                createdAt: '2026-05-01T10:00:00.000-05:00',
                type: 'reservation',
            }),
            makeOrder({
                id: 2,
                status: 'ready',
                prepareAt: '2026-05-07T11:00:00.000-05:00',
            }),
            makeOrder({
                id: 3,
                status: 'in_preparation',
                prepareAt: null,
                createdAt: '2026-05-06T18:00:00.000-05:00',
            }),
        ]
        const items = new Map<number, OrderDetailItem[]>([
            [1, [makeItem({ orderId: 1 })]],
            [2, [makeItem({ id: 2, orderId: 2 })]],
            [3, [makeItem({ id: 3, orderId: 3 })]],
        ])

        const result = buildKitchenHourlySummary(orders, items, '2026-05-07', now)

        expect(result.totalOrderCount).toBe(1)
        expect(result.hourSlots).toHaveLength(1)
        expect(result.hourSlots[0]?.key).toBe('10')
    })

    it('acumula cantidades por categoría y ordena productos por tamaño', () => {
        const now = new Date('2026-05-07T15:45:00.000-05:00')
        const orders = [
            makeOrder({ id: 1, prepareAt: '2026-05-07T10:20:00.000-05:00' }),
            makeOrder({ id: 2, prepareAt: '2026-05-07T10:40:00.000-05:00' }),
        ]
        const items = new Map<number, OrderDetailItem[]>([
            [1, [
                makeItem({ orderId: 1, productName: 'Personal', quantity: 2 }),
                makeItem({ id: 2, orderId: 1, productName: 'Trío', quantity: 1 }),
            ]],
            [2, [
                makeItem({ id: 3, orderId: 2, productName: 'Súper Familiar', quantity: 3 }),
                makeItem({ id: 4, orderId: 2, productName: 'Personal', quantity: 4 }),
            ]],
        ])

        const result = buildKitchenHourlySummary(orders, items, '2026-05-07', now)
        const card = result.groupedByHour['10'][0]

        expect(card.title).toBe('super ropa chich')
        expect(card.lines).toEqual([
            { name: 'super', quantity: 3 },
            { name: 'Trío', quantity: 1 },
            { name: 'Personal', quantity: 6 },
        ])
    })
})

describe('buildKitchenDailyCategorySummary', () => {
    it('acumula todo el día por categoría sin separar por hora', () => {
        const orders = [
            makeOrder({
                id: 1,
                status: 'taken',
                prepareAt: '2026-05-07T10:20:00.000-05:00',
            }),
            makeOrder({
                id: 2,
                status: 'in_preparation',
                prepareAt: '2026-05-07T14:40:00.000-05:00',
            }),
        ]
        const items = new Map<number, OrderDetailItem[]>([
            [1, [
                makeItem({
                    orderId: 1,
                    productCategoryName: 'Arroz ropa vieja con chicharrón Súper',
                    productName: 'Trío',
                    quantity: 3,
                }),
                makeItem({
                    id: 2,
                    orderId: 1,
                    productCategoryName: 'Arroz paisa',
                    productName: 'Súper Familiar',
                    quantity: 2,
                }),
            ]],
            [2, [
                makeItem({
                    id: 3,
                    orderId: 2,
                    productCategoryName: 'Arroz ropa vieja con chicharrón Súper',
                    productName: 'Súper Familiar',
                    quantity: 5,
                }),
                makeItem({
                    id: 4,
                    orderId: 2,
                    productCategoryName: 'Arroz paisa',
                    productName: 'Familiar',
                    quantity: 4,
                }),
            ]],
        ])

        const result = buildKitchenDailyCategorySummary(orders, items, '2026-05-07')

        expect(result).toEqual([
            {
                key: 'arroz paisa',
                title: 'paisa',
                totalQuantity: 6,
                lines: [
                    { name: 'super', quantity: 2 },
                    { name: 'Familiar', quantity: 4 },
                ],
            },
            {
                key: 'arroz ropa vieja con chicharrón súper',
                title: 'super ropa chich',
                totalQuantity: 8,
                lines: [
                    { name: 'super', quantity: 5 },
                    { name: 'Trío', quantity: 3 },
                ],
            },
        ])
    })

    it('reutiliza el mismo filtrado por estado y fecha operativa', () => {
        const orders = [
            makeOrder({
                id: 1,
                status: 'taken',
                prepareAt: '2026-05-07T10:20:00.000-05:00',
                createdAt: '2026-05-01T08:00:00.000-05:00',
            }),
            makeOrder({
                id: 2,
                status: 'in_preparation',
                prepareAt: null,
                createdAt: '2026-05-07T18:15:00.000-05:00',
            }),
            makeOrder({
                id: 3,
                status: 'ready',
                prepareAt: '2026-05-07T19:00:00.000-05:00',
            }),
            makeOrder({
                id: 4,
                status: 'taken',
                prepareAt: null,
                createdAt: '2026-05-06T23:55:00.000-05:00',
            }),
        ]
        const items = new Map<number, OrderDetailItem[]>([
            [1, [makeItem({ orderId: 1, quantity: 2 })]],
            [2, [makeItem({ id: 2, orderId: 2, quantity: 3, productName: 'Familiar' })]],
            [3, [makeItem({ id: 3, orderId: 3, quantity: 4, productName: 'Trío' })]],
            [4, [makeItem({ id: 4, orderId: 4, quantity: 5, productName: 'Personal' })]],
        ])

        const result = buildKitchenDailyCategorySummary(orders, items, '2026-05-07')

        expect(result).toHaveLength(1)
        expect(result[0]?.totalQuantity).toBe(5)
        expect(result[0]?.lines).toEqual([
            { name: 'super', quantity: 2 },
            { name: 'Familiar', quantity: 3 },
        ])
    })
})
