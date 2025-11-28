<template>
    <div class="overflow-hidden bg-white rounded-lg shadow ring-1 ring-black ring-opacity-5">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button class="flex items-center gap-1" @click="$emit('sort', 'id')">
                            ID
                            <SortIcon :active="sortBy === 'id'" :direction="sortOrder" />
                        </button>
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button class="flex items-center gap-1" @click="$emit('sort', 'createdAt')">
                            Fecha
                            <SortIcon :active="sortBy === 'createdAt'" :direction="sortOrder" />
                        </button>
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Proveedor
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categorías
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pago
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button class="flex items-center gap-1" @click="$emit('sort', 'total')">
                            Total
                            <SortIcon :active="sortBy === 'total'" :direction="sortOrder" />
                        </button>
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado por
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <tr v-if="loading">
                    <td colspan="8" class="px-6 py-12 text-center">
                        <BaseLoading text="Cargando gastos..." />
                    </td>
                </tr>
                <tr v-else-if="!expenses.length">
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <CurrencyDollarIcon class="mx-auto h-12 w-12 text-gray-400" />
                        <p class="mt-2 text-lg font-medium">No hay gastos</p>
                        <p class="text-sm">No se encontraron registros con los filtros seleccionados</p>
                    </td>
                </tr>
                <tr v-for="expense in expenses" :key="expense.id" class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        #{{ expense.id }}
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div>{{ formatDate(expense.createdAt) }}</div>
                        <div class="text-xs text-gray-500">{{ formatTime(expense.createdAt) }}</div>
                    </td>
                    <td class="px-4 py-4">
                        <div class="text-sm text-gray-900">{{ expense.supplierName }}</div>
                        <div class="text-xs text-gray-500" v-if="expense.supplierPhone">{{ expense.supplierPhone }}
                        </div>
                    </td>
                    <td class="px-4 py-4">
                        <div class="flex flex-wrap gap-1">
                            <BaseBadge v-for="category in expense.categoryNames" :key="category" size="sm">
                                {{ category }}
                            </BaseBadge>
                        </div>
                    </td>
                    <td class="px-4 py-4">
                        <div class="flex flex-wrap gap-1">
                            <BaseBadge v-if="expense.bankNames.length === 0" size="sm" variant="secondary">
                                Efectivo
                            </BaseBadge>
                            <BaseBadge v-for="bank in expense.bankNames" :key="bank" size="sm">
                                {{ bank }}
                            </BaseBadge>
                        </div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {{ formatCurrency(expense.total ?? calculateTotal(expense)) }}
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {{ expense.createdByName }}
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex justify-end space-x-2">
                            <BaseButton variant="outline" size="sm" @click="$emit('view-detail', expense)">
                                Ver
                            </BaseButton>
                            <BaseButton variant="outline" size="sm" @click="$emit('edit', expense)">
                                Editar
                            </BaseButton>
                            <BaseButton variant="outline" size="sm" class="text-red-600 hover:text-red-700"
                                @click="$emit('delete', expense)">
                                Eliminar
                            </BaseButton>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import type { ExpenseHeader } from '@/types/expense'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { useFormatting } from '@/composables/useFormatting'
import { CurrencyDollarIcon } from '@heroicons/vue/24/outline'
import { defineComponent } from 'vue'

interface Props {
    expenses: ExpenseHeader[]
    loading?: boolean
    sortBy: 'id' | 'total' | 'createdAt'
    sortOrder: 'asc' | 'desc'
}

withDefaults(defineProps<Props>(), {
    expenses: () => [],
    loading: false
})

defineEmits<{
    'view-detail': [expense: ExpenseHeader]
    edit: [expense: ExpenseHeader]
    delete: [expense: ExpenseHeader]
    sort: ['id' | 'total' | 'createdAt']
}>()

const { formatCurrency } = useFormatting()

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

const calculateTotal = (expense: ExpenseHeader) => {
    return expense.expenseDetails.reduce((sum, detail) => {
        const detailTotal = detail.total ?? (detail.amount * detail.quantity)
        return sum + detailTotal
    }, 0)
}

const SortIcon = defineComponent({
    props: {
        active: Boolean,
        direction: {
            type: String as () => 'asc' | 'desc',
            default: 'asc'
        }
    },
    setup(props) {
        return () =>
            props.active
                ? props.direction === 'asc'
                    ? '↑'
                    : '↓'
                : ''
    }
})
</script>
