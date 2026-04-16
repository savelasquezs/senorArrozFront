<template>
    <MainLayout>
        <div class="flex flex-col min-h-0 h-[calc(100vh-5.75rem)] max-h-[calc(100vh-3.5rem)]">
            <!-- Encabezado compacto -->
            <div class="flex-shrink-0 mb-2 flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <h1 class="text-lg font-semibold text-gray-900 tracking-tight">Gastos</h1>
                    <p class="text-[11px] text-gray-500 leading-tight mt-0.5 hidden sm:block">
                        Líneas por factura · columna ▾ = filtro (página actual)
                    </p>
                </div>
                <BaseButton variant="primary" size="sm" class="shrink-0" @click="openCreateModal">
                    <PlusIcon class="w-4 h-4 sm:mr-1" />
                    <span class="hidden sm:inline">Nuevo</span>
                </BaseButton>
            </div>

            <ExpensesSummary class="flex-shrink-0" :total-amount="summary.totalAmount" :row-count="summary.rowCount" />

            <ExpensesFilters class="flex-shrink-0" v-model:preset-id="presetId" :custom-range="customRange"
                v-model:local-filters="localFilters" :category-options="categoryOptions" :bank-options="bankOptions"
                :supplier-options="supplierOptions" :sort-by="sortBy" :sort-order="sortOrder" :loading="loading"
                :has-active-filters="hasActiveFilters" @update:preset-id="onPresetIdChange"
                @update:custom-range="onCustomRangeChange" @update:sort-by="onSortByChange"
                @toggle-sort-order="toggleSortOrder" @clear-filters="clearFilters" @refresh="fetchExpenses">
                <template #result-hint>
                    <span v-if="!loading && totalCount > 0">
                        Facturas con líneas que coinciden (pág.):
                        <span class="font-medium">{{ filteredExpenses.length }}</span>
                        · Total servidor:
                        <span class="font-medium">{{ totalCount }}</span>
                    </span>
                    <span v-else-if="!loading" class="text-gray-400">Sin facturas en el rango</span>
                    <span v-else class="text-gray-400">Cargando…</span>
                </template>
            </ExpensesFilters>

            <div class="relative z-0 flex-1 min-h-0 flex flex-col gap-2 min-w-0">
                <ExpenseDetailsAgGrid class="flex-1 min-h-0 min-w-0" :row-data="gridRowData" :loading="loading"
                    :initial-column-state="columnState" @summary-change="onSummaryChange"
                    @column-state-change="onColumnStateChange"
                    @view-detail="handleViewDetailByHeaderId" @edit-detail="handleEditDetailLine"
                    @delete-detail="handleDeleteDetailLine" @invoice-click="handleViewDetailByHeaderId" />

                <div v-if="!loading && totalPages > 1"
                    class="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <div class="hidden sm:block text-xs text-gray-600">
                        Mostrando
                        <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span>
                        a
                        <span class="font-medium">{{ Math.min(currentPage * pageSize, totalCount) }}</span>
                        de
                        <span class="font-medium">{{ totalCount }}</span>
                        facturas
                    </div>
                    <div class="flex items-center gap-2">
                        <BaseSelect v-model="pageSize" :options="pageSizeOptions" label="Por página" class="w-36"
                            @update:model-value="handlePageSizeChange" />
                        <nav class="inline-flex rounded-md shadow-sm">
                            <button type="button" :disabled="currentPage === 1"
                                class="px-2 py-2 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                @click="changePage(currentPage - 1)">
                                <ChevronLeftIcon class="h-5 w-5" />
                            </button>
                            <button v-for="page in visiblePages" :key="page" type="button" :class="[
                                'px-3 py-2 border-y border-gray-300 text-sm font-medium',
                                page === currentPage
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 z-10'
                                    : 'bg-white text-gray-600 hover:bg-gray-50',
                            ]" @click="changePage(page)">
                                {{ page }}
                            </button>
                            <button type="button" :disabled="currentPage === totalPages"
                                class="px-2 py-2 rounded-r-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                @click="changePage(currentPage + 1)">
                                <ChevronRightIcon class="h-5 w-5" />
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </div>

        <ExpenseDetailModal v-if="showDetailModal && selectedExpense" :is-open="showDetailModal"
            :expense="selectedExpense" :loading="loadingDetail" @close="closeDetailModal"
            @edit="handleEditFromDetail" />

        <ExpenseFormModal v-if="showFormModal" :is-open="showFormModal" :editing-expense="editingExpense"
            :focus-detail-id="formFocusDetailId" :loading="submitting" @close="closeFormModal"
            @submit="handleSubmitExpense" />

        <BaseDialog :model-value="showDeleteLineConfirm" title="Confirmar eliminación" size="md"
            @update:model-value="onDeleteLineDialogUpdate">
            <p v-if="deleteLinePending" class="text-sm text-gray-700">
                <template v-if="deleteLinePending.mode === 'full'">
                    Esta es la única línea de la factura
                    <span class="font-semibold">#{{ deleteLinePending.headerId }}</span>.
                    ¿Eliminar la factura completa?
                </template>
                <template v-else>
                    ¿Eliminar esta línea del gasto?
                </template>
            </p>
            <template #footer>
                <BaseButton variant="secondary" :disabled="deleteLineExecuting" @click="closeDeleteLineConfirm">
                    Cancelar
                </BaseButton>
                <BaseButton variant="danger" :loading="deleteLineExecuting" @click="confirmDeleteDetailLine">
                    Eliminar
                </BaseButton>
            </template>
        </BaseDialog>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ColumnState } from 'ag-grid-community'
