<!-- src/components/AppPaymentSettlement.vue -->
<template>
    <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Liquidación de Pagos</h3>
            <div class="flex space-x-2">
                <BaseButton v-if="selectedPayments.length > 0" @click="settleSelected" variant="primary" size="sm"
                    :loading="isSettling" :icon="CheckIcon">
                    {{ selectedPayments.length === 1 ? 'Liquidar' : `Liquidar ${selectedPayments.length}` }}
                </BaseButton>
                <BaseButton v-if="selectedSettledPayments.length > 0" @click="unsettleSelected" variant="outline"
                    size="sm" :loading="isUnsettling" :icon="XMarkIcon">
                    {{ selectedSettledPayments.length === 1 ? 'Desliquidar' : `Desliquidar
                    ${selectedSettledPayments.length}` }}
                </BaseButton>
            </div>
        </div>

        <!-- Summary -->
        <div v-if="selectedPayments.length > 0 || selectedSettledPayments.length > 0" class="bg-blue-50 p-4 rounded-lg">
            <div class="flex items-center justify-between">
                <div class="text-sm text-blue-800">
                    <span v-if="selectedPayments.length > 0">
                        {{ selectedPayments.length }} pago(s) seleccionado(s) para liquidar
                        <span class="font-semibold">({{ formatCurrency(selectedTotal) }})</span>
                    </span>
                    <span v-if="selectedSettledPayments.length > 0" class="ml-4">
                        {{ selectedSettledPayments.length }} pago(s) seleccionado(s) para desliquidar
                    </span>
                </div>
                <BaseButton @click="clearSelection" variant="outline" size="sm">
                    Limpiar selección
                </BaseButton>
            </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left">
                            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll"
                                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Orden
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            App
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Banco
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="payments.length === 0">
                        <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                            <CreditCardIcon class="mx-auto h-12 w-12 text-gray-400" />
                            <p class="mt-2 text-lg font-medium">No hay pagos</p>
                            <p class="text-sm">No se encontraron pagos con los filtros aplicados</p>
                        </td>
                    </tr>

                    <tr v-for="payment in payments" :key="payment.id" class="hover:bg-gray-50"
                        :class="{ 'bg-blue-50': isSelected(payment.id) }">
                        <!-- Checkbox -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <input type="checkbox" :checked="isSelected(payment.id)"
                                @change="toggleSelection(payment.id)"
                                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                        </td>

                        <!-- Order ID -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">
                                #{{ payment.orderId }}
                            </div>
                        </td>

                        <!-- App -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <DevicePhoneMobileIcon class="h-4 w-4 text-gray-400 mr-2" />
                                <div class="text-sm text-gray-900">{{ payment.appName }}</div>
                            </div>
                        </td>

                        <!-- Bank -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <BuildingLibraryIcon class="h-4 w-4 text-gray-400 mr-2" />
                                <div class="text-sm text-gray-900">{{ payment.bankName }}</div>
                            </div>
                        </td>

                        <!-- Amount -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">
                                {{ formatCurrency(payment.amount) }}
                            </div>
                        </td>

                        <!-- Status -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <BaseBadge :variant="payment.isSetted ? 'success' : 'warning'">
                                {{ payment.isSetted ? 'Liquidado' : 'Pendiente' }}
                            </BaseBadge>
                        </td>

                        <!-- Date -->
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">
                                {{ formatDate(payment.createdAt) }}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from '@/composables/useToast'
import type { AppPayment } from '@/types/bank'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import {
    CheckIcon,
    XMarkIcon,
    CreditCardIcon,
    DevicePhoneMobileIcon,
    BuildingLibraryIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    payments: AppPayment[]
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    settle: [paymentIds: number[]]
    unsettle: [paymentIds: number[]]
}>()

const { success, error: showError } = useToast()

// State
const selectedPaymentIds = ref<number[]>([])
const isSettling = ref(false)
const isUnsettling = ref(false)

// Computed
const isAllSelected = computed(() => {
    return props.payments.length > 0 && selectedPaymentIds.value.length === props.payments.length
})

const selectedPayments = computed(() => {
    return props.payments.filter(payment =>
        selectedPaymentIds.value.includes(payment.id) && !payment.isSetted
    )
})

const selectedSettledPayments = computed(() => {
    return props.payments.filter(payment =>
        selectedPaymentIds.value.includes(payment.id) && payment.isSetted
    )
})

const selectedTotal = computed(() => {
    return selectedPayments.value.reduce((total, payment) => total + payment.amount, 0)
})

// Methods
const isSelected = (paymentId: number) => {
    return selectedPaymentIds.value.includes(paymentId)
}

const toggleSelection = (paymentId: number) => {
    const index = selectedPaymentIds.value.indexOf(paymentId)
    if (index > -1) {
        selectedPaymentIds.value.splice(index, 1)
    } else {
        selectedPaymentIds.value.push(paymentId)
    }
}

const toggleSelectAll = () => {
    if (isAllSelected.value) {
        selectedPaymentIds.value = []
    } else {
        selectedPaymentIds.value = props.payments.map(payment => payment.id)
    }
}

const clearSelection = () => {
    selectedPaymentIds.value = []
}

const settleSelected = async () => {
    if (selectedPayments.value.length === 0) return

    try {
        isSettling.value = true
        const paymentIds = selectedPayments.value.map(p => p.id)

        if (paymentIds.length === 1) {
            emit('settle', paymentIds)
        } else {
            emit('settle', paymentIds)
        }

        clearSelection()
    } catch (error) {
        showError('Error al liquidar pagos', 'No se pudieron liquidar los pagos seleccionados')
    } finally {
        isSettling.value = false
    }
}

const unsettleSelected = async () => {
    if (selectedSettledPayments.value.length === 0) return

    try {
        isUnsettling.value = true
        const paymentIds = selectedSettledPayments.value.map(p => p.id)
        emit('unsettle', paymentIds)
        clearSelection()
    } catch (error) {
        showError('Error al desliquidar pagos', 'No se pudieron desliquidar los pagos seleccionados')
    } finally {
        isUnsettling.value = false
    }
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}
</script>
