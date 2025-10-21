// src/types/order.ts

// Importar tipos existentes para evitar duplicación
import type { PagedResult } from './common'
import type { BankPayment, AppPayment } from './bank'

import type { Product, ProductCategory } from './product'

// ===== TIPOS BÁSICOS =====
export type OrderType = 'onsite' | 'delivery' | 'reservation'
export type OrderStatus = 'taken' | 'in_preparation' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled'

export interface OrderItem {
    tempId: string
    productId: number
    productName: string
    productPrice: number
    quantity: number
    unitPrice: number
    discount: number
    subtotal: number
    notes: string
}

// ===== TIPOS DE PEDIDOS ACTIVOS (Sistema Existente) =====
export interface ActiveOrder {
    id: string
    branchId: number
    takenById: number
    customerId?: number
    addressId?: number
    loyaltyRuleId?: number
    type: OrderType
    deliveryFee?: number
    reservedFor?: Date
    notes?: string
    orderDetails: OrderDetail[]
    bankPayments: OrderBankPayment[]
    appPayments: OrderAppPayment[]
    subtotal: number
    discountTotal: number
    total: number
    createdAt: string
    isDirty: boolean
}

export interface OrderDetail {
    id: string
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    discount: number
    notes?: string
    subtotal: number
}

export interface OrderBankPayment {
    tempId: string  // Local identifier
    bankId: number
    bankName: string
    amount: number
    manuallyEdited?: boolean  // Indica si fue editado manualmente por el usuario
}

export interface OrderAppPayment {
    tempId: string  // Local identifier
    appId: number
    appName: string
    bankId: number
    bankName: string
    amount: number
    manuallyEdited?: boolean  // Indica si fue editado manualmente por el usuario
}

// ===== TIPOS DE PEDIDOS EN BORRADOR (Sistema Nuevo) =====
export interface DraftOrder {
    tabId: string
    tabName: string
    type: OrderType
    customerId: number | null
    customerName: string | null
    customerPhone: string | null
    guestName: string | null
    addressId: number | null
    addressDescription: string | null
    deliveryFee: number
    reservedFor: Date | null
    notes: string
    orderItems: OrderItem[]
    bankPayments: OrderBankPayment[]
    appPayment: OrderAppPayment | null
    subtotal: number
    total: number
    discountTotal: number
    createdAt: Date
    updatedAt: Date
}

// ===== TIPOS DE PEDIDOS COMPLETADOS =====
export interface Order {
    id: number
    branchId: number
    branchName: string
    takenById: number
    takenByName: string
    customerId?: number
    customerName?: string
    customerPhone?: string
    guestName?: string
    addressId?: number
    addressDescription?: string
    loyaltyRuleId?: number
    loyaltyRuleName?: string
    type: OrderType
    status: OrderStatus
    deliveryFee?: number
    reservedFor?: Date
    notes?: string
    orderDetails: OrderDetail[]
    bankPayments: BankPayment[]
    appPayments: AppPayment[]
    subtotal: number
    discountTotal: number
    total: number
    createdAt: string
    updatedAt: string
}

// ===== TIPOS PARA TABS =====
export interface OrderTab {
    tabId: string
    tabName: string
    itemCount: number
    total: number
    type: OrderType
    customerName?: string
    isActive: boolean
}

// ===== TIPOS DE ESTADO DEL STORE =====
export interface OrdersState {
    // Sistema existente
    list: PagedResult<Order> | null
    current: Order | null
    activeOrders: Map<string, ActiveOrder>
    activeOrderId: string | null
    products: Product[]
    categories: ProductCategory[]

    // Sistema nuevo de múltiples tabs
    draftOrders: Map<string, DraftOrder>
    currentTabId: string | null
    maxTabs: number
    nextTabNumber: number

    // Estados de carga
    loading: boolean
    error: string | null
    submitting: boolean
}

// Re-exportar tipos de otros archivos
export type { Product, ProductCategory } from './product'
export type { Customer, CustomerAddress } from './customer'
export type { BankPayment, AppPayment } from './bank'
export type { User } from './user'

// ===== TIPOS PARA PERSISTENCIA =====
export interface StoredOrdersState {
    draftOrders: DraftOrder[]
    currentTabId: string | null
    nextTabNumber: number
    lastSaved: string
}

// ===== TIPOS PARA VALIDACIÓN =====
export interface ValidationResult {
    isValid: boolean
    errors: string[]
}

