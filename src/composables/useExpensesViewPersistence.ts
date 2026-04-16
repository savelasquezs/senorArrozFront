import type { ColumnState } from 'ag-grid-community'
import type { DashboardPeriodPresetId } from '@/utils/dashboardPeriodPresets'

export const EXPENSES_VIEW_STORAGE_KEY = 'expenses-view-v1'

export interface ExpensesViewPersistedPayload {
    presetId: DashboardPeriodPresetId
    /** YYYY-MM-DD cuando preset es custom (ambos extremos) */
    customFromYmd: string | null
    customToYmd: string | null
    /** Vacío si el usuario eligió “sin filtro de fecha” explícito */
    fromDate: string
    toDate: string
    pageSize: number
    sortBy: 'id' | 'total' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    columnState: ColumnState[] | null
}

const defaultPayload: ExpensesViewPersistedPayload = {
    presetId: 'this_month',
    customFromYmd: null,
    customToYmd: null,
    fromDate: '',
    toDate: '',
    pageSize: 50,
    sortBy: 'id',
    sortOrder: 'desc',
    columnState: null,
}

function safeParse(raw: string | null): ExpensesViewPersistedPayload | null {
    if (!raw) return null
    try {
        const o = JSON.parse(raw) as Partial<ExpensesViewPersistedPayload>
        if (typeof o.pageSize !== 'number') return null
        return {
            ...defaultPayload,
            ...o,
            columnState: Array.isArray(o.columnState) ? o.columnState : null,
        }
    } catch {
        return null
    }
}

export function loadExpensesViewState(): ExpensesViewPersistedPayload {
    if (typeof localStorage === 'undefined') return { ...defaultPayload }
    const parsed = safeParse(localStorage.getItem(EXPENSES_VIEW_STORAGE_KEY))
    return parsed ?? { ...defaultPayload }
}

export function saveExpensesViewState(payload: ExpensesViewPersistedPayload): void {
    if (typeof localStorage === 'undefined') return
    try {
        localStorage.setItem(EXPENSES_VIEW_STORAGE_KEY, JSON.stringify(payload))
    } catch {
        /* ignore quota */
    }
}
