import type { ExpenseDetailGridRow, ExpenseHeader } from '@/types/expense'

function lineTotal(quantity: number, amount: number, total: number | undefined): number {
    const hasLineTotal = total != null && !Number.isNaN(Number(total))
    if (hasLineTotal) return Number(total)
    return Number(amount) * Number(quantity)
}

/**
 * Una fila de grilla por cada línea de gasto, replicando datos del encabezado en cada fila.
 */
export function flattenExpenseHeadersToGridRows(headers: ExpenseHeader[]): ExpenseDetailGridRow[] {
    const rows: ExpenseDetailGridRow[] = []
    for (const h of headers) {
        for (const d of h.expenseDetails) {
            rows.push({
                detailId: d.id,
                headerId: h.id,
                createdAt: h.createdAt,
                categoryName: d.expenseCategoryName ?? '',
                expenseName: d.expenseName ?? '',
                supplierName: h.supplierName ?? '',
                quantity: d.quantity,
                amount: d.amount,
                total: lineTotal(d.quantity, d.amount, d.total),
                notes: d.notes?.trim() ? String(d.notes) : '',
                createdByName: h.createdByName ?? '',
            })
        }
    }
    return rows
}
