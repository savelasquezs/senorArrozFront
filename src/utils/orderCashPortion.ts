import type { OrderListItem } from '@/types/order'

/**
 * Parte en efectivo del pedido: Total − bancos − apps (alineado a OrderCashPortionHelper en backend).
 */
export function orderListItemCashPortion(order: OrderListItem): number {
    const bank = (order.bankPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
    const app = (order.appPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
    const raw = (order.total ?? 0) - bank - app
    return Math.max(0, Math.round(raw))
}

export function sumOrdersCashPortion(orders: OrderListItem[]): number {
    return orders.reduce((sum, o) => sum + orderListItemCashPortion(o), 0)
}
