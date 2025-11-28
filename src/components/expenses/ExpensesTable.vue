<template>
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'id')">
                        <div class="flex items-center space-x-1">
                            <span>ID</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'id'" class="w-4 h-4" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-4 h-4" />
                            <ChevronDownIcon v-else class="w-4 h-4" />
                        </div>
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'createdAt')">
                        <div class="flex items-center space-x-1">
                            <span>Fecha</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'createdAt'" class="w-4 h-4" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-4 h-4" />
                            <ChevronDownIcon v-else class="w-4 h-4" />
                        </div>
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Proveedor
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categorías
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'total')">
                        <div class="flex items-center space-x-1">
                            <span>Total</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'total'" class="w-4 h-4" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-4 h-4" />
                            <ChevronDownIcon v-else class="w-4 h-4" />
                        </div>
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Métodos de Pago
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado por
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <tr v-if="loading">
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex justify-center">
                            <BaseLoading size="md" />
                        </div>
                    </td>
                </tr>
                <tr v-else-if="!expenses || expenses.length === 0">
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        No se encontraron gastos
                    </td>
                </tr>
                <tr v-else v-for="expense in expenses" :key="expense.id" class="hover:bg-gray-50 transition-colors">
                    <!-- ID (clickeable para ver detalle) -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button @click="$emit('view-detail', expense)"
                            class="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                            #{{ expense.id }}
                        </button>
                    </td>

                    <!-- Fecha -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-xs text-gray-900">{{ formatDate(expense.createdAt) }}</div>
                        <div class="text-xs text-gray-500">{{ formatTime(expense.createdAt) }}</div>
                    </td>

                    <!-- Proveedor -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">{{ expense.supplierName }}</div>
                        <div v-if="expense.supplierPhone" class="text-xs text-gray-500">
                            {{ expense.supplierPhone }}
                        </div>
                    </td>

                    <!-- Categorías -->
                    <td class="px-6 py-4">
                        <div class="flex flex-wrap gap-1">
                            <span v-for="category in expense.categoryNames" :key="category"
                                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                {{ category }}
                            </span>
                            <span v-if="expense.categoryNames.length === 0" class="text-xs text-gray-400 italic">
                                Sin categorías
                            </span>
                        </div>
                    </td>

                    <!-- Total -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">
                            {{ formatCurrency(expense.total || 0) }}
                        </div>
                    </td>

                    <!-- Métodos de Pago -->
                    <td class="px-6 py-4">
                        <div class="space-y-1">
                            <!-- Bank Payments -->
                            <div v-if="expense.expenseBankPayments && expense.expenseBankPayments.length > 0">
                                <div v-for="payment in expense.expenseBankPayments" :key="payment.id"
                                    class="flex items-center space-x-2 text-xs bg-blue-50 rounded px-2 py-1 mb-1">
                                    <BanknotesIcon class="w-4 h-4 text-blue-600" />
                                    <span class="font-medium text-blue-900">{{ payment.bankName }}</span>
                                    <span class="text-blue-700">{{ formatCurrency(payment.amount) }}</span>
                                </div>
                            </div>
                            <!-- Efectivo -->
                            <span v-if="(!expense.expenseBankPayments || expense.expenseBankPayments.length === 0)"
                                class="text-xs text-gray-500 italic">
                                Efectivo
                            </span>
                        </div>
                    </td>

                    <!-- Creado por -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">{{ expense.createdByName }}</div>
                    </td>

                    <!-- Acciones -->
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex items-center space-x-2">
                            <BaseButton @click="$emit('edit', expense)" variant="ghost" size="sm"
                                class="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                <PencilIcon class="w-4 h-4" />
                            </BaseButton>
                            <BaseButton v-if="canDelete" @click="$emit('delete', expense)" variant="ghost" size="sm"
                                class="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <TrashIcon class="w-4 h-4" />
                            </BaseButton>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExpenseHeader } from '@/types/expense'
import { useAuthStore } from '@/store/auth'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useFormatting } from '@/composables/useFormatting'
import {
    ArrowsUpDownIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    BanknotesIcon,
    PencilIcon,
    TrashIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    expenses: ExpenseHeader[]
    loading?: boolean
    sortBy?: 'id' | 'total' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
}

defineProps<Props>()

defineEmits<{
    'view-detail': [expense: ExpenseHeader]
    'edit': [expense: ExpenseHeader]
    'delete': [expense: ExpenseHeader]
    sort: [column: 'id' | 'total' | 'createdAt']
}>()

const { formatCurrency } = useFormatting()
const authStore = useAuthStore()

const canDelete = computed(() => authStore.isAdmin || authStore.isSuperadmin)

const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}
</script>
