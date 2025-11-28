<template>
    <MainLayout>
        <!-- Header -->
        <div class="mb-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900">Gastos</h1>
                    <p class="mt-1 text-sm text-gray-500">
                        Gestiona y visualiza todos los gastos del sistema
                    </p>
                </div>
                <div class="flex items-center space-x-3">
                    <BaseButton @click="openCreateModal" variant="primary">
                        <PlusIcon class="w-4 h-4 mr-2" />
                        Nuevo Gasto
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Filtros -->
        <div class="bg-white rounded-lg shadow mb-6">
            <!-- Fila de filtros -->
            <div class="p-4 border-b border-gray-200">
                <div class="flex flex-wrap items-center gap-3">
                    <!-- Rango de fechas -->
                    <div class="flex items-center gap-2">
                        <BaseInput v-model="dateFilters.fromDate" type="date" placeholder="Desde" class="w-36"
                            @change="fetchExpenses" />
                        <span class="text-gray-400">-</span>
                        <BaseInput v-model="dateFilters.toDate" type="date" placeholder="Hasta" class="w-36"
                            @change="fetchExpenses" />
                    </div>

                    <!-- Filtros locales -->
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <!-- Búsqueda por nombre de gasto -->
                        <div class="flex-1 min-w-[200px]">
                            <BaseInput v-model="localFilters.expenseName" placeholder="Buscar por nombre de gasto..."
                                @input="applyLocalFilters">
                                <template #icon>
                                    <MagnifyingGlassIcon class="w-4 h-4" />
                                </template>
                            </BaseInput>
                        </div>

                        <!-- Selector de categorías (multiselect) -->
                        <div class="w-48">
                            <BaseSelect v-model="localFilters.categoryNames" :options="categoryOptions"
                                value-key="value" display-key="label" placeholder="Categorías" multiple
                                @update:model-value="applyLocalFilters" />
                        </div>

                        <!-- Selector de bancos (multiselect) -->
                        <div class="w-48">
                            <BaseSelect v-model="localFilters.bankNames" :options="bankOptions" value-key="value"
                                display-key="label" placeholder="Métodos de Pago" multiple
                                @update:model-value="applyLocalFilters" />
                        </div>

                        <!-- Selector de proveedores (multiselect) -->
                        <div class="w-48">
                            <BaseSelect v-model="localFilters.supplierIds" :options="supplierOptions" value-key="value"
                                display-key="label" placeholder="Proveedores" multiple
                                @update:model-value="applyLocalFilters" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contador de resultados y acciones -->
            <div class="px-4 py-3 bg-gray-50 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                    <span v-if="!loading && filteredExpenses.length > 0">
                        Mostrando <span class="font-medium">{{ filteredExpenses.length }}</span>
                        de <span class="font-medium">{{ totalCount }}</span> gastos
                    </span>
                    <span v-else-if="!loading" class="text-gray-400">
                        No hay gastos
                    </span>
                    <span v-else class="text-gray-400">
                        Cargando...
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Botón limpiar filtros -->
                    <BaseButton v-if="hasActiveFilters" variant="ghost" size="sm" @click="clearFilters">
                        <XMarkIcon class="w-4 h-4 mr-1" />
                        Limpiar filtros
                    </BaseButton>

                    <!-- Botón refrescar -->
                    <BaseButton variant="secondary" size="sm" :loading="loading" @click="fetchExpenses">
                        <ArrowPathIcon class="w-4 h-4" />
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Tabla -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <ExpenseHeadersTable :expenses="filteredExpenses" :loading="loading" :sort-by="sortBy"
                :sort-order="sortOrder" @view-detail="handleViewDetail" @edit="handleEdit" @delete="handleDelete"
                @sort="handleSort" />

            <!-- Paginación -->
            <div v-if="!loading && totalPages > 1" class="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                <div class="flex items-center justify-between">
                    <div class="flex-1 flex justify-between sm:hidden">
                        <BaseButton variant="secondary" size="sm" :disabled="currentPage === 1"
                            @click="changePage(currentPage - 1)">
                            Anterior
                        </BaseButton>
                        <BaseButton variant="secondary" size="sm" :disabled="currentPage === totalPages"
                            @click="changePage(currentPage + 1)">
                            Siguiente
                        </BaseButton>
                    </div>
                    <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p class="text-sm text-gray-700">
                                Mostrando
                                <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span>
                                a
                                <span class="font-medium">{{ Math.min(currentPage * pageSize, totalCount) }}</span>
                                de
                                <span class="font-medium">{{ totalCount }}</span>
                                resultados
                            </p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <BaseSelect v-model="pageSize" :options="pageSizeOptions" label="Por página" class="w-32"
                                @update:model-value="handlePageSizeChange" />
                            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button :disabled="currentPage === 1"
                                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    @click="changePage(currentPage - 1)">
                                    <ChevronLeftIcon class="h-5 w-5" />
                                </button>
                                <button v-for="page in visiblePages" :key="page" :class="[
                                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                                    page === currentPage
                                        ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                                ]" @click="changePage(page)">
                                    {{ page }}
                                </button>
                                <button :disabled="currentPage === totalPages"
                                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    @click="changePage(currentPage + 1)">
                                    <ChevronRightIcon class="h-5 w-5" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modales -->
        <ExpenseDetailModal v-if="showDetailModal && selectedExpense" :is-open="showDetailModal"
            :expense="selectedExpense" :loading="loadingDetail" @close="closeDetailModal"
            @edit="handleEditFromDetail" />

        <ExpenseFormModal v-if="showFormModal" :is-open="showFormModal" :editing-expense="editingExpense"
            :loading="submitting" @close="closeFormModal" @submit="handleSubmitExpense" />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ExpenseHeader } from '@/types/expense'
