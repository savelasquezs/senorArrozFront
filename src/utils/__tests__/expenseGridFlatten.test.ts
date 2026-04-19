import { describe, expect, it } from 'vitest'
import { flattenExpenseHeadersToGridRows } from '@/utils/expenseGridFlatten'
import type { ExpenseHeader } from '@/types/expense'

function minimalHeader(overrides: Partial<ExpenseHeader> = {}): ExpenseHeader {
    return {
        id: 1,
        branchId: 1,
        branchName: 'Sede',
        supplierId: 10,
        supplierName: 'Proveedor SA',
        createdById: 1,
        createdByName: 'Admin',
        createdAt: '2024-06-15T12:00:00.000Z',
        updatedAt: '2024-06-15T12:00:00.000Z',
        expenseDetails: [],
        expenseBankPayments: [],
        categoryNames: [],
        bankNames: [],
        expenseNames: [],
        ...overrides,
    }
}

describe('flattenExpenseHeadersToGridRows', () => {
    it('aplanar vacío devuelve []', () => {
        expect(flattenExpenseHeadersToGridRows([])).toEqual([])
    })

    it('una línea con total explícito', () => {
        const h = minimalHeader({
            expenseDetails: [
                {
                    id: 100,
                    headerId: 1,
                    expenseId: 5,
                    expenseName: 'Arroz',
                    expenseCategoryName: 'Insumos',
                    expenseUnit: 'kg',
                    quantity: 2,
                    amount: 3000,
                    total: 7000,
                    notes: 'nota',
                    createdAt: '',
                    updatedAt: '',
                },
            ],
        })
        const rows = flattenExpenseHeadersToGridRows([h])
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            detailId: 100,
            headerId: 1,
            categoryName: 'Insumos',
            expenseName: 'Arroz',
            supplierName: 'Proveedor SA',
            quantity: 2,
            amount: 3000,
            total: 7000,
            notes: 'nota',
            createdByName: 'Admin',
        })
    })

    it('sin total usa cantidad × valor unitario', () => {
        const h = minimalHeader({
            expenseDetails: [
                {
                    id: 101,
                    headerId: 1,
                    expenseId: 5,
                    expenseName: 'Aceite',
                    expenseCategoryName: 'Insumos',
                    expenseUnit: 'L',
                    quantity: 3,
                    amount: 1000,
                    total: undefined,
                    notes: null,
                    createdAt: '',
                    updatedAt: '',
                },
            ],
        })
        const rows = flattenExpenseHeadersToGridRows([h])
        expect(rows[0].total).toBe(3000)
        expect(rows[0].notes).toBe('')
    })

    it('varias facturas y varias líneas conservan orden', () => {
        const a = minimalHeader({
            id: 1,
            expenseDetails: [
                {
                    id: 1,
                    headerId: 1,
                    expenseId: 1,
                    expenseName: 'A1',
                    expenseCategoryName: 'C1',
                    expenseUnit: 'u',
                    quantity: 1,
                    amount: 1,
                    total: 1,
                    notes: null,
                    createdAt: '',
                    updatedAt: '',
                },
                {
                    id: 2,
                    headerId: 1,
                    expenseId: 2,
                    expenseName: 'A2',
                    expenseCategoryName: 'C2',
                    expenseUnit: 'u',
                    quantity: 1,
                    amount: 2,
                    total: 2,
                    notes: null,
                    createdAt: '',
                    updatedAt: '',
                },
            ],
        })
        const b = minimalHeader({
            id: 2,
            supplierName: 'Otro',
            expenseDetails: [
                {
                    id: 3,
                    headerId: 2,
                    expenseId: 3,
                    expenseName: 'B1',
                    expenseCategoryName: 'C3',
                    expenseUnit: 'u',
                    quantity: 1,
                    amount: 5,
                    total: 5,
                    notes: null,
                    createdAt: '',
                    updatedAt: '',
                },
            ],
        })
        const rows = flattenExpenseHeadersToGridRows([a, b])
        expect(rows.map(r => r.detailId)).toEqual([1, 2, 3])
        expect(rows[2].supplierName).toBe('Otro')
    })
})