import type { ExpenseHeader, UpdateExpenseHeaderDto } from '@/types/expense'
import { expenseHeaderApi } from '@/services/MainAPI/expenseHeaderApi'
import { useExpenseFilters, type ExpenseFilterState } from '@/composables/useExpenseFilters'
import { useToast } from '@/composables/useToast'
import {
    loadExpensesViewState,
    saveExpensesViewState,
} from '@/composables/useExpensesViewPersistence'
import type { DashboardPeriodPresetId } from '@/utils/dashboardPeriodPresets'
import { presetToExpenseApiDateRange } from '@/utils/expensesDateRange'
import { flattenExpenseHeadersToGridRows } from '@/utils/expenseGridFlatten'
import { defaultBusinessCalendar } from '@/utils/datetime'
import { defaultDateRangeThisMonth } from '@/components/dashboard/dashboardDateUtils'
import MainLayout from '@/components/layout/MainLayout.vue'
import ExpenseDetailsAgGrid from '@/components/expenses/ExpenseDetailsAgGrid.vue'
import ExpensesFilters from '@/components/expenses/ExpensesFilters.vue'
import ExpensesSummary from '@/components/expenses/ExpensesSummary.vue'
import ExpenseDetailModal from '@/components/expenses/ExpenseDetailModal.vue'
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const { applyAllFilters } = useExpenseFilters()
const { success, error } = useToast()

const stored = loadExpensesViewState()

const loading = ref(false)
const loadingDetail = ref(false)
const submitting = ref(false)
const expenses = ref<ExpenseHeader[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(stored.pageSize)
const sortBy = ref<'id' | 'total' | 'createdAt'>(stored.sortBy)
const sortOrder = ref<'asc' | 'desc'>(stored.sortOrder)

const presetId = ref<DashboardPeriodPresetId>(stored.presetId)
const customRange = ref<[Date, Date] | null>(
    stored.presetId === 'custom' && stored.customFromYmd && stored.customToYmd
        ? [parseYmd(stored.customFromYmd), parseYmd(stored.customToYmd)]
        : null,
)

const dateFilters = ref({
    fromDate: stored.fromDate,
    toDate: stored.toDate,
})

const localFilters = ref<ExpenseFilterState>({
    categoryNames: [],
    bankNames: [],
    supplierIds: [],
    expenseName: '',
})

const showDetailModal = ref(false)
const showFormModal = ref(false)
const selectedExpense = ref<ExpenseHeader | null>(null)
const editingExpense = ref<ExpenseHeader | null>(null)
/** Línea de detalle a enfocar al abrir el formulario desde la grilla. */
const formFocusDetailId = ref<number | null>(null)

const summary = ref({ totalAmount: 0, rowCount: 0 })
const columnState = ref<ColumnState[] | null>(stored.columnState)

function parseYmd(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number)
    return defaultBusinessCalendar.zonedDayFromPickerLocalDate(new Date(y, m - 1, d))
}

