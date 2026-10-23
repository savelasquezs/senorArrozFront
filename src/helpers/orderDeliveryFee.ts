import type { OrderType } from '@/types/order'

export const MAX_ORDER_DELIVERY_FEE = 50000

export function hasOrderDelivery(order: { type: OrderType; addressId?: number | null }): boolean {
    return order.type === 'delivery' || (order.type === 'reservation' && order.addressId != null)
}

export function deliveryFeeValidationMessage(value: number | string | null | undefined): string {
    if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) {
        return 'Ingresa el valor del domicilio. Usa 0 si no tiene costo.'
    }
    if (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > MAX_ORDER_DELIVERY_FEE) {
        return 'Ingresa un valor entre $0 y $50.000, sin decimales.'
    }
    return ''
}
