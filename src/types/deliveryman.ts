import type { OrderListItem } from './order'

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
}

export interface DeliverymanAdvance {
    id: number
    deliverymanId: number
    deliverymanName: string
    amount: number
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
}

export interface CreateDeliverymanAdvanceDto {
    deliverymanId: number
    amount: number
    notes?: string
}

export interface UpdateDeliverymanAdvanceDto {
    amount: number
    notes?: string
}