const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
]

const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        return [value]
    }
    return []
}

const toNumberArray = (value: unknown): number[] => {
    if (Array.isArray(value)) {
        return value
            .map(item => (typeof item === 'number' ? item : Number(item)))
            .filter(item => !Number.isNaN(item))
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
        return [value]
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? [] : [parsed]
    }
    return []
}

const normalizedFilters = computed<ExpenseFilterState>(() => ({
    categoryNames: toStringArray(localFilters.value.categoryNames),
    bankNames: toStringArray(localFilters.value.bankNames),
    supplierIds: toNumberArray(localFilters.value.supplierIds),
    expenseName: localFilters.value.expenseName || '',
}))

const normalizeExpense = (header: ExpenseHeader): ExpenseHeader => {
    const normalizedDetails = header.expenseDetails.map(detail => {
        const hasLineTotal = detail.total != null && !Number.isNaN(Number(detail.total))
        const computedTotal = hasLineTotal
            ? Number(detail.total)
            : Number(detail.amount) * Number(detail.quantity)
        return {
            ...detail,
            total: computedTotal,
        }
    })

    const total = normalizedDetails.reduce((sum, detail) => sum + (detail.total || 0), 0)
    const derivedCategories = normalizedDetails
        .map(detail => detail.expenseCategoryName)
        .filter((name): name is string => Boolean(name))
    const derivedBanks = header.expenseBankPayments
        .map(payment => payment.bankName)
        .filter((name): name is string => Boolean(name))

    return {
        ...header,
        expenseDetails: normalizedDetails,
        total,
        categoryNames:
            header.categoryNames.length > 0 ? header.categoryNames : Array.from(new Set(derivedCategories)),
        bankNames: header.bankNames.length > 0 ? header.bankNames : Array.from(new Set(derivedBanks)),
    }
}

const filteredExpenses = computed(() => applyAllFilters(expenses.value, normalizedFilters.value))

const gridRowData = computed(() => flattenExpenseHeadersToGridRows(filteredExpenses.value))

const categoryOptions = computed(() => {
    const categories = new Set<string>()
    expenses.value.forEach(expense => {
        expense.categoryNames.forEach(cat => categories.add(cat))
    })
    return Array.from(categories).map(cat => ({ value: cat, label: cat }))
})

const bankOptions = computed(() => {
    const banks = new Set<string>()
    expenses.value.forEach(expense => {
        expense.bankNames.forEach(bank => banks.add(bank))
    })
    return Array.from(banks).map(bank => ({ value: bank, label: bank }))
})

const supplierOptions = computed(() => {
    const suppliers = new Map<number, string>()
    expenses.value.forEach(expense => {
        if (!suppliers.has(expense.supplierId)) {
            suppliers.set(expense.supplierId, expense.supplierName)
        }
    })
    return Array.from(suppliers.entries()).map(([id, name]) => ({ value: id, label: name }))
})

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const visiblePages = computed(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages.value, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
        pages.push(i)
    }
    return pages
})

const hasActiveFilters = computed(() => {
    return !!(
        normalizedFilters.value.categoryNames.length > 0 ||
        normalizedFilters.value.bankNames.length > 0 ||
        normalizedFilters.value.supplierIds.length > 0 ||
        normalizedFilters.value.expenseName.trim()
    )
})

function persistState() {
    const cr = customRange.value
    saveExpensesViewState({
        presetId: presetId.value,
        customFromYmd: cr ? defaultBusinessCalendar.formatYmd(cr[0]) : null,
        customToYmd: cr ? defaultBusinessCalendar.formatYmd(cr[1]) : null,
        fromDate: dateFilters.value.fromDate,
        toDate: dateFilters.value.toDate,
        pageSize: pageSize.value,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        columnState: columnState.value,
    })
}

watch(
    [presetId, customRange, dateFilters, pageSize, sortBy, sortOrder, columnState],
    () => persistState(),
    { deep: true },
)

