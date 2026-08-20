import {
    EXPENSE_FORM_DRAFT_TTL_MS,
    clearExpenseFormDraft,
    expenseFormDraftStorageKey,
    hasExpenseFormDraftContent,
    loadExpenseFormDraft,
    saveExpenseFormDraft,
    type ExpenseFormDraftData,
} from '@/composables/useExpenseFormDraft'

const scope = { userId: 7, branchId: 3 }
const now = new Date('2026-08-20T12:00:00.000Z').getTime()

function draft(overrides: Partial<ExpenseFormDraftData> = {}): ExpenseFormDraftData {
    return {
        supplierId: 1,
        notes: 'Factura 345',
        expenseDetails: [{
            expenseId: 4,
            quantity: 2,
            amount: 2500,
            total: 5000,
            includeVat: true,
            notes: 'Con descuento',
            expenseName: 'Arroz',
            expenseUnit: 'kg',
        }],
        expenseBankPayments: [{ bankId: 8, amount: 5950, syncAmount: true }],
        isDeliverymanAdvance: true,
        selectedDeliverymanId: 11,
        ...overrides,
    }
}

describe('useExpenseFormDraft', () => {
    it('guarda y restaura todos los campos del borrador', () => {
        const data = draft()

        saveExpenseFormDraft(scope, data, now)

        expect(loadExpenseFormDraft(scope, now)).toEqual(data)
    })

    it('aísla los borradores por usuario y sucursal', () => {
        saveExpenseFormDraft(scope, draft(), now)

        expect(loadExpenseFormDraft({ userId: 8, branchId: 3 }, now)).toBeNull()
        expect(loadExpenseFormDraft({ userId: 7, branchId: 4 }, now)).toBeNull()
        expect(loadExpenseFormDraft(scope, now)).not.toBeNull()
    })

    it('elimina borradores vencidos, corruptos o incompatibles', () => {
        saveExpenseFormDraft(scope, draft(), now - EXPENSE_FORM_DRAFT_TTL_MS - 1)
        expect(loadExpenseFormDraft(scope, now)).toBeNull()

        localStorage.setItem(expenseFormDraftStorageKey(scope), '{invalid')
        expect(loadExpenseFormDraft(scope, now)).toBeNull()

        localStorage.setItem(expenseFormDraftStorageKey(scope), JSON.stringify({
            version: 99,
            userId: scope.userId,
            branchId: scope.branchId,
            savedAt: now,
            data: draft(),
        }))
        expect(loadExpenseFormDraft(scope, now)).toBeNull()
    })

    it('identifica contenido frente al formulario inicial y permite eliminarlo', () => {
        const empty = draft({
            notes: '',
            expenseDetails: [],
            expenseBankPayments: [],
            isDeliverymanAdvance: false,
            selectedDeliverymanId: null,
        })

        expect(hasExpenseFormDraftContent(empty, 1)).toBe(false)
        expect(hasExpenseFormDraftContent({ ...empty, supplierId: 2 }, 1)).toBe(true)

        saveExpenseFormDraft(scope, draft(), now)
        clearExpenseFormDraft(scope)
        expect(loadExpenseFormDraft(scope, now)).toBeNull()
    })
})
