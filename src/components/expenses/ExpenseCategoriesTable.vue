<!-- src/components/expenses/ExpenseCategoriesTable.vue -->
<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">
                Categorías de Gastos
                <span class="text-sm font-normal text-gray-500">({{ list?.totalCount || 0 }})</span>
            </h3>
            <BaseButton @click="$emit('create')" variant="primary" size="sm" :icon="PlusIcon">
                Nueva Categoría
            </BaseButton>
        </div>

        <!-- Table -->
        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoría
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Gastos
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Creación
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="loading">
                        <td colspan="4" class="px-6 py-12 text-center">
                            <BaseLoading text="Cargando categorías..." />
                        </td>
                    </tr>
                    <tr v-else-if="!list?.items?.length">
                        <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                            <TagIcon class="mx-auto h-12 w-12 text-gray-400" />
                            <p class="mt-2 text-lg font-medium">No hay categorías</p>
                            <p class="text-sm">No se encontraron categorías de gastos</p>
                        </td>
                    </tr>
                    <tr v-for="category in list?.items || []" :key="category.id" class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-10 w-10">
                                    <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <TagIcon class="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">{{ category.name }}</div>
                                    <div class="text-sm text-gray-500">ID: {{ category.id }}</div>
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
                            <div class="text-sm text-gray-900">{{ formatDate(category.createdAt) }}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div class="flex justify-end space-x-2">
                                <BaseButton @click="$emit('edit', category)" variant="outline" size="sm"
                                    :icon="PencilIcon">
                                    Editar
                                </BaseButton>
                                <BaseButton @click="$emit('delete', category)" variant="outline" size="sm"
                                    :icon="TrashIcon" class="text-red-600 hover:text-red-700">
                                    Eliminar
                                </BaseButton>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div v-if="list && list.totalPages > 1" class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
                Mostrando {{ ((list.page - 1) * list.pageSize) + 1 }} a
                {{ Math.min(list.page * list.pageSize, list.totalCount) }} de {{ list.totalCount }} resultados
            </div>
            <div class="flex space-x-2">
                <BaseButton @click="$emit('previous-page')" :disabled="!list.hasPreviousPage" variant="outline"
                    size="sm">
                    Anterior
                </BaseButton>
                <BaseButton @click="$emit('next-page')" :disabled="!list.hasNextPage" variant="outline" size="sm">
                    Siguiente
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ExpenseCategory } from '@/types/expense'
import type { PagedResult } from '@/types/common'
import { TagIcon, CurrencyDollarIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

interface Props {
    list: PagedResult<ExpenseCategory> | null
    loading?: boolean
}

withDefaults(defineProps<Props>(), {
    loading: false
})

defineEmits<{
    create: []
    edit: [category: ExpenseCategory]
    delete: [category: ExpenseCategory]
    'previous-page': []
    'next-page': []
}>()

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}
</script>


