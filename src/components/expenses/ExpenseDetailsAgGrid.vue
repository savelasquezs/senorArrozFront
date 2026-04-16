<template>
    <div class="expense-ag-grid-root h-full min-h-[240px] w-full rounded-lg border border-gray-200 overflow-hidden bg-white">
        <AgGridVue class="h-full w-full expense-ag-grid" :theme="themeQuartz" :row-data="rowData"
            :column-defs="columnDefs" :default-col-def="defaultColDef" :context="gridContext" :loading="loading"
            :header-height="34" :row-height="36" :get-row-id="getRowId" :overlay-no-rows-template="noRowsHtml"
            dom-layout="normal"
            :pagination="false" :animate-rows="true" @grid-ready="onGridReady" @cell-clicked="onCellClicked"
            @filter-changed="onFilterChanged" @column-resized="onColumnChanged" @column-moved="onColumnChanged"
            @column-visible="onColumnChanged" @sort-changed="onColumnChanged" />
    </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import {
    themeQuartz,
    type CellClickedEvent,
    type ColDef,
    type ColumnState,
    type GridApi,
    type GridReadyEvent,
    type ICellRendererParams,
} from 'ag-grid-community'
import type { ExpenseDetailGridRow } from '@/types/expense'
import { formatCurrency, formatDateShort, formatTime } from '@/composables/useFormatting'

export interface ExpensesGridContext {
    onViewDetail: (headerId: number) => void
    onEdit: (headerId: number) => void
    onDeleteHeader: (headerId: number) => void
}

const props = withDefaults(
    defineProps<{
        rowData: ExpenseDetailGridRow[]
        loading?: boolean
        initialColumnState?: ColumnState[] | null
    }>(),
    {
        loading: false,
        initialColumnState: null,
    },
)

const emit = defineEmits<{
    'summary-change': [payload: { totalAmount: number; rowCount: number }]
    'column-state-change': [state: ColumnState[]]
    'view-detail': [headerId: number]
    edit: [headerId: number]
    'delete-header': [headerId: number]
    'invoice-click': [headerId: number]
}>()

const gridApi = ref<GridApi<ExpenseDetailGridRow> | null>(null)

const gridContext: ExpensesGridContext = {
    onViewDetail: (id: number) => emit('view-detail', id),
    onEdit: (id: number) => emit('edit', id),
    onDeleteHeader: (id: number) => emit('delete-header', id),
}

const noRowsHtml =
    '<span class="ag-overlay-no-rows-center text-gray-500 text-sm">Sin resultados con los filtros actuales</span>'

function getRowId(p: { data: ExpenseDetailGridRow }) {
    return String(p.data.detailId)
}

function actionsCellRenderer() {
    return (params: ICellRendererParams<ExpenseDetailGridRow, unknown, ExpensesGridContext>) => {
        const wrap = document.createElement('div')
        wrap.className = 'flex flex-wrap gap-1 justify-end py-0.5'
        const ctx = params.context
        const data = params.data
        if (!data || !ctx) return wrap

        const mkBtn = (label: string, className: string, onClick: () => void) => {
            const b = document.createElement('button')
            b.type = 'button'
            b.textContent = label
            b.className = className
            b.addEventListener('click', e => {
                e.stopPropagation()
                onClick()
            })
            return b
        }

        wrap.appendChild(
            mkBtn(
                'Ver',
                'px-2 py-1 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                () => ctx.onViewDetail(data.headerId),
            ),
        )
        wrap.appendChild(
            mkBtn(
                'Editar',
                'px-2 py-1 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
                () => ctx.onEdit(data.headerId),
            ),
        )
        wrap.appendChild(
            mkBtn(
                'Eliminar',
                'px-2 py-1 text-xs font-medium rounded-lg border border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
                () => ctx.onDeleteHeader(data.headerId),
            ),
        )
        return wrap
    }
}

