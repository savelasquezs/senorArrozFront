export interface DeliveryMapRouteOrder {
    id: number
    type: string
    deliveryManId: number | null
    deliveryRouteId?: number | null
    status: string
}

export interface DeliveryMapRouteLocation {
    deliveryRouteId?: number | null
}

/**
 * La ruta de un pedido actualmente "en camino" es más reciente y confiable
 * que la ruta incluida en el último punto GPS, que puede haber sido capturado
 * antes de que se asignara la ruta nueva.
 */
export function currentRouteIdForDriver(
    orders: DeliveryMapRouteOrder[],
    driverId: number,
    location?: DeliveryMapRouteLocation,
): number | null {
    const activeOrder = orders
        .filter((order) =>
            order.type === 'delivery'
            && order.deliveryManId === driverId
            && order.status === 'on_the_way'
            && order.deliveryRouteId != null)
        .sort((a, b) => b.id - a.id)[0]

    return activeOrder?.deliveryRouteId ?? location?.deliveryRouteId ?? null
}

/**
 * Devuelve únicamente las paradas de la ruta vigente de cada domiciliario.
 * Si todavía no existe routeId (datos legados), conserva los pedidos en camino.
 */
export function ordersForCurrentDeliveryRoutes<T extends DeliveryMapRouteOrder>(
    orders: T[],
    locations: Record<number, DeliveryMapRouteLocation>,
): T[] {
    const driverIds = new Set(
        orders
            .map((order) => order.deliveryManId)
            .filter((id): id is number => id != null),
    )
    const result: T[] = []

    for (const driverId of driverIds) {
        const driverOrders = orders.filter((order) =>
            order.type === 'delivery' && order.deliveryManId === driverId)
        const routeId = currentRouteIdForDriver(driverOrders, driverId, locations[driverId])

        if (routeId != null) {
            result.push(...driverOrders.filter((order) => order.deliveryRouteId === routeId))
        } else {
            result.push(...driverOrders.filter((order) => order.status === 'on_the_way'))
        }
    }

    return result.sort((a, b) => b.id - a.id)
}
