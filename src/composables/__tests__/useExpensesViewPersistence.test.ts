import {
    EXPENSES_VIEW_STORAGE_KEY,
    defaultExpenseTableState,
    loadExpensesViewState,
    saveExpensesViewState,
} from '@/composables/useExpensesViewPersistence'

describe('useExpensesViewPersistence', () => {
    it('inicia en hoy cuando no existe una preferencia', () => {
        const state = loadExpensesViewState()

        expect(state.presetId).toBe('today')
        expect(state.tableState.columns.at(-1)?.key).toBe('actions')
        expect(state.tableState.columns.at(-1)?.visible).toBe(true)
    })

    it('migra el estado anterior de AG Grid', () => {
        localStorage.setItem('expenses-view-v1', JSON.stringify({
            presetId: 'this_month',
            customFromYmd: null,
            customToYmd: null,
            fromDate: '2026-08-01',
            toDate: '2026-08-31',
            pageSize: 25,
            sortBy: 'createdAt',
            sortOrder: 'asc',
            columnState: [
                { colId: 'total', width: 210, hide: false, sort: 'desc' },
                { colId: 'supplierName', width: 160, hide: true },
                { colId: 'actions', width: 300, hide: true },
            ],
        }))

        const state = loadExpensesViewState()

        expect(state.presetId).toBe('this_month')
        expect(state.tableState.sortColumn).toBe('total')
        expect(state.tableState.sortDirection).toBe('desc')
        expect(state.tableState.columns.find(column => column.key === 'supplierName')).toMatchObject({ visible: false, width: 160 })
        expect(state.tableState.columns.at(-1)).toMatchObject({ key: 'actions', visible: true, width: 300 })
    })

    it('guarda el estado v2 normalizado y elimina la preferencia anterior', () => {
        localStorage.setItem('expenses-view-v1', '{}')
        const tableState = defaultExpenseTableState()
        tableState.columns[0].width = 20

        saveExpensesViewState({
            presetId: 'today',
            customFromYmd: null,
            customToYmd: null,
            fromDate: '2026-08-20',
            toDate: '2026-08-20',
            pageSize: 50,
            sortBy: 'id',
            sortOrder: 'desc',
            tableState,
        })

        expect(localStorage.getItem('expenses-view-v1')).toBeNull()
        expect(localStorage.getItem(EXPENSES_VIEW_STORAGE_KEY)).not.toBeNull()
        expect(loadExpensesViewState().tableState.columns[0].width).toBe(80)
    })
})
