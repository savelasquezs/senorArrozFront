import type { DashboardPeriodPresetId } from '@/utils/dashboardPeriodPresets'

export const EXPENSES_VIEW_STORAGE_KEY = 'expenses-view-v2'
const LEGACY_EXPENSES_VIEW_STORAGE_KEY = 'expenses-view-v1'

export type ExpenseTableColumnKey =
    | 'headerId' | 'createdAt' | 'categoryName' | 'expenseName' | 'supplierName'
    | 'quantity' | 'amount' | 'total' | 'notes' | 'createdByName' | 'actions'
export type ExpenseTableSortableColumnKey = Exclude<ExpenseTableColumnKey, 'actions'>
export type ExpenseTableSortDirection = 'asc' | 'desc' | null

export interface ExpenseTableColumnState {
    key: ExpenseTableColumnKey
    width: number
    visible: boolean
    order: number
}

export interface ExpenseTableState {
    columns: ExpenseTableColumnState[]
    sortColumn: ExpenseTableSortableColumnKey | null
    sortDirection: ExpenseTableSortDirection
}

export interface ExpensesViewPersistedPayload {
    presetId: DashboardPeriodPresetId
    customFromYmd: string | null
    customToYmd: string | null
    fromDate: string
    toDate: string
    pageSize: number
    sortBy: 'id' | 'total' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    tableState: ExpenseTableState
}

const columnDefaults: Array<Pick<ExpenseTableColumnState, 'key' | 'width' | 'visible'>> = [
    { key: 'headerId', width: 110, visible: true },
    { key: 'createdAt', width: 155, visible: true },
    { key: 'categoryName', width: 150, visible: true },
    { key: 'expenseName', width: 180, visible: true },
    { key: 'supplierName', width: 180, visible: true },
    { key: 'quantity', width: 100, visible: true },
    { key: 'amount', width: 135, visible: true },
    { key: 'total', width: 135, visible: true },
    { key: 'notes', width: 200, visible: true },
    { key: 'createdByName', width: 150, visible: true },
    { key: 'actions', width: 180, visible: true },
]

const knownColumnKeys = new Set<ExpenseTableColumnKey>(columnDefaults.map(column => column.key))

export function defaultExpenseTableState(): ExpenseTableState {
    return {
        columns: columnDefaults.map((column, order) => ({ ...column, order })),
        sortColumn: null,
        sortDirection: null,
    }
}

const defaultPayload: ExpensesViewPersistedPayload = {
    presetId: 'today',
    customFromYmd: null,
    customToYmd: null,
    fromDate: '',
    toDate: '',
    pageSize: 50,
    sortBy: 'id',
    sortOrder: 'desc',
    tableState: defaultExpenseTableState(),
}

function isColumnKey(value: unknown): value is ExpenseTableColumnKey {
    return typeof value === 'string' && knownColumnKeys.has(value as ExpenseTableColumnKey)
}

function normalizeWidth(value: unknown, fallback: number): number {
    const width = Number(value)
    return Number.isFinite(width) ? Math.min(500, Math.max(80, Math.round(width))) : fallback
}

export function normalizeExpenseTableState(value: unknown): ExpenseTableState {
    const fallback = defaultExpenseTableState()
    if (!value || typeof value !== 'object') return fallback

    const raw = value as Partial<ExpenseTableState>
    const storedColumns: unknown[] = Array.isArray(raw.columns) ? raw.columns : []
    const byKey = new Map<ExpenseTableColumnKey, Partial<ExpenseTableColumnState>>()
    for (const candidate of storedColumns) {
        if (!candidate || typeof candidate !== 'object') continue
        const column = candidate as Partial<ExpenseTableColumnState>
        if (isColumnKey(column.key)) byKey.set(column.key, column)
    }

    const columns = fallback.columns.map(column => {
        const stored = byKey.get(column.key)
        return {
            key: column.key,
            width: column.key === 'actions' ? 180 : normalizeWidth(stored?.width, column.width),
            visible: column.key === 'actions' ? true : stored?.visible !== false,
            order: Number.isInteger(stored?.order) ? Number(stored?.order) : column.order,
        }
    })
    columns.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
    const actions = columns.find(column => column.key === 'actions')!
    columns.splice(columns.indexOf(actions), 1)
    columns.push({ ...actions, visible: true })
    columns.forEach((column, order) => { column.order = order })

    const candidateSortColumn: unknown = raw.sortColumn
    const sortColumn = isColumnKey(candidateSortColumn) && candidateSortColumn !== 'actions'
        ? candidateSortColumn
        : null
    const sortDirection = raw.sortDirection === 'asc' || raw.sortDirection === 'desc'
        ? raw.sortDirection
        : null

    return {
        columns,
        sortColumn: sortDirection ? sortColumn : null,
        sortDirection: sortColumn ? sortDirection : null,
    }
}

