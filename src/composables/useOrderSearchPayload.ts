import type { OrderStatus, OrderType } from '@/types/order'
import { digitPrefixFromTotalQuery } from '@/composables/useOrderFilters'

export interface OrderSearchPayloadInput {
    page: number
    pageSize: number
    sortBy: 'id' | 'total' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    excludeFutureReservations: boolean
    fromDate?: string
    toDate?: string
    bankId?: number | null
    appId?: number | null
    /** Por defecto false si se omite. */
    appPaymentsUnsettledOnly?: boolean
    /** Texto unificado cliente / teléfono / invitado (SearchTerm API) */
    search: string
    /** Campo bruto del total; se normaliza a dígitos para totalDigitsPrefix */
    totalQuery: string
    type: OrderType | null
    status: OrderStatus | null
    customerId?: number
    branchId?: number
    deliveryManId?: number
    minAmount?: number
    maxAmount?: number
    reservedFromDate?: string
    reservedToDate?: string
    neighborhoodId?: number | null
    includeOnsiteActiveInAssignedHistory?: boolean
}

/**
 * Cuerpo JSON para POST /orders/search (camelCase; el API usa OrderSearchDto).
 */
export function buildOrderSearchBody(input: OrderSearchPayloadInput): Record<string, unknown> {
    const body: Record<string, unknown> = {
        page: input.page,
        pageSize: input.pageSize,
        sortBy: input.sortBy === 'createdAt' ? 'CreatedAt' : input.sortBy,
        sortOrder: input.sortOrder,
        excludeFutureReservations: input.excludeFutureReservations,
        appPaymentsUnsettledOnly: input.appPaymentsUnsettledOnly === true,
    }

    if (input.fromDate) body.fromDate = input.fromDate
    if (input.toDate) body.toDate = input.toDate
    if (input.bankId != null) body.bankId = input.bankId
    if (input.appId != null) body.appId = input.appId

    const term = input.search.trim()
    if (term) body.searchTerm = term

    const digits = digitPrefixFromTotalQuery(input.totalQuery ?? '')
    if (digits) body.totalDigitsPrefix = digits

    if (input.type) body.type = input.type
    if (input.status) body.status = input.status
    if (input.customerId != null && input.customerId > 0) body.customerId = input.customerId
    if (input.branchId != null && input.branchId > 0) body.branchId = input.branchId
    if (input.deliveryManId != null && input.deliveryManId > 0) body.deliveryManId = input.deliveryManId
    if (input.minAmount != null) body.minAmount = input.minAmount
    if (input.maxAmount != null) body.maxAmount = input.maxAmount
    if (input.reservedFromDate) body.reservedFromDate = input.reservedFromDate
    if (input.reservedToDate) body.reservedToDate = input.reservedToDate
    if (input.neighborhoodId != null && input.neighborhoodId > 0) body.neighborhoodId = input.neighborhoodId
    if (input.includeOnsiteActiveInAssignedHistory === true)
        body.includeOnsiteActiveInAssignedHistory = true

    return body
}
