import type { OrderDetailItem } from '@/types/order'

interface KitchenPageOrder {
    id: number
    kitchenDetails?: OrderDetailItem[] | null
}

/**
 * Kitchen list responses may embed complete card lines. Treat embedded lines as
 * authoritative even for already-cached orders: notes and quantities can change.
 * Return only uncached IDs for compatibility with an older API deployment.
 */
export function syncKitchenPageDetails(
    orders: readonly KitchenPageOrder[],
    cache: Map<number, OrderDetailItem[]>,
): number[] {
    const missing = new Set<number>()
    for (const order of orders) {
        if (Array.isArray(order.kitchenDetails)) {
            cache.set(order.id, [...order.kitchenDetails])
        } else if (!cache.has(order.id)) {
            missing.add(order.id)
        }
    }
    return [...missing]
}
