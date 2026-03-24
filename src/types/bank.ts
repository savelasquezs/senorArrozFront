// src/types/bank.ts

// ===== BANKS =====
export interface Bank {
    id: number
    branchId: number
    branchName: string
    name: string
    imageUrl?: string
    active: boolean
    /** Tipo de banco (enum en snake_case desde la API). */
    type?: string
    isHidden?: boolean
    createdAt: string
    updatedAt: string
    totalApps: number
    activeApps: number
    currentBalance: number
}

/** Desglose del saldo acumulado (misma fórmula que el backend). */
export interface BankBalanceBreakdown {
    bankPaymentsIn: number
    expenseBankPaymentsOut: number
    outgoingTransfers: number
    incomingTransfers: number
    deliverymanBankTransferIn: number
    netBalance: number
}

export interface BankDetail extends Bank {
    totalBankPayments: number
    totalExpenseBankPayments: number
    balanceBreakdown: BankBalanceBreakdown
}

/** Línea de pago de gasto imputada al banco (movimientos por período). */
export interface ExpenseBankPaymentLine {
    id: number
    amount: number
    createdAt: string
    expenseHeaderId: number
    branchId: number
    supplierName: string
}

/** Abono domiciliario por transferencia al banco (movimientos por período). */
export interface DeliverymanBankAdvanceLine {
    id: number
    amount: number
    createdAt: string
    deliverymanId: number
    deliverymanName: string
    branchId: number
    notes?: string
}

export interface BankFilters {
    name?: string
    branchId?: number
    active?: boolean
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface CreateBankDto {
    branchId?: number // Solo superadmin especifica
    name: string
    imageUrl?: string
    active?: boolean
}

export interface UpdateBankDto {
    name?: string
    imageUrl?: string
    active?: boolean
}

export interface BankFormData {
    name: string
    imageUrl?: string
    active: boolean
    branchId?: number // Optional for superadmin creating new banks
}

// ===== APPS =====
export interface App {
    id: number
    bankId: number
    bankName: string
    branchId: number
    branchName: string
    name: string
    imageUrl?: string
    active: boolean
    createdAt: string
    updatedAt: string
    totalPayments: number
    unsettledPayments: number
    totalPaymentsCount: number
    unsettledPaymentsCount: number
}

export interface AppFilters {
    bankId?: number
    name?: string
    branchId?: number
    active?: boolean
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface CreateAppDto {
    bankId: number
    name: string
    imageUrl?: string
    active?: boolean
}

export interface UpdateAppDto {
    bankId?: number
    name?: string
    imageUrl?: string
    active?: boolean
}

export interface AppFormData {
    bankId: number
    name: string
    imageUrl?: string
    active: boolean
}

// ===== BANK PAYMENTS =====
export interface BankPayment {
    id: number
    orderId: number
    bankId: number
    bankName: string
    branchId: number
    branchName: string
    amount: number
    verifiedAt?: string
    isVerified: boolean
    createdAt: string
    updatedAt: string
}

export interface BankPaymentFilters {
    orderId?: number
    bankId?: number | null
    branchId?: number
    verified?: boolean
    fromDate?: string
    toDate?: string
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

/** Filtros en pantalla (null para v-model con BaseInput, sin `undefined` en el tipo). */
export interface BankPaymentListUiFilters {
    orderId: number | null
    bankId: number | null
    verified?: boolean
    fromDate: string | null
    toDate: string | null
    page: number
    pageSize: number
}

export interface CreateBankPaymentDto {
    orderId: number
    bankId: number
    amount: number
}

export interface VerifyBankPaymentDto {
    verifiedAt?: string
}

// ===== APP PAYMENTS =====
export interface AppPayment {
    id: number
    orderId: number
    appId: number
    appName: string
    bankId: number
    bankName: string
    branchId: number
    branchName: string
    amount: number
    isSetted: boolean
    createdAt: string
    updatedAt: string
}

export interface AppPaymentFilters {
    orderId?: number
    appId?: number | null
    bankId?: number | null
    branchId?: number
    settled?: boolean
    fromDate?: string
    toDate?: string
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

/** Filtros en pantalla (null para v-model con BaseInput). */
export interface AppPaymentListUiFilters {
    orderId: number | null
    appId: number | null
    bankId: number | null
    settled?: boolean
    fromDate: string | null
    toDate: string | null
    page: number
    pageSize: number
}

export interface CreateAppPaymentDto {
    orderId: number
    appId: number
    amount: number
}

export interface SettleMultipleAppPaymentsDto {
    paymentIds: number[]
}