function isPresetId(value: unknown): value is DashboardPeriodPresetId {
    return value === 'today' || value === 'yesterday' || value === 'this_fortnight' ||
        value === 'last_fortnight' || value === 'this_month' || value === 'last_month' ||
        value === 'this_year' || value === 'custom'
}

function migrateLegacyTableState(value: unknown): ExpenseTableState {
    if (!Array.isArray(value)) return defaultExpenseTableState()
    const legacy = value.filter((column): column is Record<string, unknown> =>
        Boolean(column && typeof column === 'object' && isColumnKey((column as Record<string, unknown>).colId)),
    )
    const state = defaultExpenseTableState()
    state.columns = state.columns.map((column, order) => {
        const old = legacy.find(item => item.colId === column.key)
        return {
            ...column,
            width: column.key === 'actions' ? 180 : normalizeWidth(old?.width, column.width),
            visible: column.key === 'actions' ? true : old?.hide !== true,
            order: old ? legacy.indexOf(old) : legacy.length + order,
        }
    })
    const sorted = legacy.find(column =>
        (column.sort === 'asc' || column.sort === 'desc') && column.colId !== 'actions',
    )
    if (sorted?.colId && sorted.sort) {
        state.sortColumn = sorted.colId as ExpenseTableSortableColumnKey
        state.sortDirection = sorted.sort as Exclude<ExpenseTableSortDirection, null>
    }
    return normalizeExpenseTableState(state)
}

function normalizePayload(value: unknown, legacy = false): ExpensesViewPersistedPayload | null {
    if (!value || typeof value !== 'object') return null
    const raw = value as Partial<ExpensesViewPersistedPayload> & { columnState?: unknown }
    if (typeof raw.pageSize !== 'number') return null

    return {
        ...defaultPayload,
        presetId: isPresetId(raw.presetId) ? raw.presetId : defaultPayload.presetId,
        customFromYmd: typeof raw.customFromYmd === 'string' ? raw.customFromYmd : null,
        customToYmd: typeof raw.customToYmd === 'string' ? raw.customToYmd : null,
        fromDate: typeof raw.fromDate === 'string' ? raw.fromDate : '',
        toDate: typeof raw.toDate === 'string' ? raw.toDate : '',
        pageSize: Number.isFinite(raw.pageSize) && raw.pageSize > 0 ? raw.pageSize : defaultPayload.pageSize,
        sortBy: raw.sortBy === 'total' || raw.sortBy === 'createdAt' ? raw.sortBy : 'id',
        sortOrder: raw.sortOrder === 'asc' ? 'asc' : 'desc',
        tableState: normalizeExpenseTableState(legacy ? migrateLegacyTableState(raw.columnState) : raw.tableState),
    }
}

function readPayload(key: string, legacy = false): ExpensesViewPersistedPayload | null {
    try {
        return normalizePayload(JSON.parse(localStorage.getItem(key) ?? 'null'), legacy)
    } catch {
        return null
    }
}

export function loadExpensesViewState(): ExpensesViewPersistedPayload {
    if (typeof localStorage === 'undefined') return { ...defaultPayload, tableState: defaultExpenseTableState() }
    return readPayload(EXPENSES_VIEW_STORAGE_KEY) ??
        readPayload(LEGACY_EXPENSES_VIEW_STORAGE_KEY, true) ??
        { ...defaultPayload, tableState: defaultExpenseTableState() }
}

export function saveExpensesViewState(payload: ExpensesViewPersistedPayload): void {
    if (typeof localStorage === 'undefined') return
    try {
        localStorage.setItem(EXPENSES_VIEW_STORAGE_KEY, JSON.stringify({
            ...payload,
            tableState: normalizeExpenseTableState(payload.tableState),
        }))
        localStorage.removeItem(LEGACY_EXPENSES_VIEW_STORAGE_KEY)
    } catch {
        return
    }
}
