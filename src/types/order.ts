// src/types/order.ts
import type { PagedResult } from './common'

// Order Types
export type OrderType = 'onsite' | 'delivery' | 'reservation'

export interface User {
    id: number
    name: string
    email: string
    phone?: string
}

export interface Address {
    id: number
    customerId: number
    street: string
    neighborhood: string
    city: string
    phone?: string
    isDefault: boolean
    deliveryFee: number
}

export interface LoyaltyRule {
    id: number
    name: string
    description: string
    discountPercentage?: number
}

// Order Detail
export interface OrderDetail {
    id: number
    orderId: number
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    discount: number
    notes?: string
    subtotal: number
}

// Payment related
export interface OrderBankPayment {
    bankId: number
    amount: number
}

export interface OrderAppPayment {
    appId: number
    amount: number
}

// Main Order entity
export interface Order {
    id: number
    branchId: number
    branchName: string
    takenById: number
    takenByName: string
    customerId?: number
    customerName?: string
    customerPhone?: string
    addressId?: number
    address?: Address
    loyaltyRuleId?: number
    loyaltyRule?: LoyaltyRule
    type: OrderType
    deliveryFee?: number
    reservedFor?: string
    subtotal: number
    total: number
    discountTotal: number
    notes?: string
    status: string
    createdAt: string
    updatedAt: string

    // Relations
    orderDetails: OrderDetail[]
    bankPayments: OrderBankPayment[]
    appPayments: OrderAppPayment[]
}

// DTOs for creation
export interface CreateOrderDetailDto {
    productId: number
    quantity: number
    unitPrice: number
    discount?: number
    notes?: string
}

export interface CreateOrderBankPaymentDto {
    bankId: number
    amount: number
}

export interface CreateOrderAppPaymentDto {
    appId: number
    amount: number
}

export interface CreateOrderDto {
    branchId: number
    takenById: number
    customerId?: number
    addressId?: number
    loyaltyRuleId?: number
    type: OrderType
    deliveryFee?: number
    reservedFor?: string
    notes?: string
    orderDetails: CreateOrderDetailDto[]
    bankPayments?: CreateOrderBankPaymentDto[]
    appPayments?: CreateOrderAppPaymentDto[]
}

export interface UpdateOrderDto {
    customerId?: number
    addressId?: number
    loyaltyRuleId?: number
    type?: OrderType
    deliveryId?: number
    reservedFor?: string
    notes?: string
}

// Filters
export interface OrderFilters {
    branchId?: number
    customerId?: number
    type?: OrderType
    status?: string
    createdAt?: string
    reservedFor?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

// Store State interfaces
export interface ActiveOrder {
    id: string // UUID generado en frontend
    branchId: number
    takenById: number
    customerId?: number
    addressId?: number
    loyaltyRuleId?: number
    type: OrderType
    deliveryFee?: number
    reservedFor?: string
    notes?: string
    orderDetails: ActiveOrderDetail[]
    bankPayments: ActiveBankPayment[]
    appPayments: ActiveAppPayment[]

    // Calculated fields
    subtotal: number
    total: number
    discountTotal: number

    // UI state
    isDirty: boolean
    createdAt: string
}

export interface ActiveOrderDetail {
    id: string // UUID generado en frontend
    productId: number
    productName: string
    productPrice: number
    productStock?: number
    quantity: number
    unitPrice: number
    discount: number
    notes?: string
}

export interface ActiveBankPayment {
    id: string // UUID generado en frontend
    bankId: number
    bankName?: string
    amount: number
}

export interface ActiveAppPayment {
    id: string // UUID generado en frontend
    appId: number
    appName?: string
    amount: number
}

// Quick access types
export interface Product {
    id: number
    name: string
    price: number
    stock?: number
    categoryId: number
    categoryName: string
    active: boolean
}

export interface ProductCategory {
    id: number
    name: string
    branchId: number
    active: boolean
}

// Store types
export interface OrdersState {
    // Main orders list
    list: PagedResult<Order> | null
    current: Order | null

    // Active orders (work in progress)
    activeOrders: Map<string, ActiveOrder>
    activeOrderId: string | null

    // Products and categories for UI
    products: Product[]
    categories: ProductCategory[]

    // UI state
    isLoading: boolean
    error: string | null

    // Search and filters
    searchQuery: string
    selectedCategory: number | null
}

// Events
export interface OrderEvent {
    type: 'created' | 'updated' | 'deleted' | 'status_changed'
    orderId: number
    data?: any
}

export type OrderEventHandler = (event: OrderEvent) => void

