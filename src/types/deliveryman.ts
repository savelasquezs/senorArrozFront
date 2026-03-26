import type { OrderListItem } from './order'

export interface DeliverymanRouteSummaryItem {
    id: number
    totalDistanceMeters: number
    completedAtUtc?: string | null
}

export interface DeliverymanRouteDayStats {
    completedRoutesCount: number
    totalDistanceMeters: number
    routes: DeliverymanRouteSummaryItem[]
}

/** Alineado con backend DeliverymanDayLiquidationMode */
export type DeliverymanDayLiquidationMode = 0 | 1 | 2

export interface DeliverymanStats {
    deliverymanId: number
    deliverymanName: string
    ordersCount: number
    averageDeliveryTime: number // en minutos
    totalCash: number
    totalDeliveryFee: number
    totalAdvances: number
    baseAmount: number
    currentBalance: number // cash + base - advances
    /** Pedidos delivery en estado "en camino" (no entregados). */
    ordersOnTheWayCount?: number
    dayBlocked?: boolean
    liquidationMode?: DeliverymanDayLiquidationMode
}

export interface DeliverymanAdvance {
    id: number
    deliverymanId: number
    deliverymanName: string
    amount: number
    /** 0 cash, 1 bankTransfer, 2 expenseOffset */
    paymentMethod?: number
    bankId?: number | null
    bankName?: string | null
    expenseHeaderId?: number | null
    notes: string | null
    createdAt: string
    createdBy: number
    createdByName: string
    branchId: number
    branchName: string
    updatedAt: string
}

export interface DeliverymanDetail extends DeliverymanStats {
    orders: OrderListItem[]
    /** Agregado del día (o rango) sin filtro de ciclo; solo lectura en UI. */
    fullDayStats?: DeliverymanStats
    fullDayOrders?: OrderListItem[]
    routeDayStats?: DeliverymanRouteDayStats
    fullDayRouteDayStats?: DeliverymanRouteDayStats
}

/** Alineado con API JSON (enum en snake_case) o valor numérico del enum */
export type DeliverymanAdvancePaymentMethodInput =
    | number
    | 'cash'
    | 'bank_transfer'
    | 'expense_offset'

export interface CreateDeliverymanAdvanceDto {
    deliverymanId: number
    amount: number
    paymentMethod?: DeliverymanAdvancePaymentMethodInput
    bankId?: number | null
    expenseHeaderId?: number | null
    notes?: string
}

export interface SettleDeliverymanBankLineDto {
    bankId: number
    amount: number
}

export interface SettleDeliverymanExpenseLineDto {
    expenseHeaderId: number
    amount: number
}

export interface SettleDeliverymanDayDto {
    date: string
    baseAmount: number
    cashAmount: number
    bankTransfers: SettleDeliverymanBankLineDto[]
    expenseOffsets: SettleDeliverymanExpenseLineDto[]
    /** 1 full, 2 return base */
    mode: 1 | 2
}

export interface SettleDeliverymanDayResultDto {
    advances: DeliverymanAdvance[]
    surplusApplied: number
}

export interface UpdateDeliverymanAdvanceDto {
    amount: number
    notes?: string
}

