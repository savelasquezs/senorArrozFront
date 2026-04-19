import { describe, expect, it } from 'vitest'
import { applyAllFilters, sliceHeaderToMatchingDetails } from '@/composables/useExpenseFilters'
import type { ExpenseHeader } from '@/types/expense'

function headerWithDetails(
    id: number,
    details: Array<{ name: string; category: string; q?: number; a?: number }>,
): ExpenseHeader {
    const expenseDetails = details.map((d, i) => ({
        id: id * 100 + i,
        headerId: id,
        expenseId: i,
        expenseName: d.name,
        expenseCategoryName: d.category,
        expenseUnit: 'u',
        quantity: d.q ?? 1,
        amount: d.a ?? 1,
        total: (d.q ?? 1) * (d.a ?? 1),
        notes: null,
        createdAt: '',
        updatedAt: '',
    }))
    return {
        id,
        branchId: 1,
        branchName: 'B',
        supplierId: 1,
        supplierName: 'Prov',
        createdById: 1,
        createdByName: 'U',
        createdAt: '',
        updatedAt: '',
        expenseDetails,
        expenseBankPayments: [],
        categoryNames: Array.from(new Set(details.map(d => d.category))),
        bankNames: [],
        expenseNames: details.map(d => d.name),
    }
}

describe('useExpenseFilters — detalle', () => {
    it('búsqueda por nombre solo deja líneas que coinciden', () => {
        const h = headerWithDetails(76, [
            { name: 'Salsa humo Garrafa', category: 'CatA' },
            { name: 'Papas', category: 'CatA' },
        ])
        const out = sliceHeaderToMatchingDetails(h, {
            categoryNames: [],
            bankNames: [],
            supplierIds: [],
            expenseName: 'humo',
        })
        expect(out).not.toBeNull()
        expect(out!.expenseDetails).toHaveLength(1)
        expect(out!.expenseDetails[0].expenseName).toBe('Salsa humo Garrafa')
    })

    it('categoría filtra por línea, no por cabecera agregada sola', () => {
        const h = headerWithDetails(1, [
            { name: 'A', category: 'Insumos' },
            { name: 'B', category: 'Otros' },
        ])
        const out = sliceHeaderToMatchingDetails(h, {
            categoryNames: ['Insumos'],
            bankNames: [],
            supplierIds: [],
            expenseName: '',
        })
        expect(out!.expenseDetails).toHaveLength(1)
        expect(out!.expenseDetails[0].expenseName).toBe('A')
    })

    it('applyAllFilters elimina factura si ninguna línea cumple texto', () => {
        const h = headerWithDetails(52, [{ name: 'Otro', category: 'C' }])
        const list = applyAllFilters([h], {
            categoryNames: [],
            bankNames: [],
            supplierIds: [],
            expenseName: 'humo',
        })
        expect(list).toHaveLength(0)
    })
})
