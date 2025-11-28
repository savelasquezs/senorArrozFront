<!-- src/views/ExpenseCategoriesView.vue -->
<template>
    <MainLayout page-title="Categorías de Gastos">
        <!-- Loading State -->
        <BaseLoading v-if="loading" text="Cargando categorías..." />

        <!-- Content -->
        <div v-else class="space-y-6">
            <!-- Filters Card -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Filtros de búsqueda</h3>
                    <BaseButton @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                        Limpiar filtros
                    </BaseButton>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BaseInput v-model="filters.name" label="Nombre" placeholder="Buscar por nombre"
                        :icon="MagnifyingGlassIcon" />
                    <div class="flex items-end">
                        <BaseButton @click="load" variant="primary" size="md" :icon="MagnifyingGlassIcon" full-width>
                            Buscar
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard title="Total Categorías" :value="list?.totalCount || 0" icon="clipboard" />
                <StatsCard title="Con Gastos" :value="categoriesWithExpenses" icon="currency" />
                <StatsCard title="Sin Gastos" :value="categoriesWithoutExpenses" icon="clipboard" />
            </div>

            <!-- Categories Table -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">
                        Lista de Categorías
                        <span class="text-sm font-normal text-gray-500">
                            ({{ list?.items?.length || 0 }} de {{ list?.totalCount || 0 }})
                        </span>
                    </h3>

                    <BaseButton @click="openCreate" variant="primary" size="sm" :icon="PlusIcon">
                        Nueva Categoría
                    </BaseButton>
                </div>

                <div class="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gastos
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha Creación
                                </th>
                                <th
                                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-if="(list?.items?.length || 0) === 0">
                                <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                                    <TagIcon class="mx-auto h-12 w-12 text-gray-400" />
                                    <p class="mt-2 text-lg font-medium">No hay categorías</p>
                                    <p class="text-sm">No se encontraron categorías con los filtros aplicados</p>
                                </td>
                            </tr>

                            <tr v-for="category in list?.items || []" :key="category.id" class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div
                                                class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <TagIcon class="h-5 w-5 text-blue-600" />
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900">
                                                {{ category.name }}
                                            </div>
                                            <div class="text-sm text-gray-500">
                                                ID: {{ category.id }}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <CurrencyDollarIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ category.totalExpenses }} gastos
                                        </div>
                                    </div>
                                </td>

                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        {{ formatDate(category.createdAt) }}
                                    </div>
                                </td>

                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div class="flex justify-end space-x-2">
                                        <BaseButton @click="openEdit(category)" variant="outline" size="sm"
                                            :icon="PencilIcon" title="Editar categoría">
                                            Editar
                                        </BaseButton>
                                        <BaseButton @click="deleteCategory(category)" variant="outline" size="sm"
                                            :icon="TrashIcon" title="Eliminar categoría"
                                            class="text-red-600 hover:text-red-700">
                                            Eliminar
                                        </BaseButton>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div v-if="list && list.totalPages > 1" class="mt-6 flex items-center justify-between">
                    <div class="text-sm text-gray-700">
                        Mostrando {{ ((list.page - 1) * list.pageSize) + 1 }} a
                        {{ Math.min(list.page * list.pageSize, list.totalCount) }} de {{ list.totalCount }} resultados
                    </div>
                    <div class="flex space-x-2">
                        <BaseButton @click="previousPage" :disabled="!list.hasPreviousPage" variant="outline" size="sm">
                            Anterior
                        </BaseButton>
                        <BaseButton @click="nextPage" :disabled="!list.hasNextPage" variant="outline" size="sm">
                            Siguiente
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>
        </div>

        <!-- Form Modal -->
        <ExpenseCategoryFormModal :is-open="showForm" :editing-category="editingCategory" :loading="formLoading"
            @close="showForm = false" @submit="handleFormSubmit" />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { expenseCategoryApi } from '@/services/MainAPI/expenseCategoryApi'
import { useToast } from '@/composables/useToast'
import type { ExpenseCategory, ExpenseCategoryFilters, CreateExpenseCategoryDto } from '@/types/expense'
import type { PagedResult } from '@/types/common'
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    TagIcon,
    CurrencyDollarIcon,
} from '@heroicons/vue/24/outline'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import ExpenseCategoryFormModal from '@/components/expenses/ExpenseCategoryFormModal.vue'

const { success, error: showError } = useToast()

// State
const loading = ref(false)
const list = ref<PagedResult<ExpenseCategory> | null>(null)

// Filters
const filters = ref({
    name: '',
    page: 1,
    pageSize: 10
})

// Form dialog
const showForm = ref(false)
const editingCategory = ref<ExpenseCategory | null>(null)
const formLoading = ref(false)

// Computed stats
const categoriesWithExpenses = computed(() => {
    return list.value?.items?.filter(c => c.totalExpenses > 0).length || 0
})

const categoriesWithoutExpenses = computed(() => {
    return list.value?.items?.filter(c => c.totalExpenses === 0).length || 0
})

// Methods
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const load = async () => {
    try {
        loading.value = true
        const filtersToSend: ExpenseCategoryFilters = {
            name: filters.value.name || undefined,
            page: filters.value.page || 1,
            pageSize: filters.value.pageSize || 10
        }

        const response = await expenseCategoryApi.getExpenseCategories(filtersToSend)
        if (response.isSuccess && response.data) {
            list.value = response.data
        }
    } catch (e: any) {
        showError('Error al cargar', e.message || 'No se pudieron cargar las categorías')
    } finally {
        loading.value = false
    }
}

const clearFilters = async () => {
    filters.value = {
        name: '',
        page: 1,
        pageSize: 10
    }
    await load()
}

const openCreate = () => {
    editingCategory.value = null
    showForm.value = true
}

const openEdit = (category: ExpenseCategory) => {
    editingCategory.value = category
    showForm.value = true
}

const handleFormSubmit = async (data: CreateExpenseCategoryDto) => {
    try {
        formLoading.value = true

        if (editingCategory.value) {
            await expenseCategoryApi.updateExpenseCategory(editingCategory.value.id, data)
            success('Categoría actualizada', 3000, `La categoría "${data.name}" se ha actualizado correctamente`)
        } else {
            await expenseCategoryApi.createExpenseCategory(data)
            success('Categoría creada', 3000, `La categoría "${data.name}" se ha creado correctamente`)
        }

        showForm.value = false
        await load()
    } catch (e: any) {
        showError('Error al guardar', e.message || 'No se pudo guardar la categoría')
    } finally {
        formLoading.value = false
    }
}

const deleteCategory = async (category: ExpenseCategory) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
        return
    }

    try {
        await expenseCategoryApi.deleteExpenseCategory(category.id)
        success('Categoría eliminada', 3000, `La categoría "${category.name}" se ha eliminado correctamente`)
        await load()
    } catch (e: any) {
        showError('Error al eliminar', e.message || 'No se pudo eliminar la categoría')
    }
}

const previousPage = async () => {
    if (list.value?.hasPreviousPage) {
        filters.value.page = (filters.value.page || 1) - 1
        await load()
    }
}

const nextPage = async () => {
    if (list.value?.hasNextPage) {
        filters.value.page = (filters.value.page || 1) + 1
        await load()
    }
}

onMounted(async () => {
    await load()
})
</script>
