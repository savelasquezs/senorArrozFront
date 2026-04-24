import type { OrderAppPaymentDetail, OrderListItem } from '@/types/order'

/** True si el pedido (listado/detalle) ya tiene al menos un pago banco o app registrado. */
export function orderHasElectronicPayments(
    order: Pick<OrderListItem, 'bankPayments' | 'appPayments'>,
): boolean {
    return (order.bankPayments?.length ?? 0) > 0 || (order.appPayments?.length ?? 0) > 0
}

/** Liquidación: el API envía `isSetted`; el front también usa `isSettled` en tipos de listado/detalle. */
export function appPaymentIsSettled(
    p: Pick<OrderAppPaymentDetail, 'isSettled'> & { isSetted?: boolean },
): boolean {
    return p.isSettled === true || p.isSetted === true
}
