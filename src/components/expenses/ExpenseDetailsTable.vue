<template>
    <div class="h-full min-h-[240px] w-full overflow-auto rounded-lg border border-gray-200 bg-white">
        <table class="table-fixed border-separate border-spacing-0 text-xs" :style="{ minWidth: `${tableWidth}px` }">
            <thead class="sticky top-0 z-20 bg-gray-50 text-left text-gray-600">
                <tr>
                    <th v-for="column in visibleColumns" :key="column.key" scope="col"
                        class="relative border-b border-r border-gray-200 px-2 py-2 font-semibold last:border-r-0"
                        :class="column.key === 'actions' ? 'sticky right-0 z-30 bg-gray-50 shadow-[-4px_0_6px_-5px_rgba(0,0,0,0.35)]' : ''"
                        :style="columnStyle(column)">
                        <template v-if="column.key === 'actions'">
                            <details class="relative text-left" @click.stop>
                                <summary class="cursor-pointer list-none select-none text-right text-[11px] text-gray-700">
                                    Columnas
                                </summary>
                                <div class="absolute right-0 top-6 z-50 w-52 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                                    <label v-for="option in configurableColumns" :key="option.key"
                                        class="flex cursor-pointer items-center gap-2 px-1 py-1 text-xs text-gray-700">
                                        <input :checked="option.visible" type="checkbox" class="rounded border-gray-300 text-emerald-600"
                                            @change="onColumnVisibilityChange(option.key, $event)">
                                        <span>{{ columnLabel(option.key) }}</span>
                                    </label>
                                    <button type="button" class="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                        @click="resetTableState">
                                        Restablecer columnas
                                    </button>
                                </div>
                            </details>
                        </template>
                        <button v-else type="button" class="flex w-full items-center gap-1 text-left hover:text-emerald-700"
                            @click="toggleSort(column.key)">
                            <span class="truncate">{{ columnLabel(column.key) }}</span>
                            <span class="ml-auto text-[10px]" :class="sortColumn === column.key ? 'text-emerald-700' : 'text-gray-300'">
                                {{ sortIndicator(column.key) }}
                            </span>
                        </button>
                        <span v-if="column.key !== 'actions'" :data-column-resize="column.key" class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-emerald-300"
                            @pointerdown="startResize($event, column.key)" />
                    </th>
                </tr>
                <tr class="bg-white">
                    <th v-for="column in visibleColumns" :key="column.key" class="border-b border-r border-gray-200 p-1 align-top last:border-r-0"
                        :class="column.key === 'actions' ? 'sticky right-0 z-30 bg-white shadow-[-4px_0_6px_-5px_rgba(0,0,0,0.35)]' : ''"
                        :style="columnStyle(column)">
                        <input v-if="column.key === 'headerId'" v-model.trim="filters.headerId" type="number" min="1" placeholder="#"
                            class="w-full rounded border border-gray-200 px-1.5 py-1 text-[11px] font-normal outline-none focus:border-emerald-500">
                        <BaseDatePicker v-else-if="column.key === 'createdAt'" v-model="filters.createdAt"
                            variant="compact" class="min-w-0 w-full" />
                        <div v-else-if="isNumericColumn(column.key)" class="flex gap-1">
                            <input :value="numericFilterValue(column.key, 'Min')" type="number" placeholder="Min" @input="setNumericFilter(column.key, 'Min', $event)"
                                class="min-w-0 w-1/2 rounded border border-gray-200 px-1 py-1 text-[10px] font-normal outline-none focus:border-emerald-500">
                            <input :value="numericFilterValue(column.key, 'Max')" type="number" placeholder="Max" @input="setNumericFilter(column.key, 'Max', $event)"
                                class="min-w-0 w-1/2 rounded border border-gray-200 px-1 py-1 text-[10px] font-normal outline-none focus:border-emerald-500">
                        </div>
                        <input v-else-if="isTextColumn(column.key)" :value="textFilterValue(column.key)" type="search" placeholder="Filtrar" @input="setTextFilter(column.key, $event)"
                            class="w-full rounded border border-gray-200 px-1.5 py-1 text-[11px] font-normal outline-none focus:border-emerald-500">
                        <button v-else type="button" class="w-full rounded border border-gray-200 px-1 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
                            @click="clearFilters">
                            Limpiar
                        </button>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="loading">
                    <td :colspan="visibleColumns.length" class="px-3 py-10 text-center text-sm text-gray-500">Cargando gastos…</td>
                </tr>
                <tr v-else-if="sortedRows.length === 0">
                    <td :colspan="visibleColumns.length" class="px-3 py-10 text-center text-sm text-gray-500">Sin resultados con los filtros aplicados</td>
                </tr>
                <tr v-for="row in sortedRows" :key="row.detailId" class="group hover:bg-emerald-50/50">
                    <td v-for="column in visibleColumns" :key="column.key"
                        class="border-b border-r border-gray-100 px-2 py-1.5 align-middle text-gray-700 last:border-r-0"
                        :class="column.key === 'actions' ? 'sticky right-0 z-10 bg-white group-hover:bg-emerald-50 shadow-[-4px_0_6px_-5px_rgba(0,0,0,0.35)]' : ''"
                        :style="columnStyle(column)">
                        <button v-if="column.key === 'headerId'" type="button" class="font-semibold text-emerald-700 hover:underline"
                            @click="$emit('invoice-click', row.headerId)">#{{ row.headerId }}</button>
                        <span v-else-if="column.key === 'createdAt'" class="whitespace-nowrap">{{ formatDateTime(row.createdAt) }}</span>
                        <span v-else-if="column.key === 'amount'" class="block text-right tabular-nums">{{ formatCurrency(row.amount) }}</span>
                        <span v-else-if="column.key === 'total'" class="block text-right font-medium tabular-nums">{{ formatCurrency(row.total) }}</span>
                        <span v-else-if="column.key === 'quantity'" class="block text-right tabular-nums">{{ row.quantity }}</span>
                        <span v-else-if="column.key === 'notes'" class="block truncate" :title="row.notes">{{ row.notes }}</span>
                        <div v-else-if="column.key === 'actions'" class="flex justify-end gap-1 whitespace-nowrap">
                            <button type="button" class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                                @click="$emit('view-detail', row.headerId)">Ver</button>
                            <button type="button" class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                :disabled="!row.canEdit" :title="row.canEdit ? undefined : 'No tienes permiso para modificar este gasto'"
                                @click="$emit('edit-detail', { headerId: row.headerId, detailId: row.detailId })">Editar</button>
                            <button type="button" class="rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                :disabled="!row.canDelete" :title="row.canDelete ? undefined : 'No tienes permiso para eliminar este gasto'"
                                @click="$emit('delete-detail', { headerId: row.headerId, detailId: row.detailId })">Eliminar</button>
                        </div>
                        <span v-else class="block truncate" :title="String(row[column.key])">{{ row[column.key] }}</span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ExpenseDetailGridRow } from '@/types/expense'
