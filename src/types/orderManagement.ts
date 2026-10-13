import type { OrderStatus } from './order'
import type { BankType } from './bank'

export interface RemoteOrderBranch { id: number; name: string; sampleOrderId: number }
export interface OrderBankOption { id: number; name: string; branchId: number; active: boolean; imageUrl?: string | null; type: BankType }
export interface OrderAppOption { id: number; name: string; bankId: number; bankName: string; branchId: number; active: boolean; imageUrl?: string | null }
export interface OrderOperationOptions {
    branchId: number
    branchName: string
    banks: OrderBankOption[]
    apps: OrderAppOption[]
    deliverymen: Array<{ id: number; name: string }>
    maxFreeDeliveryDiscount: number
}
export interface OrderTracking {
    orderId: number
    status: OrderStatus
    deliveryManId: number | null
    deliveryRouteId: number | null
    deliveryManName: string | null
    managementVersion: number
    location: { latitude: number; longitude: number; recordedAt: string; isFresh: boolean } | null
}