import { expenseHeaderApi } from '@/services/MainAPI/expenseHeaderApi'
import { useExpenseFilters, type ExpenseFilterState } from '@/composables/useExpenseFilters'
import { useToast } from '@/composables/useToast'
import MainLayout from '@/components/layout/MainLayout.vue'
import ExpenseHeadersTable from '@/components/expenses/ExpenseHeadersTable.vue'
import ExpenseDetailModal from '@/components/expenses/ExpenseDetailModal.vue'
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'

const { applyAllFilters } = useExpenseFilters()
const { success, error } = useToast()

// Estado
const loading = ref(false)
const loadingDetail = ref(false)
const submitting = ref(false)
const expenses = ref<ExpenseHeader[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const sortBy = ref<'id' | 'total' | 'createdAt'>('id')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Filtros de fecha (se envían al backend)
const dateFilters = ref({
    fromDate: '', // Vacío = día actual (manejado por backend)
    toDate: '',
})

// Filtros locales (no se envían al backend)
const localFilters = ref<ExpenseFilterState>({
    categoryNames: [],
    bankNames: [],
    supplierIds: [],
    expenseName: '',
})

// Modales
const showDetailModal = ref(false)
const showFormModal = ref(false)
const selectedExpense = ref<ExpenseHeader | null>(null)
const editingExpense = ref<ExpenseHeader | null>(null)

// Opciones de filtros (se generan desde los datos recibidos)
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

const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
]

// Computed
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
    expenseName: localFilters.value.expenseName || ''
}))

const normalizeExpense = (header: ExpenseHeader): ExpenseHeader => {
    const normalizedDetails = header.expenseDetails.map(detail => {
        const computedTotal = detail.total ?? (detail.amount * detail.quantity)
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
        categoryNames: header.categoryNames.length > 0
            ? header.categoryNames
            : Array.from(new Set(derivedCategories)),
        bankNames: header.bankNames.length > 0
            ? header.bankNames
            : Array.from(new Set(derivedBanks)),
    }
}

const filteredExpenses = computed(() => {
    return applyAllFilters(expenses.value, normalizedFilters.value)
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
        dateFilters.value.fromDate ||
        dateFilters.value.toDate ||
        normalizedFilters.value.categoryNames.length > 0 ||
        normalizedFilters.value.bankNames.length > 0 ||
        normalizedFilters.value.supplierIds.length > 0 ||
        normalizedFilters.value.expenseName.trim()
    )
})

// Métodos
const fetchExpenses = async () => {
    loading.value = true
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
    } catch (err: any) {
        error('Error al cargar gastos', err.message)
    } finally {
        loading.value = false
    }
}

const applyLocalFilters = () => {
    // Los filtros locales se aplican automáticamente en el computed
    // No necesitamos recargar desde el servidor
}

const clearFilters = () => {
    dateFilters.value = {
        fromDate: '',
        toDate: '',
    }
    localFilters.value = {
        categoryNames: [],
        bankNames: [],
        supplierIds: [],
        expenseName: '',
    }
    currentPage.value = 1
    fetchExpenses()
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

const handleSort = (column: 'id' | 'total' | 'createdAt') => {
    if (sortBy.value === column) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortBy.value = column
        sortOrder.value = 'desc'
    }
    fetchExpenses()
}

const handleViewDetail = async (expense: ExpenseHeader) => {
    loadingDetail.value = true
    showDetailModal.value = true
    try {
        const detail = await expenseHeaderApi.getExpenseHeaderById(expense.id)
        selectedExpense.value = normalizeExpense(detail)
    } catch (err: any) {
        error('Error al cargar detalle', err.message)
        showDetailModal.value = false
    } finally {
        loadingDetail.value = false
    }
}

const handleEdit = (expense: ExpenseHeader) => {
    editingExpense.value = expense
    showFormModal.value = true
}

const handleEditFromDetail = () => {
    if (selectedExpense.value) {
        closeDetailModal()
        handleEdit(selectedExpense.value)
    }
}

const handleDelete = async (expense: ExpenseHeader) => {
    if (!confirm(`¿Estás seguro de eliminar el gasto #${expense.id}?`)) {
        return
    }

    try {
        await expenseHeaderApi.deleteExpenseHeader(expense.id)
        success('Gasto eliminado', 5000, 'El gasto se eliminó exitosamente')

        // Actualización optimista
        expenses.value = expenses.value.filter(e => e.id !== expense.id)
        totalCount.value--
    } catch (err: any) {
        error('Error al eliminar', err.message)
    }
}

const openCreateModal = () => {
    editingExpense.value = null
    showFormModal.value = true
}

const closeDetailModal = () => {
    showDetailModal.value = false
    selectedExpense.value = null
}

const closeFormModal = () => {
    showFormModal.value = false
    editingExpense.value = null
}

const handleSubmitExpense = async (expense: ExpenseHeader) => {
    const enrichedExpense = normalizeExpense(expense)

    // Actualización optimista
    const index = expenses.value.findIndex(e => e.id === enrichedExpense.id)
    if (index !== -1) {
        const updatedExpenses = [...expenses.value]
        updatedExpenses.splice(index, 1, enrichedExpense)
        expenses.value = updatedExpenses
    } else {
        // Es nuevo, agregar al inicio
        expenses.value = [enrichedExpense, ...expenses.value]
        totalCount.value++
    }

    if (selectedExpense.value?.id === enrichedExpense.id) {
        selectedExpense.value = enrichedExpense
    }

    closeFormModal()
    success('Gasto guardado', 5000, 'El gasto se guardó exitosamente')
}

// Lifecycle
onMounted(() => {
    fetchExpenses()
})
</script>
