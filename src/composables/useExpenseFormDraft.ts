export const EXPENSE_FORM_DRAFT_VERSION = 1
export const EXPENSE_FORM_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface ExpenseFormDraftScope {
    userId: number
    branchId: number
}

export interface ExpenseFormDraftDetail {
    expenseId: number
    quantity: number
    amount: number
    total: number
    includeVat: boolean
    notes: string
    expenseName: string
    expenseUnit?: string
}

export interface ExpenseFormDraftPayment {
    bankId: number
    amount: number
    syncAmount: boolean
}

export interface ExpenseFormDraftData {
    supplierId: number | null
    notes: string
    expenseDetails: ExpenseFormDraftDetail[]
    expenseBankPayments: ExpenseFormDraftPayment[]
    isDeliverymanAdvance: boolean
    selectedDeliverymanId: number | null
}

interface StoredExpenseFormDraft {
    version: number
    userId: number
    branchId: number
    savedAt: number
    data: ExpenseFormDraftData
}

function storageKey(scope: ExpenseFormDraftScope): string {
    return `senor-arroz:expense-form-draft:v${EXPENSE_FORM_DRAFT_VERSION}:${scope.userId}:${scope.branchId}`
}

function isPositiveInteger(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) > 0
}

function nonNegativeNumber(value: unknown): number | null {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null
}

function optionalPositiveInteger(value: unknown): number | null {
    return isPositiveInteger(value) ? Number(value) : null
}

function sanitizeText(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.slice(0, maxLength) : ''
}

function sanitizeDetail(value: unknown): ExpenseFormDraftDetail | null {
    if (!value || typeof value !== 'object') return null
    const detail = value as Partial<ExpenseFormDraftDetail>
    const expenseId = nonNegativeNumber(detail.expenseId)
    const quantity = nonNegativeNumber(detail.quantity)
    const amount = nonNegativeNumber(detail.amount)
    const total = nonNegativeNumber(detail.total)

    if (
        expenseId === null ||
        !Number.isInteger(expenseId) ||
        quantity === null ||
        amount === null ||
        total === null
    ) {
        return null
    }

    return {
        expenseId,
        quantity,
        amount,
        total,
        includeVat: Boolean(detail.includeVat),
        notes: sanitizeText(detail.notes, 1000),
        expenseName: sanitizeText(detail.expenseName, 500),
        ...(typeof detail.expenseUnit === 'string'
            ? { expenseUnit: sanitizeText(detail.expenseUnit, 100) }
            : {}),
    }
}

function sanitizePayment(value: unknown): ExpenseFormDraftPayment | null {
    if (!value || typeof value !== 'object') return null
    const payment = value as Partial<ExpenseFormDraftPayment>
    const bankId = nonNegativeNumber(payment.bankId)
    const amount = nonNegativeNumber(payment.amount)

    if (bankId === null || !Number.isInteger(bankId) || amount === null) return null

    return {
        bankId,
        amount,
        syncAmount: Boolean(payment.syncAmount),
    }
}

function sanitizeData(value: unknown): ExpenseFormDraftData | null {
    if (!value || typeof value !== 'object') return null
    const data = value as Partial<ExpenseFormDraftData>
    if (!Array.isArray(data.expenseDetails) || !Array.isArray(data.expenseBankPayments)) return null

    const details = data.expenseDetails.map(sanitizeDetail)
    const payments = data.expenseBankPayments.map(sanitizePayment)
    if (details.some((detail) => detail === null) || payments.some((payment) => payment === null)) return null

    return {
        supplierId: optionalPositiveInteger(data.supplierId),
        notes: sanitizeText(data.notes, 2000),
        expenseDetails: details as ExpenseFormDraftDetail[],
        expenseBankPayments: payments as ExpenseFormDraftPayment[],
        isDeliverymanAdvance: Boolean(data.isDeliverymanAdvance),
        selectedDeliverymanId: optionalPositiveInteger(data.selectedDeliverymanId),
    }
}

function getStorage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage
}

export function hasExpenseFormDraftContent(
    data: ExpenseFormDraftData,
    defaultSupplierId: number,
): boolean {
    return data.supplierId !== defaultSupplierId ||
        data.notes.trim().length > 0 ||
        data.expenseDetails.length > 0 ||
        data.expenseBankPayments.length > 0 ||
        data.isDeliverymanAdvance ||
        data.selectedDeliverymanId !== null
}

export function loadExpenseFormDraft(
    scope: ExpenseFormDraftScope,
    now = Date.now(),
): ExpenseFormDraftData | null {
    const storage = getStorage()
    if (!storage) return null

    const key = storageKey(scope)
    try {
        const raw = storage.getItem(key)
        if (!raw) return null

        const stored = JSON.parse(raw) as Partial<StoredExpenseFormDraft>
        const data = sanitizeData(stored.data)
        const isValid =
            stored.version === EXPENSE_FORM_DRAFT_VERSION &&
            stored.userId === scope.userId &&
            stored.branchId === scope.branchId &&
            typeof stored.savedAt === 'number' &&
            Number.isFinite(stored.savedAt) &&
            now - stored.savedAt >= 0 &&
            now - stored.savedAt <= EXPENSE_FORM_DRAFT_TTL_MS &&
            data !== null

        if (!isValid) {
            storage.removeItem(key)
            return null
        }

        return data
    } catch {
        try {
            storage.removeItem(key)
        } catch {
            return null
        }
        return null
    }
}

export function saveExpenseFormDraft(
    scope: ExpenseFormDraftScope,
    data: ExpenseFormDraftData,
    now = Date.now(),
): void {
    const storage = getStorage()
    if (!storage) return

    try {
        const payload: StoredExpenseFormDraft = {
            version: EXPENSE_FORM_DRAFT_VERSION,
            userId: scope.userId,
            branchId: scope.branchId,
            savedAt: now,
            data,
        }
        storage.setItem(storageKey(scope), JSON.stringify(payload))
    } catch {
        return
    }
}

export function clearExpenseFormDraft(scope: ExpenseFormDraftScope): void {
    const storage = getStorage()
    if (!storage) return

    try {
        storage.removeItem(storageKey(scope))
    } catch {
        return
    }
}

export function expenseFormDraftStorageKey(scope: ExpenseFormDraftScope): string {
    return storageKey(scope)
}