import { formatCurrency, formatDateShort, formatTime } from '@/composables/useFormatting'
import {
    defaultExpenseTableState,
    normalizeExpenseTableState,
    type ExpenseTableColumnKey,
    type ExpenseTableColumnState,
    type ExpenseTableSortableColumnKey,
    type ExpenseTableState,
} from '@/composables/useExpensesViewPersistence'
import { defaultBusinessCalendar } from '@/utils/datetime'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'

interface ColumnFilters {
    headerId: string
    createdAt: string
    categoryName: string
    expenseName: string
    supplierName: string
    quantityMin: string
    quantityMax: string
    amountMin: string
    amountMax: string
    totalMin: string
    totalMax: string
    notes: string
    createdByName: string
}

const props = withDefaults(defineProps<{
    rowData: ExpenseDetailGridRow[]
    loading?: boolean
    initialTableState?: ExpenseTableState | null
}>(), {
    loading: false,
    initialTableState: null,
})

const emit = defineEmits<{
    'summary-change': [payload: { totalAmount: number; rowCount: number }]
    'table-state-change': [state: ExpenseTableState]
    'view-detail': [headerId: number]
    'edit-detail': [payload: { headerId: number; detailId: number }]
    'delete-detail': [payload: { headerId: number; detailId: number }]
    'invoice-click': [headerId: number]
}>()