function syncDatesFromPresetAndFetch() {
    const r = presetToExpenseApiDateRange(presetId.value, new Date(), customRange.value)
    dateFilters.value = { fromDate: r.fromDate, toDate: r.toDate }
    currentPage.value = 1
    fetchExpenses()
}

function onPresetIdChange(id: DashboardPeriodPresetId) {
    if (id !== 'custom') {
        customRange.value = null
    } else if (!customRange.value) {
        const pair = defaultDateRangeThisMonth(new Date())
        customRange.value = [pair[0], pair[1]]
    }
    const r = presetToExpenseApiDateRange(id, new Date(), id === 'custom' ? customRange.value : null)
    dateFilters.value = { fromDate: r.fromDate, toDate: r.toDate }
    currentPage.value = 1
    fetchExpenses()
}

function onCustomRangeChange(v: [Date, Date] | null) {
    customRange.value = v
    if (presetId.value === 'custom' && v) {
        const r = presetToExpenseApiDateRange('custom', new Date(), v)
        dateFilters.value = { fromDate: r.fromDate, toDate: r.toDate }
        currentPage.value = 1
        fetchExpenses()
    }
}

function onSortByChange(v: 'id' | 'total' | 'createdAt') {
    sortBy.value = v
    currentPage.value = 1
    fetchExpenses()
}

function toggleSortOrder() {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    currentPage.value = 1
    fetchExpenses()
}

const fetchExpenses = async () => {
    loading.value = true
    summary.value = { totalAmount: 0, rowCount: 0 }
    try {
        const response = await expenseHeaderApi.getExpenseHeaders({
            fromDate: dateFilters.value.fromDate || undefined,
            toDate: dateFilters.value.toDate || undefined,
            page: currentPage.value,
            pageSize: pageSize.value,
            sortBy: sortBy.value,
            sortOrder: sortOrder.value,
        })

        expenses.value = response.items.map(normalizeExpense)
        totalCount.value = response.totalCount
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        error('Error al cargar gastos', msg)
    } finally {
        loading.value = false
    }
}

const clearFilters = () => {
    localFilters.value = {
        categoryNames: [],
        bankNames: [],
        supplierIds: [],
        expenseName: '',
    }
    presetId.value = 'this_month'
    customRange.value = null
    syncDatesFromPresetAndFetch()
}

const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        fetchExpenses()
    }
}

const handlePageSizeChange = () => {
    currentPage.value = 1
    fetchExpenses()
}

function onSummaryChange(p: { totalAmount: number; rowCount: number }) {
    summary.value = p
}

function onColumnStateChange(state: ColumnState[]) {
    columnState.value = state
}

const handleViewDetailByHeaderId = async (headerId: number) => {
    loadingDetail.value = true
    showDetailModal.value = true
    try {
        const detail = await expenseHeaderApi.getExpenseHeaderById(headerId)
        selectedExpense.value = normalizeExpense(detail)
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        error('Error al cargar detalle', msg)
        showDetailModal.value = false
    } finally {
        loadingDetail.value = false
    }
}

const handleEditByHeaderId = async (headerId: number, opts?: { focusDetailId?: number | null }) => {
    formFocusDetailId.value = opts?.focusDetailId ?? null
    try {
        const fresh = await expenseHeaderApi.getExpenseHeaderById(headerId)
        editingExpense.value = normalizeExpense(fresh)
        showFormModal.value = true
    } catch (err: unknown) {
        formFocusDetailId.value = null
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        error('Error al cargar el gasto', msg)
    }
}

const handleEditDetailLine = (payload: { headerId: number; detailId: number }) => {
    void handleEditByHeaderId(payload.headerId, { focusDetailId: payload.detailId })
}

const handleEditFromDetail = () => {
    const id = selectedExpense.value?.id
    if (id == null) return
    closeDetailModal()
    void handleEditByHeaderId(id)
}

type DeleteLinePending = {
    mode: 'full' | 'line'
    headerId: number
    detailId: number
    header: ExpenseHeader
}

const showDeleteLineConfirm = ref(false)
const deleteLinePending = ref<DeleteLinePending | null>(null)
const deleteLineExecuting = ref(false)

function closeDeleteLineConfirm() {
    if (deleteLineExecuting.value) return
    showDeleteLineConfirm.value = false
    deleteLinePending.value = null
}

