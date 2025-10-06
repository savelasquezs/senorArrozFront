<template>
    <div class="payment-selector p-4 border-b border-gray-200">
        <h4 class="text-md font-medium text-gray-900 mb-4">Métodos de Pago</h4>

        <!-- App Payment Section -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Pago por APP</label>
                <BaseBadge type="info" size="sm">Máximo 1</BaseBadge>
            </div>

            <div v-if="order.appPayments.length === 0" class="flex space-x-2">
                <BaseSelect v-model="selectedAppId" :options="appOptions" placeholder="Seleccionar app..." size="sm"
                    class="flex-1" />
                <button @click="addAppPayment" :disabled="!selectedAppId"
                    class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Agregar
                </button>
            </div>

            <!-- Existing App Payment -->
            <div v-for="payment in order.appPayments" :key="payment.id"
                class="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div class="flex items-center">
                    <DevicePhoneMobileIcon class="w-4 h-4 text-blue-600 mr-2" />
                    <div>
                        <div class="text-sm font-medium text-blue-900">{{ payment.appName }}</div>
                        <div class="text-xs text-blue-600">{{ formatCurrency(payment.amount) }}</div>
                    </div>
                </div>
                <BaseButton @click="updateAppPaymentAmount(payment.id)" variant="outline" size="sm">
                    Editar
                </BaseButton>
            </div>
        </div>

        <!-- Bank Payment Section -->
        <div class="mt-6 space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Pagos Bancarios</label>
                <BaseBadge type="neutral" size="sm">Múltiples</BaseBadge>
            </div>

            <div class="flex space-x-2">
                <BaseSelect v-model="selectedBankId" :options="bankOptions" placeholder="Seleccionar banco..." size="sm"
                    class="flex-1" />
                <button @click="addBankPayment" :disabled="!selectedBankId"
                    class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Agregar
                </button>
            </div>

            <!-- Existing Bank Payments -->
            <div v-for="payment in order.bankPayments" :key="payment.id"
                class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center">
                    <BuildingLibraryIcon class="w-4 h-4 text-green-600 mr-2" />
                    <div>
                        <div class="text-sm font-medium text-green-900">{{ payment.bankName }}</div>
                        <div class="text-xs text-green-600">{{ formatCurrency(payment.amount) }}</div>
                    </div>
                </div>
                <BaseButton @click="removeBankPayment(payment.id)" variant="outline" size="sm"
                    class="text-red-600 hover:text-red-700">
                    <TrashIcon class="w-3 h-3" />
                </BaseButton>
            </div>
        </div>

        <!-- Payment Summary -->
        <div v-if="hasPayments" class="mt-4 p-3 bg-gray-50 rounded-lg">
            <div class="flex justify-between text-sm">
                <span>Total Pagos:</span>
                <span class="font-medium">{{ formatCurrency(totalPayments) }}</span>
            </div>
            <div class="flex justify-between text-sm mt-1">
                <span>Total Pedido:</span>
                <span class="font-medium">{{ formatCurrency(order.total) }}</span>
            </div>
            <div class="flex justify-between text-lg font-semibold mt-2 pt-2 border-t border-gray-200">
                <span>Diferencia:</span>
                <span :class="paymentDifference >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(Math.abs(paymentDifference)) }}
                    {{ paymentDifference >= 0 ? '(Cambio)' : '(Falta)' }}
                </span>
            </div>
        </div>

        <!-- Payment Amount Modal -->
        <BaseDialog v-model="showAmountModal" title="Ingresar Monto" size="md">
            <div v-if="editingPayment" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        {{ editingPayment.type }} - {{ editingPayment.name }}
                    </label>
                    <BaseInput v-model.number="paymentAmount" type="number" placeholder="0" size="lg" class="text-xl" />
                </div>

                <div class="flex justify-end space-x-3">
                    <BaseButton @click="closeAmountModal" variant="outline">
                        Cancelar
                    </BaseButton>
                    <BaseButton @click="savePaymentAmount" variant="primary">
                        Guardar
                    </BaseButton>
                </div>
            </div>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdersStore } from '@/store/orders'