// ===== TIPOS PARA FILTROS =====
export interface OrderFilters {
    branchId?: number
    customerId?: number
    type?: OrderType
    status?: OrderStatus
    fromDate?: string
    toDate?: string
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

// ===== TIPOS PARA VISTA DE LISTA =====
export interface OrderListItem {
    id: number
    branchId: number
    branchName: string
    takenById: number
    takenByName: string
    customerId: number | null
    customerName: string | null
    customerPhone: string | null
    addressId: number | null
    addressDescription: string | null
    deliveryManId: number | null
    deliveryManName: string | null
    guestName: string | null
    type: OrderType
    typeDisplayName: string
    deliveryFee: number | null
    reservedFor: string | null
    status: OrderStatus
    statusDisplayName: string
    statusTimes: Record<string, string>
    subtotal: number
    total: number
    discountTotal: number
    notes: string | null
    cancelledReason: string | null
    createdAt: string
    updatedAt: string
}

// ===== TIPOS PARA VISTA DE DETALLE =====
export interface OrderDetailView extends OrderListItem {
    orderDetails: OrderDetailItem[]
    bankPayments: OrderBankPaymentDetail[]
    appPayments: OrderAppPaymentDetail[]
}

export interface OrderDetailItem {
    id: number
    orderId: number
    productId: number
    productName: string
    productDescription: string | null
    quantity: number
    unitPrice: number
    discount: number
    subtotal: number
    notes: string | null
    createdAt: string
    updatedAt: string
}

export interface OrderBankPaymentDetail {
    id: number
    orderId: number
    bankId: number
    bankName: string
    branchId: number
    branchName: string
    amount: number
    verifiedAt: string | null
    isVerified: boolean
}

export interface OrderAppPaymentDetail {
    id: number
    orderId: number
    appId: number
    appName: string
    bankId: number | null
    bankName: string | null
    branchId: number
    branchName: string
    amount: number
    isSettled: boolean
    settledAt: string | null
}

// ===== TIPOS PARA CREACIÓN/ACTUALIZACIÓN =====
export interface CreateOrderDto {
    branchId: number
    takenById: number
    customerId?: number
    addressId?: number
    loyaltyRuleId?: number
    type: OrderType
    status: OrderStatus
    deliveryFee?: number
    reservedFor?: Date
    notes?: string
    guestName?: string
    orderDetails: CreateOrderDetailDto[]
    bankPayments?: CreateBankPaymentDto[]
    appPayments?: CreateAppPaymentDto[]
}

export interface CreateOrderDetailDto {
    productId: number
    quantity: number
    unitPrice: number
    discount?: number
    notes?: string
}

export interface CreateBankPaymentDto {
    bankId: number
    amount: number
}

export interface CreateAppPaymentDto {
    appId: number
    amount: number
}

export interface UpdateOrderDto {
    customerId?: number
    addressId?: number
    loyaltyRuleId?: number
    type?: OrderType
    deliveryFee?: number
    reservedFor?: Date
    notes?: string
    status?: OrderStatus
    guestName?: string
    subtotal?: number
    total?: number
    discountTotal?: number
    orderDetails?: UpdateOrderDetailDto[]
}

export interface UpdateOrderDetailDto {
    id?: number
    productId: number
    quantity: number
    unitPrice: number
    discount: number
    notes?: string
}

// ===== TIPOS PARA FORMULARIOS =====
export interface OrderFormData {
    customerId?: number
    addressId?: number
    loyaltyRuleId?: number
    type: OrderType
    deliveryFee?: number
    reservedFor?: Date
    notes?: string
}

// ===== TIPOS PARA ESTADÍSTICAS =====
export interface OrderStats {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    ordersByType: Record<OrderType, number>
    ordersByStatus: Record<OrderStatus, number>
    revenueByType: Record<OrderType, number>
}

// ===== TIPOS PARA REPORTES =====
export interface OrderReport {
    period: string
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    topProducts: Array<{
        productId: number
        productName: string
        quantity: number
        revenue: number
    }>
    ordersByHour: Array<{
        hour: number
        count: number
        revenue: number
    }>
}

// ===== TIPOS PARA DASHBOARD =====
export interface OrderDashboard {
    todayOrders: number
    todayRevenue: number
    pendingOrders: number
    recentOrders: Order[]
    topCustomers: Array<{
        customerId: number
        customerName: string
        orderCount: number
        totalSpent: number
    }>
    ordersByStatus: Record<OrderStatus, number>
}