// src/types/bank.ts

// ===== BANKS =====
export interface Bank {
    id: number
    branchId: number
    branchName: string
    name: string
    imageUrl?: string
    active: boolean
    createdAt: string
    updatedAt: string
    totalApps: number
    activeApps: number
    currentBalance: number
}

export interface BankDetail extends Bank {
    totalBankPayments: number
    totalExpenseBankPayments: number
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
    bankId?: number
    branchId?: number
    verified?: boolean
    fromDate?: string
    toDate?: string
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
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
    appId?: number
    bankId?: number
    branchId?: number
    settled?: boolean
    fromDate?: string
    toDate?: string
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface CreateAppPaymentDto {
    orderId: number
    appId: number
    amount: number
}

export interface SettleMultipleAppPaymentsDto {
    paymentIds: number[]
}