const defaultColDef: ColDef<ExpenseDetailGridRow> = {
    sortable: true,
    filter: true,
    resizable: true,
    /** Sin segunda fila de filtros: más altura útil; filtro desde menú de columna (⋮). */
    floatingFilter: false,
    suppressHeaderMenuButton: false,
}

const columnDefs: ColDef<ExpenseDetailGridRow>[] = [
    {
        field: 'headerId',
        headerName: 'Factura',
        width: 110,
        filter: 'agNumberColumnFilter',
        cellClass: 'cursor-pointer font-semibold text-emerald-700 hover:underline',
        valueFormatter: p => (p.value != null ? `#${p.value}` : ''),
    },
    {
        field: 'createdAt',
        headerName: 'Fecha',
        minWidth: 150,
        valueFormatter: p => {
            if (!p.value) return ''
            return `${formatDateShort(String(p.value))} ${formatTime(String(p.value))}`
        },
        comparator: (a, b) => new Date(String(a)).getTime() - new Date(String(b)).getTime(),
    },
    { field: 'categoryName', headerName: 'Categoría', flex: 1, minWidth: 120 },
    { field: 'expenseName', headerName: 'Gasto', flex: 1, minWidth: 130 },
    { field: 'supplierName', headerName: 'Proveedor', flex: 1, minWidth: 130 },
    {
        field: 'quantity',
        headerName: 'Cant.',
        width: 100,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
    },
    {
        field: 'amount',
        headerName: 'V. unitario',
        width: 130,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: p => (p.value != null ? formatCurrency(Number(p.value)) : ''),
    },
    {
        field: 'total',
        headerName: 'Total',
        width: 130,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        valueFormatter: p => (p.value != null ? formatCurrency(Number(p.value)) : ''),
    },
    {
        field: 'notes',
        headerName: 'Notas',
        flex: 1,
        minWidth: 120,
        tooltipField: 'notes',
    },
    { field: 'createdByName', headerName: 'Creado por', width: 140 },
    {
        headerName: 'Acciones',
        colId: 'actions',
        sortable: false,
        filter: false,
        floatingFilter: false,
        width: 220,
        pinned: 'right',
        cellRenderer: actionsCellRenderer(),
    },
]

function recalcSummary(api: GridApi<ExpenseDetailGridRow>) {
    let totalAmount = 0
    let rowCount = 0
    api.forEachNodeAfterFilter(node => {
        if (node.data) {
            totalAmount += Number(node.data.total) || 0
            rowCount += 1
        }
    })
    emit('summary-change', { totalAmount, rowCount })
}

function emitColumnState(api: GridApi<ExpenseDetailGridRow>) {
    emit('column-state-change', api.getColumnState())
}

function onGridReady(e: GridReadyEvent<ExpenseDetailGridRow>) {
    gridApi.value = e.api
    if (props.initialColumnState?.length) {
        e.api.applyColumnState({ state: props.initialColumnState, applyOrder: true })
    }
    recalcSummary(e.api)
}

function onCellClicked(ev: CellClickedEvent<ExpenseDetailGridRow>) {
    if (ev.colDef?.field === 'headerId' && ev.data) {
        emit('invoice-click', ev.data.headerId)
    }
}

function onFilterChanged(e: { api: GridApi<ExpenseDetailGridRow> }) {
    recalcSummary(e.api)
}

function onColumnChanged(e: { api: GridApi<ExpenseDetailGridRow> }) {
    emitColumnState(e.api)
    recalcSummary(e.api)
}

watch(
    () => props.rowData,
    () => {
        const api = gridApi.value
        if (api) {
            recalcSummary(api)
        }
    },
    { deep: true },
)
</script>

<style scoped>
.expense-ag-grid-root :deep(.ag-root-wrapper) {
    border-radius: 0.75rem;
}

.expense-ag-grid-root :deep(.ag-row-hover) {
    background-color: rgb(236 253 245 / 0.65) !important;
}
</style>
