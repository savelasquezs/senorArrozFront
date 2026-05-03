import type { PagedResult } from './common'

export interface ExpenseHeader {
    id: number
    branchId: number
    branchName: string
    supplierId: number
    supplierName: string
    supplierPhone?: string
    deliverymanId?: number | null
    deliverymanName?: string | null
    /** Abono tipo descuento por gasto (ExpenseOffset) ligado a este encabezado */
    linkedDeliverymanAdvanceId?: number | null
    linkedDeliverymanAdvanceAmount?: number | null
    total?: number
    vatAmount?: number
    /** Notas generales del comprobante */
    notes?: string | null
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
    /** Notas de la línea */
    notes?: string | null
    createdAt: string
    updatedAt: string
}

/** Fila aplanada (detalle + datos del encabezado) para la grilla de gastos. */
export interface ExpenseDetailGridRow {
    detailId: number
    headerId: number
    createdAt: string
    categoryName: string
    expenseName: string
    supplierName: string
    quantity: number
    amount: number
    total: number
    notes: string
    createdByName: string
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
    deliverymanId?: number | null
    notes?: string | null
    expenseDetails: CreateExpenseDetailDto[]
    expenseBankPayments?: CreateExpenseBankPaymentDto[]
    /** IVA 19 % sobre subtotal de líneas */
    includeVat?: boolean
}

export interface CreateExpenseDetailDto {
    expenseId: number
    quantity: number
    amount: number
    total?: number
    notes?: string | null
}

export interface CreateExpenseBankPaymentDto {
    bankId: number
    amount: number
}

export interface UpdateExpenseHeaderDto {
    supplierId?: number
    notes?: string | null
    expenseDetails?: UpdateExpenseDetailDto[]
    expenseBankPayments?: CreateExpenseBankPaymentDto[]
    includeVat?: boolean
}

export interface UpdateExpenseDetailDto {
    id?: number
    expenseId: number
    quantity: number
    amount: number
    total?: number
    notes?: string | null
}

export interface ExpenseHeaderFilters {
    fromDate?: string
    toDate?: string
    supplierIds?: number[]
    bankNames?: string[]
    categoryNames?: string[]
    expenseName?: string
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

/** 0 = categoría de producto, 1 = producto (alineado al enum del API). */
export type ExpenseMenuTargetType = 0 | 1

export interface ExpenseMenuTargetInput {
    targetType: ExpenseMenuTargetType
    targetId: number
}

export interface ExpenseMenuTarget {
    /** API puede devolver entero o string según serialización del enum. */
    targetType: ExpenseMenuTargetType | string
    targetId: number
    targetName: string
    productMissingWeight: boolean
}

export interface Expense {
    id: number
    name: string
    categoryId: number
    categoryName: string
    unit: ExpenseUnit
    unitDisplay: string
    createdAt: string
    updatedAt: string
    menuTargets?: ExpenseMenuTarget[]
}

export interface CreateExpenseDto {
    name: string
    categoryId: number
    unit: ExpenseUnit
    menuTargets: ExpenseMenuTargetInput[]
}

export interface UpdateExpenseDto {
    name: string
    categoryId: number
    unit: ExpenseUnit
    menuTargets: ExpenseMenuTargetInput[]
}

export interface ExpenseMenuAttributionLine {
    expenseId: number
    expenseName: string
    totalExpenseInPeriodCop: number
    targetType: ExpenseMenuTargetType | string
    targetId: number
    targetName: string
    allocatedCop: number
    totalWeightGramsSold: number
    costPerGramCop: number | null
}

export interface ExpenseMenuAttributionResponse {
    fromUtc: string
    toUtc: string
    branchId: number | null
    lines: ExpenseMenuAttributionLine[]
}

export interface MenuCategoryExpenseBreakdown {
    expenseName: string
    allocatedCop: number
}

export interface MenuProductCostingRow {
    productId: number
    productName: string
    revenueCop: number
    gramsSold: number
    avgPricePerGramCop: number | null
    allocatedCostPerGramCop: number | null
    allocatedCostCop: number
    marginPercent: number | null
}

export interface MenuCategoryCostingBlock {
    categoryId: number
    categoryName: string
    totalAllocatedCostCop: number
    totalWeightGramsSold: number
    blendedCostPerGramCop: number | null
    totalRevenueCop: number
    expenseBreakdown: MenuCategoryExpenseBreakdown[]
    products: MenuProductCostingRow[]
}

export interface MenuCategoryCostingDashboardResponse {
    fromUtc: string
    toUtc: string
    branchId: number | null
    categories: MenuCategoryCostingBlock[]
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

export interface SupplierExpenseSuggestion {
    expenseId: number
    expenseName: string
    expenseUnit: string
    usageCount: number
    lastUsedAt?: string
    lastUnitPrice?: number
}

