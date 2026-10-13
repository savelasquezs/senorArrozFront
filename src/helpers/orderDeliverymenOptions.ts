import type { PagedResult } from '@/types/common'
import type { OrderListItem } from '@/types/order'

export type DeliverymanOption = { value: number; label: string }

/**
 * The default day/remote workspace already fetches every order when the
 * server result fits in the main page. Derive the driver dropdown from that
 * SAME unfiltered snapshot instead of running a second /orders/search.
 *
 * Fail closed: when any filter restricts the main query, or pagination hides
 * some orders, return null and let the existing exhaustive driver query run.
 */
export function deliverymenFromCompleteOrderPage(
    body: Record<string, unknown>,
    response: Pick<PagedResult<OrderListItem>, 'items' | 'totalCount'>,
): DeliverymanOption[] | null {
    const unfilteredQueryFields = new Set([
        'page', 'pageSize', 'sortBy', 'sortOrder',
        'excludeFutureReservations', 'appPaymentsUnsettledOnly',
        'fromDate', 'toDate', 'branchId', 'remoteOnly',
    ])
    if (Object.keys(body).some(key => !unfilteredQueryFields.has(key))) return null
    if (body.appPaymentsUnsettledOnly === true || body.page !== 1
        || typeof body.pageSize !== 'number' || !Number.isSafeInteger(body.pageSize)
        || body.pageSize < 1 || !Number.isSafeInteger(response.totalCount)
        || response.totalCount < 0 || response.totalCount !== response.items.length
        || response.items.length > body.pageSize) {
        return null
    }

    const unique = new Map<number, string>()
    for (const order of response.items) {
        if (order.type !== 'delivery' || order.deliveryManId == null || order.deliveryManId <= 0) continue
        if (!unique.has(order.deliveryManId)) {
            unique.set(order.deliveryManId,
                order.deliveryManName?.trim() || `Domiciliario #${order.deliveryManId}`)
        }
    }

    return [...unique.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
}
