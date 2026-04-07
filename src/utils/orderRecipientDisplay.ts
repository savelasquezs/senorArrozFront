import type { OrderListItem } from '@/types/order'

/** Mínimo para mostrar «quien recibe» en listados (guest antes que titular). */
export type OrderRecipientNameSource = Pick<OrderListItem, 'guestName' | 'customerName'>

/** Prioriza quien recibe (guestName); si vacío, titular del pedido (customerName). */
export function orderListRecipientDisplayName(order: OrderRecipientNameSource): string {
    const g = order.guestName?.trim()
    const c = order.customerName?.trim()
    return g || c || ''
}

/** Tooltip: si hay ambos nombres y difieren, muestra también el cliente del pedido. */
export function orderListRecipientDisplayTitle(order: OrderRecipientNameSource): string {
    const line1 = orderListRecipientDisplayName(order)
    const g = order.guestName?.trim()
    const c = order.customerName?.trim()
    if (g && c && g !== c) return `${line1} (cliente: ${c})`
    return line1
}
