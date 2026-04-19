// src/composables/useExpenseFilters.ts
import type { ExpenseDetail, ExpenseHeader } from '@/types/expense'

export interface ExpenseFilterState {
    categoryNames: string[]
    bankNames: string[]
    supplierIds: number[]
    expenseName: string
}

function lineNumericTotal(d: ExpenseDetail): number {
    const hasLineTotal = d.total != null && !Number.isNaN(Number(d.total))
    if (hasLineTotal) return Number(d.total)
    return Number(d.amount) * Number(d.quantity)
}

/**
 * Recorta `expenseDetails` según categoría y texto; devuelve null si no queda ninguna línea.
 * Proveedor y banco ya deben haberse filtrado a nivel encabezado antes de llamar esto.
 */
export function sliceHeaderToMatchingDetails(
    header: ExpenseHeader,
    filters: ExpenseFilterState,
): ExpenseHeader | null {
    let details = [...header.expenseDetails]

    if (filters.categoryNames.length > 0) {
        const set = new Set(filters.categoryNames)
        details = details.filter(d => d.expenseCategoryName && set.has(d.expenseCategoryName))
    }

    if (filters.expenseName.trim()) {
        const term = filters.expenseName.toLowerCase().trim()
        details = details.filter(d => (d.expenseName ?? '').toLowerCase().includes(term))
    }

    if (details.length === 0) return null

    const categoryNames = Array.from(
        new Set(details.map(d => d.expenseCategoryName).filter((n): n is string => Boolean(n))),
    )
    const expenseNames = Array.from(
        new Set(details.map(d => d.expenseName).filter((n): n is string => Boolean(n))),
    )
    const total = details.reduce((sum, d) => sum + lineNumericTotal(d), 0)

    return {
        ...header,
        expenseDetails: details,
        categoryNames,
        expenseNames,
        total,
    }
}

/**
 * Filtros locales: proveedor y banco a nivel factura; categoría y nombre de gasto a nivel línea
 * (solo se muestran las líneas que cumplen).
 */
export function applyAllFilters(expenses: ExpenseHeader[], filters: ExpenseFilterState): ExpenseHeader[] {
    let headers = [...expenses]

    if (filters.supplierIds.length > 0) {
        headers = headers.filter(h => filters.supplierIds.includes(h.supplierId))
    }

    if (filters.bankNames.length > 0) {
        headers = headers.filter(h => filters.bankNames.some(bank => h.bankNames.includes(bank)))
    }

    return headers
        .map(h => sliceHeaderToMatchingDetails(h, filters))
        .filter((h): h is ExpenseHeader => h != null)
}

export function useExpenseFilters() {
    return {
        applyAllFilters,
        sliceHeaderToMatchingDetails,
    }
}
