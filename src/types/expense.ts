import type { PagedResult } from './common'

export interface ExpenseHeader {
    id: number
    branchId: number
    branchName: string
    supplierId: number
    supplierName: string
    supplierPhone?: string
    total?: number
    createdById: number
    createdByName: string
    createdAt: string
    updatedAt: string
    expenseDetails: ExpenseDetail[]
    expenseBankPayments: ExpenseBankPayment[]
    // Campos calculados para filtros locales
    categoryNames: string[]
    bankNames: string[]
    expenseNames: string[]
}

export interface ExpenseDetail {
    id: number
    headerId: number
    expenseId: number
    expenseName: string
    expenseCategoryName: string
    expenseUnit: string
    quantity: number
    amount: number
    total?: number
    createdAt: string
    updatedAt: string
}

export interface ExpenseBankPayment {
    id: number
    expenseHeaderId: number
    bankId: number
    bankName: string
    amount: number
    createdAt: string
}

export interface CreateExpenseHeaderDto {
    supplierId: number
    expenseDetails: CreateExpenseDetailDto[]
    expenseBankPayments?: CreateExpenseBankPaymentDto[]
}

export interface CreateExpenseDetailDto {
    expenseId: number
    quantity: number
    amount: number
}

export interface CreateExpenseBankPaymentDto {
    bankId: number
    amount: number
}

export interface UpdateExpenseHeaderDto {
    supplierId?: number
    expenseDetails?: UpdateExpenseDetailDto[]
    expenseBankPayments?: CreateExpenseBankPaymentDto[]
}

export interface UpdateExpenseDetailDto {
    id?: number
    expenseId: number
    quantity: number
    amount: number
}

export interface ExpenseHeaderFilters {
    fromDate?: string
    toDate?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export type ExpenseHeaderListResult = PagedResult<ExpenseHeader>

// Expense Category types
export interface ExpenseCategory {
    id: number
    name: string
    createdAt: string
    updatedAt: string
    totalExpenses: number
}

export interface CreateExpenseCategoryDto {
    name: string
}

export interface UpdateExpenseCategoryDto {
    name: string
}

export interface ExpenseCategoryFilters {
    name?: string
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export type ExpenseCategoryListResult = PagedResult<ExpenseCategory>

// Expense types
export type ExpenseUnit = 'Unit' | 'Kilo' | 'Package' | 'Pound' | 'Gallon'

export interface Expense {
    id: number
    name: string
    categoryId: number
    categoryName: string
    unit: ExpenseUnit
    unitDisplay: string
    createdAt: string
    updatedAt: string
}

export interface CreateExpenseDto {
    name: string
    categoryId: number
    unit: ExpenseUnit
}

export interface UpdateExpenseDto {
    name: string
    categoryId: number
    unit: ExpenseUnit
}

export interface ExpenseFilters {
    categoryId?: number
    name?: string
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export type ExpenseListResult = PagedResult<Expense>

