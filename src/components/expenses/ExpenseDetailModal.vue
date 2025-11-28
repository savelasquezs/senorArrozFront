<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="`Detalle de Gasto #${expense?.id || ''}`" size="4xl">
        <div v-if="expense" class="space-y-6">
            <!-- Información del Header -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600 font-medium">Proveedor</p>
                    <p class="text-lg font-bold text-gray-900">{{ expense.supplierName }}</p>
                    <p v-if="expense.supplierPhone" class="text-sm text-gray-500 mt-1">{{ expense.supplierPhone }}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600 font-medium">Total</p>
                    <p class="text-lg font-bold text-emerald-600">{{ formatCurrency(expense.total || 0) }}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600 font-medium">Creado por</p>
                    <p class="text-lg font-semibold text-gray-900">{{ expense.createdByName }}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm text-gray-600 font-medium">Fecha</p>
                    <p class="text-lg font-semibold text-gray-900">{{ formatDate(expense.createdAt) }}</p>
                    <p class="text-sm text-gray-500">{{ formatTime(expense.createdAt) }}</p>
                </div>
            </div>

            <!-- Lista de Detalles -->
            <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Detalles del Gasto</h4>
                <div class="border rounded-lg overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gasto</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Unit.
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="detail in expense.expenseDetails" :key="detail.id">
                                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {{ detail.expenseName }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    <span
                                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                        {{ detail.expenseCategoryName }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {{ detail.quantity }} {{ detail.expenseUnit }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {{ formatCurrency(detail.amount) }}
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {{ formatCurrency((detail.total || detail.quantity * detail.amount)) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Pagos Bancarios -->
            <div>
                <h4 class="text-sm font-semibold text-gray-700 mb-3">Métodos de Pago</h4>
                <div class="space-y-2">
                    <div v-for="payment in expense.expenseBankPayments" :key="payment.id"
                        class="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                        <div class="flex items-center space-x-2">
                            <BanknotesIcon class="w-5 h-5 text-blue-600" />
                            <span class="font-medium text-blue-900">{{ payment.bankName }}</span>
                        </div>
                        <span class="text-sm font-semibold text-blue-700">{{ formatCurrency(payment.amount) }}</span>
                    </div>
                    <!-- Efectivo -->
                    <div v-if="expense.expenseBankPayments.length === 0"
                        class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <span class="text-sm text-gray-600 italic">Efectivo</span>
                        <span class="text-sm font-semibold text-gray-700">{{ formatCurrency(expense.total || 0)
                        }}</span>
                    </div>
                    <!-- Diferencia en efectivo si hay pagos bancarios -->
                    <div v-else-if="totalBankPayments < (expense.total || 0)"
                        class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <span class="text-sm text-gray-600 italic">Efectivo</span>
                        <span class="text-sm font-semibold text-gray-700">
                            {{ formatCurrency((expense.total || 0) - totalBankPayments) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div v-else-if="loading" class="flex justify-center items-center py-12">
            <BaseLoading size="lg" />
        </div>

        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">
                Cerrar
            </BaseButton>
            <BaseButton v-if="expense" @click="$emit('edit')" variant="primary">
                Editar
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExpenseHeader } from '@/types/expense'
import { useFormatting } from '@/composables/useFormatting'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { BanknotesIcon } from '@heroicons/vue/24/outline'

interface Props {
    isOpen: boolean
    expense: ExpenseHeader | null
    loading?: boolean
}

const props = defineProps<Props>()

defineEmits<{
    'close': []
    'edit': []
}>()

const { formatCurrency } = useFormatting()

const totalBankPayments = computed(() => {
    if (!props.expense) return 0
    return props.expense.expenseBankPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
})

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
