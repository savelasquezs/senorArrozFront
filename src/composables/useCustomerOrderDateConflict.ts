import { orderApi } from '@/services/MainAPI/orderApi'
import { buildOrderSearchBody } from '@/composables/useOrderSearchPayload'
import { defaultBusinessCalendar } from '@/utils/datetime'

interface CustomerOrderDateConflictInput {
    customerId: number
    targetDate: Date
    compareByPrepareAt: boolean
}

export interface CustomerOrderDateConflictItem {
    id: number
    compareDate: Date
}

function toValidDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export async function hasCustomerOrderOnSameBusinessDate(
    input: CustomerOrderDateConflictInput,
): Promise<boolean> {
    const conflicts = await findCustomerOrdersOnSameBusinessDate(input)
    return conflicts.length > 0
}

export async function findCustomerOrdersOnSameBusinessDate(
    input: CustomerOrderDateConflictInput,
): Promise<CustomerOrderDateConflictItem[]> {
    const targetYmd = defaultBusinessCalendar.formatYmd(input.targetDate)
    const pageSize = 150
    let page = 1
    let totalPages = 1
    const conflicts: CustomerOrderDateConflictItem[] = []
    const seenIds = new Set<number>()

    while (page <= totalPages) {
        const body = buildOrderSearchBody({
            page,
            pageSize,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            excludeFutureReservations: false,
            search: '',
            totalQuery: '',
            type: null,
            status: null,
            customerId: input.customerId,
        })

        const response = await orderApi.searchOrders(body)
        totalPages = Math.max(1, response.totalPages || 1)

        for (const order of response.items) {
            const compareDate = input.compareByPrepareAt
                ? toValidDate(order.prepareAt)
                : toValidDate(order.createdAt)
            if (!compareDate) continue
            if (defaultBusinessCalendar.formatYmd(compareDate) === targetYmd) {
                if (!seenIds.has(order.id)) {
                    conflicts.push({
                        id: order.id,
                        compareDate,
                    })
                    seenIds.add(order.id)
                }
            }
        }

        page += 1
    }

    return conflicts
}