const tableState = ref<ExpenseTableState>(defaultExpenseTableState())
const filters = ref<ColumnFilters>({
    headerId: '', createdAt: '', categoryName: '', expenseName: '', supplierName: '',
    quantityMin: '', quantityMax: '', amountMin: '', amountMax: '', totalMin: '', totalMax: '', notes: '', createdByName: '',
})
const resizing = ref<{ key: ExpenseTableColumnKey; startX: number; startWidth: number } | null>(null)

const visibleColumns = computed(() => tableState.value.columns.filter(column => column.visible))
const configurableColumns = computed(() => tableState.value.columns.filter(column => column.key !== 'actions'))
const tableWidth = computed(() => visibleColumns.value.reduce((sum, column) => sum + column.width, 0))
const sortColumn = computed(() => tableState.value.sortColumn)
const sortDirection = computed(() => tableState.value.sortDirection)

watch(() => props.initialTableState, state => {
    tableState.value = normalizeExpenseTableState(state)
}, { immediate: true, deep: true })

const filteredRows = computed(() => props.rowData.filter(row => {
    if (filters.value.headerId && String(row.headerId) !== filters.value.headerId) return false
    if (filters.value.createdAt && defaultBusinessCalendar.formatYmd(row.createdAt) !== filters.value.createdAt) return false
    if (!matchesText(row.categoryName, filters.value.categoryName)) return false
    if (!matchesText(row.expenseName, filters.value.expenseName)) return false
    if (!matchesText(row.supplierName, filters.value.supplierName)) return false
    if (!matchesText(row.notes, filters.value.notes)) return false
    if (!matchesText(row.createdByName, filters.value.createdByName)) return false
    return matchesRange(row.quantity, filters.value.quantityMin, filters.value.quantityMax) &&
        matchesRange(row.amount, filters.value.amountMin, filters.value.amountMax) &&
        matchesRange(row.total, filters.value.totalMin, filters.value.totalMax)
}))

const sortedRows = computed(() => {
    const rows = [...filteredRows.value]
    if (!sortColumn.value || !sortDirection.value) return rows
    const direction = sortDirection.value === 'asc' ? 1 : -1
    return rows.sort((left, right) => compareRows(left, right, sortColumn.value!) * direction)
})

watch(filteredRows, rows => {
    emit('summary-change', {
        rowCount: rows.length,
        totalAmount: rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
    })
}, { immediate: true })

function columnLabel(key: ExpenseTableColumnKey): string {
    return {
        headerId: 'Factura', createdAt: 'Fecha', categoryName: 'Categoría', expenseName: 'Gasto', supplierName: 'Proveedor',
        quantity: 'Cant.', amount: 'V. unitario', total: 'Total', notes: 'Notas', createdByName: 'Creado por', actions: 'Acciones',
    }[key]
}

function columnStyle(column: ExpenseTableColumnState) {
    return { width: `${column.width}px`, minWidth: `${column.width}px` }
}

function isNumericColumn(key: ExpenseTableColumnKey): key is 'quantity' | 'amount' | 'total' {
    return key === 'quantity' || key === 'amount' || key === 'total'
}

function isTextColumn(key: ExpenseTableColumnKey): key is 'categoryName' | 'expenseName' | 'supplierName' | 'notes' | 'createdByName' {
    return key === 'categoryName' || key === 'expenseName' || key === 'supplierName' || key === 'notes' || key === 'createdByName'
}

function sortIndicator(key: ExpenseTableColumnKey): string {
    if (sortColumn.value !== key) return '↕'
    return sortDirection.value === 'asc' ? '↑' : '↓'
}