import type { ActiveOrder } from '@/types/order'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

// Icons
import {
    DevicePhoneMobileIcon,
    BuildingLibraryIcon,
    TrashIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    order: ActiveOrder
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
    paymentUpdated: [order: ActiveOrder]
}>()

// Composables
const ordersStore = useOrdersStore()

// State
const selectedAppId = ref<number | null>(null)
const selectedBankId = ref<number | null>(null)
const showAmountModal = ref(false)
const paymentAmount = ref(0)
const editingPayment = ref<{
    id: string
    type: 'app' | 'bank'
    name: string
} | null>(null)

// Computed
const appOptions = computed(() => {
    const usedAppIds = props.order.appPayments.map(p => p.appId)
    return ordersStore.apps
        .filter(app => app.active && !usedAppIds.includes(app.id))
        .map(app => ({ value: app.id, label: app.name }))
})

const bankOptions = computed(() => {
    return ordersStore.banks
        .filter(bank => bank.active)
        .map(bank => ({ value: bank.id, label: bank.name }))
})

const hasPayments = computed(() => {
    return props.order.appPayments.length > 0 || props.order.bankPayments.length > 0
})

const totalPayments = computed(() => {
    const appTotal = props.order.appPayments.reduce((sum, p) => sum + p.amount, 0)
    const bankTotal = props.order.bankPayments.reduce((sum, p) => sum + p.amount, 0)
    return appTotal + bankTotal
})

const paymentDifference = computed(() => {
    return totalPayments.value - props.order.total
})

// Methods
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

const addAppPayment = () => {
    if (!selectedAppId.value) return

    const maxAmount = props.order.total - totalPayments.value
    editingPayment.value = {
        id: `app-${selectedAppId.value}`,
        type: 'app',
        name: ordersStore.apps.find(app => app.id === selectedAppId.value)?.name || ''
    }
    paymentAmount.value = Math.max(0, maxAmount > 0 ? maxAmount : props.order.total)
    showAmountModal.value = true
}

const addBankPayment = () => {
    if (!selectedBankId.value) return

    const maxAmount = props.order.total - totalPayments.value
    editingPayment.value = {
        id: `bank-${selectedBankId.value}`,
        type: 'bank',
        name: ordersStore.banks.find(bank => bank.id === selectedBankId.value)?.name || ''
    }
    paymentAmount.value = Math.max(0, maxAmount > 0 ? maxAmount : props.order.total)
    showAmountModal.value = true
}

const updateAppPaymentAmount = (paymentId: string) => {
    const payment = props.order.appPayments.find(p => p.id === paymentId)
    if (!payment) return

    editingPayment.value = {
        id: paymentId,
        type: 'app',
        name: payment.appName || ''
    }
    paymentAmount.value = payment.amount
    showAmountModal.value = true
}

const removeBankPayment = (paymentId: string) => {
    ordersStore.removeBankPayment(paymentId)
    emit('paymentUpdated', props.order)
}

const savePaymentAmount = () => {
    if (!editingPayment.value || paymentAmount.value <= 0) return

    if (editingPayment.value.type === 'app') {
        ordersStore.addAppPayment(paymentAmount.value, paymentAmount.value)
    } else if (editingPayment.value.type === 'bank') {
        ordersStore.addBankPayment(paymentAmount.value, paymentAmount.value)
    }

    // Reset selections
    selectedAppId.value = null
    selectedBankId.value = null

    closeAmountModal()
    emit('paymentUpdated', props.order)
}

const closeAmountModal = () => {
    showAmountModal.value = false
    editingPayment.value = null
    paymentAmount.value = 0
}
</script>

<style scoped>
/* Custom styles if needed */
</style>
