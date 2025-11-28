// src/composables/useExpenseFilters.ts
import type { ExpenseHeader } from '@/types/expense'

export interface ExpenseFilterState {
    categoryNames: string[]
    bankNames: string[]
    supplierIds: number[]
    expenseName: string
}

export function useExpenseFilters() {
    const applyAllFilters = (
        expenses: ExpenseHeader[],
        filters: ExpenseFilterState
    ): ExpenseHeader[] => {
        let filtered = [...expenses]

        // Filtrar por categorías (si hay alguna seleccionada)
        if (filters.categoryNames.length > 0) {
            filtered = filtered.filter(expense =>
                filters.categoryNames.some(category =>
                    expense.categoryNames.includes(category)
                )
            )
        }

        // Filtrar por métodos de pago/bancos (si hay alguno seleccionado)
        if (filters.bankNames.length > 0) {
            filtered = filtered.filter(expense =>
                filters.bankNames.some(bank =>
                    expense.bankNames.includes(bank)
                )
            )
        }

        // Filtrar por proveedores (si hay alguno seleccionado)
        if (filters.supplierIds.length > 0) {
            filtered = filtered.filter(expense =>
                filters.supplierIds.includes(expense.supplierId)
            )
        }

        // Filtrar por nombre de gasto (búsqueda de texto)
        if (filters.expenseName.trim()) {
            const searchTerm = filters.expenseName.toLowerCase().trim()
            filtered = filtered.filter(expense =>
                expense.expenseNames.some(name =>
                    name.toLowerCase().includes(searchTerm)
                )
            )
        }

        return filtered
    }

    return {
        applyAllFilters
    }
}