function onDeleteLineDialogUpdate(open: boolean) {
    if (!open) closeDeleteLineConfirm()
}

const handleDeleteDetailLine = async (payload: { headerId: number; detailId: number }) => {
    const { headerId, detailId } = payload
    try {
        const header = normalizeExpense(await expenseHeaderApi.getExpenseHeaderById(headerId))
        const line = header.expenseDetails.find(d => d.id === detailId)
        if (!line) {
            error('Línea no encontrada', 'Recarga la lista e inténtalo de nuevo.')
            return
        }

        deleteLinePending.value = {
            mode: header.expenseDetails.length === 1 ? 'full' : 'line',
            headerId,
            detailId,
            header,
        }
        showDeleteLineConfirm.value = true
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        error('Error al cargar el gasto', msg)
    }
}

const confirmDeleteDetailLine = async () => {
    const pending = deleteLinePending.value
    if (!pending) return

    const { headerId, detailId, header, mode } = pending
    deleteLineExecuting.value = true
    try {
        if (mode === 'full') {
            await expenseHeaderApi.deleteExpenseHeader(headerId)
            success('Factura eliminada', 5000, 'Se eliminó el gasto completo.')
            expenses.value = expenses.value.filter(e => e.id !== headerId)
            totalCount.value = Math.max(0, totalCount.value - 1)
            if (selectedExpense.value?.id === headerId) {
                closeDetailModal()
            }
        } else {
            const remaining = header.expenseDetails.filter(d => d.id !== detailId)
            const includeVat = Number(header.vatAmount ?? 0) > 0.01
            const updatePayload: UpdateExpenseHeaderDto = {
                includeVat,
                notes: header.notes ?? null,
                expenseDetails: remaining.map(d => {
                    const lineNotes = (d.notes || '').trim()
                    return {
                        id: d.id,
                        expenseId: d.expenseId,
                        quantity: d.quantity,
                        amount: Math.round(Number(d.amount)),
                        total: d.total != null ? Number(d.total) : undefined,
                        ...(lineNotes ? { notes: lineNotes.slice(0, 1000) } : { notes: null }),
                    }
                }),
            }

            const updated = normalizeExpense(await expenseHeaderApi.updateExpenseHeader(headerId, updatePayload))
            success('Línea eliminada', 5000, 'Se actualizó la factura.')

            const idx = expenses.value.findIndex(e => e.id === headerId)
            if (idx !== -1) {
                const next = [...expenses.value]
                next[idx] = updated
                expenses.value = next
            }
            if (selectedExpense.value?.id === headerId) {
                selectedExpense.value = updated
            }
        }
        showDeleteLineConfirm.value = false
        deleteLinePending.value = null
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        error('Error al eliminar', msg)
    } finally {
        deleteLineExecuting.value = false
    }
}

const openCreateModal = () => {
    editingExpense.value = null
    formFocusDetailId.value = null
    showFormModal.value = true
}

const closeDetailModal = () => {
    showDetailModal.value = false
    selectedExpense.value = null
}

const closeFormModal = () => {
    showFormModal.value = false
    editingExpense.value = null
    formFocusDetailId.value = null
}

const handleSubmitExpense = (expense: ExpenseHeader) => {
    const enrichedExpense = normalizeExpense(expense)

    const index = expenses.value.findIndex(e => e.id === enrichedExpense.id)
    if (index !== -1) {
        const updatedExpenses = [...expenses.value]
        updatedExpenses.splice(index, 1, enrichedExpense)
        expenses.value = updatedExpenses
    } else {
        expenses.value = [enrichedExpense, ...expenses.value]
        totalCount.value++
    }

    if (selectedExpense.value?.id === enrichedExpense.id) {
        selectedExpense.value = enrichedExpense
    }

    closeFormModal()
    success('Gasto guardado', 5000, 'El gasto se guardó exitosamente')
}

onMounted(() => {
    if (!dateFilters.value.fromDate && !dateFilters.value.toDate) {
        const r = presetToExpenseApiDateRange(presetId.value, new Date(), customRange.value)
        dateFilters.value = { fromDate: r.fromDate, toDate: r.toDate }
    }
    fetchExpenses()
})
</script>