function toggleSort(key: ExpenseTableColumnKey) {
    if (key === 'actions') return
    const next = normalizeExpenseTableState(tableState.value)
    if (next.sortColumn !== key) {
        next.sortColumn = key
        next.sortDirection = 'asc'
    } else if (next.sortDirection === 'asc') {
        next.sortDirection = 'desc'
    } else {
        next.sortColumn = null
        next.sortDirection = null
    }
    updateTableState(next)
}

function setColumnVisibility(key: ExpenseTableColumnKey, visible: boolean) {
    const next = normalizeExpenseTableState(tableState.value)
    const column = next.columns.find(item => item.key === key)
    if (column) column.visible = visible
    updateTableState(next)
}

function onColumnVisibilityChange(key: ExpenseTableColumnKey, event: Event) {
    setColumnVisibility(key, (event.target as HTMLInputElement).checked)
}

function textFilterValue(key: 'categoryName' | 'expenseName' | 'supplierName' | 'notes' | 'createdByName'): string {
    return filters.value[key]
}

function setTextFilter(key: 'categoryName' | 'expenseName' | 'supplierName' | 'notes' | 'createdByName', event: Event) {
    filters.value[key] = (event.target as HTMLInputElement).value
}

function numericFilterValue(key: 'quantity' | 'amount' | 'total', bound: 'Min' | 'Max'): string {
    return filters.value[`${key}${bound}`]
}

function setNumericFilter(key: 'quantity' | 'amount' | 'total', bound: 'Min' | 'Max', event: Event) {
    filters.value[`${key}${bound}`] = (event.target as HTMLInputElement).value
}

function resetTableState() {
    updateTableState(defaultExpenseTableState())
}

function updateTableState(next: ExpenseTableState) {
    tableState.value = normalizeExpenseTableState(next)
    emit('table-state-change', tableState.value)
}

function startResize(event: PointerEvent, key: ExpenseTableColumnKey) {
    event.preventDefault()
    event.stopPropagation()
    const column = tableState.value.columns.find(item => item.key === key)
    if (!column) return
    resizing.value = { key, startX: event.clientX, startWidth: column.width }
    window.addEventListener('pointermove', resizeColumn)
    window.addEventListener('pointerup', finishResize, { once: true })
}

function resizeColumn(event: PointerEvent) {
    const active = resizing.value
    if (!active) return
    const column = tableState.value.columns.find(item => item.key === active.key)
    if (column) column.width = Math.min(500, Math.max(80, active.startWidth + event.clientX - active.startX))
}

function finishResize() {
    if (!resizing.value) return
    resizing.value = null
    window.removeEventListener('pointermove', resizeColumn)
    updateTableState(tableState.value)
}

function clearFilters() {
    filters.value = {
        headerId: '', createdAt: '', categoryName: '', expenseName: '', supplierName: '',
        quantityMin: '', quantityMax: '', amountMin: '', amountMax: '', totalMin: '', totalMax: '', notes: '', createdByName: '',
    }
}

function matchesText(value: string, filter: string): boolean {
    if (!filter) return true
    return normalizeText(value).includes(normalizeText(filter))
}

function normalizeText(value: string): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
}

function matchesRange(value: number, min: string, max: string): boolean {
    const numberValue = Number(value)
    const minValue = min === '' ? null : Number(min)
    const maxValue = max === '' ? null : Number(max)
    return (minValue === null || numberValue >= minValue) && (maxValue === null || numberValue <= maxValue)
}

function compareRows(left: ExpenseDetailGridRow, right: ExpenseDetailGridRow, key: ExpenseTableSortableColumnKey): number {
    if (key === 'createdAt') return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    if (key === 'headerId' || key === 'quantity' || key === 'amount' || key === 'total') return Number(left[key]) - Number(right[key])
    return String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'es-CO', { sensitivity: 'base', numeric: true })
}

function formatDateTime(value: string): string {
    return `${formatDateShort(value)} ${formatTime(value)}`
}

onBeforeUnmount(() => {
    window.removeEventListener('pointermove', resizeColumn)
})
</script>
