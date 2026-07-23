import { describe, expect, it } from 'vitest'
import {
    currentRouteIdForDriver,
    ordersForCurrentDeliveryRoutes,
    type DeliveryMapRouteOrder,
} from '@/utils/deliveryMapRoutes'

const order = (
    id: number,
    status: string,
    deliveryRouteId: number | null,
): DeliveryMapRouteOrder => ({
    id,
    status,
    deliveryRouteId,
    type: 'delivery',
    deliveryManId: 7,
})

describe('deliveryMapRoutes', () => {
    it('prefiere la ruta del pedido en camino sobre la ruta vieja del último GPS', () => {
        const orders = [
            order(4609, 'on_the_way', 2093),
            order(4606, 'delivered', 2092),
            order(4604, 'delivered', 2092),
        ]

        expect(currentRouteIdForDriver(orders, 7, { deliveryRouteId: 2092 })).toBe(2093)
        expect(ordersForCurrentDeliveryRoutes(orders, {
            7: { deliveryRouteId: 2092 },
        }).map((item) => item.id)).toEqual([4609])
    })

    it('incluye las entregas que pertenecen a la misma ruta vigente', () => {
        const orders = [
            order(4610, 'on_the_way', 2093),
            order(4609, 'delivered', 2093),
            order(4606, 'delivered', 2092),
        ]

        expect(ordersForCurrentDeliveryRoutes(orders, {
            7: { deliveryRouteId: 2092 },
        }).map((item) => item.id)).toEqual([4610, 4609])
    })

    it('usa la ruta del GPS durante el regreso cuando ya no quedan pedidos en camino', () => {
        const orders = [
            order(4606, 'delivered', 2092),
            order(4604, 'delivered', 2092),
            order(4599, 'delivered', 2087),
        ]

        expect(ordersForCurrentDeliveryRoutes(orders, {
            7: { deliveryRouteId: 2092 },
        }).map((item) => item.id)).toEqual([4606, 4604])
    })

    it('mantiene pedidos legados en camino aunque no tengan routeId', () => {
        const orders = [order(4609, 'on_the_way', null)]

        expect(ordersForCurrentDeliveryRoutes(orders, {}).map((item) => item.id))
            .toEqual([4609])
    })
})
