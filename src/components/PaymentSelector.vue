<template>
    <div class="payment-selector px-4 py-3 border-b border-gray-200">
        <h4 class="text-sm font-semibold text-gray-900 mb-3">Métodos de Pago</h4>

        <!-- App Payment Section -->
        <div class="space-y-2">
            <label class="text-xs font-medium text-gray-700 uppercase tracking-wide">Pago por APP (máx. 1)</label>

            <div v-if="!order.appPayment" class="flex space-x-1.5">
                <BaseSelect v-model="selectedAppId" :options="appOptions" placeholder="Seleccionar app..." size="sm"
                    class="flex-1 text-xs" value-key="value" display-key="label" :disabled="!canAddPayments" />
                <button @click="handleAddAppPayment" :disabled="!selectedAppId || !canAddPayments"
                    :title="!canAddPayments ? 'Total ya cubierto' : ''"
                    class="px-2.5 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    +
                </button>
            </div>

            <!-- Existing App Payment -->
            <div v-else class="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200">
                <div class="flex items-center gap-2">
                    <DevicePhoneMobileIcon class="w-3.5 h-3.5 text-blue-600" />
                    <div>
                        <div class="text-xs font-medium text-blue-900">{{ order.appPayment.appName }}</div>
                        <div class="text-xs text-blue-600">{{ formatCurrency(order.appPayment.amount) }}</div>
                    </div>
                </div>
                <div class="flex gap-1">
                    <BaseButton @click="handleUpdateAppPayment" variant="ghost" size="sm" class="h-7 px-2">
                        <PencilIcon class="w-3 h-3" />
                    </BaseButton>
                    <BaseButton @click="handleRemoveAppPayment" variant="ghost" size="sm" class="h-7 px-2 text-red-600">
                        <TrashIcon class="w-3 h-3" />
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Bank Payment Section -->
        <div class="mt-4 space-y-2">
            <label class="text-xs font-medium text-gray-700 uppercase tracking-wide">Pagos Bancarios (múltiples)</label>

            <div class="flex space-x-1.5">
                <BaseSelect v-model="selectedBankId" :options="bankOptions" placeholder="Seleccionar banco..." size="sm"
                    class="flex-1 text-xs" value-key="value" display-key="label" :disabled="!canAddPayments" />
                <button @click="handleAddBankPayment" :disabled="!selectedBankId || !canAddPayments"
                    :title="!canAddPayments ? 'Total ya cubierto' : ''"
                    class="px-2.5 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    +
                </button>
            </div>

            <!-- Existing Bank Payments -->
            <div v-for="payment in order.bankPayments" :key="payment.tempId"
                class="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200">
                <div class="flex items-center gap-2">
                    <BuildingLibraryIcon class="w-3.5 h-3.5 text-green-600" />
                    <div>
                        <div class="text-xs font-medium text-green-900">{{ payment.bankName }}</div>
                        <div class="text-xs text-green-600">{{ formatCurrency(payment.amount) }}</div>
                    </div>
                </div>
                <div class="flex gap-1">
                    <BaseButton @click="handleUpdateBankPayment(payment.tempId)" variant="ghost" size="sm"
                        class="h-7 px-2">
                        <PencilIcon class="w-3 h-3" />
                    </BaseButton>
                    <BaseButton @click="handleRemoveBankPayment(payment.tempId)" variant="ghost" size="sm"
                        class="h-7 px-2 text-red-600">
                        <TrashIcon class="w-3 h-3" />
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Payment Summary -->
        <div v-if="hasPayments" class="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs space-y-1">
            <div class="flex justify-between">
                <span class="text-gray-600">Total Pagos:</span>
                <span class="font-medium">{{ formatCurrency(totalPayments) }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600">Total Pedido:</span>
                <span class="font-medium">{{ formatCurrency(order.total) }}</span>
            </div>
            <div class="flex justify-between font-semibold pt-1.5 border-t border-gray-200">
                <span>Efectivo:</span>
                <span class="text-emerald-600">{{ formatCurrency(cashAmount) }}</span>
            </div>
        </div>

        <!-- Total Covered Indicator -->
        <div v-if="!canAddPayments && hasPayments" class="mt-2 text-xs text-emerald-600 font-medium text-center">
            ✓ Total cubierto
        </div>

        <!-- Payment Amount Modal -->
        <BaseDialog v-model="showAmountModal" title="Monto de Pago" size="sm">
            <div v-if="editingPayment" class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1.5">
                        {{ editingPayment.name }} (Máx: {{ formatCurrency(maxPaymentAmount) }})
                    </label>
                    <BaseInput v-model.number="paymentAmount" type="number" :max="maxPaymentAmount" placeholder="0"
                        size="md" class="text-lg" autofocus />
                </div>

                <div class="flex justify-end space-x-2">
                    <BaseButton @click="closeAmountModal" variant="outline" size="sm">
                        Cancelar
                    </BaseButton>
                    <BaseButton @click="savePaymentAmount" variant="primary" size="sm">
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
import { useOrderPayments } from '@/composables/useOrderPayments'
import type { DraftOrder } from '@/types/order'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

// Icons
import {
    DevicePhoneMobileIcon,
    BuildingLibraryIcon,
    TrashIcon,
    PencilIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    order: DraftOrder
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
    paymentUpdated: [order: DraftOrder]
}>()

// Composables
const ordersStore = useOrdersStore()
const payments = useOrderPayments()

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
    // Si ya hay un app payment, no mostrar opciones
    if (props.order.appPayment) {
        return []
    }
    return ordersStore.apps
        .filter(app => app.active)
        .map(app => ({ value: app.id, label: app.name }))
})

const bankOptions = computed(() => {
    return ordersStore.banks
        .filter(bank => bank.active)
        .map(bank => ({ value: bank.id, label: bank.name }))
})

const hasPayments = computed(() => {
    return props.order.appPayment !== null || props.order.bankPayments.length > 0
})

const totalPayments = computed(() => {
    const appTotal = props.order.appPayment ? props.order.appPayment.amount : 0
    const bankTotal = props.order.bankPayments.reduce((sum, p) => sum + p.amount, 0)
    return appTotal + bankTotal
})

const cashAmount = computed(() => {
    const remaining = props.order.total - totalPayments.value
    return Math.max(0, remaining) // Solo valores positivos
})

const canAddPayments = computed(() => {
    return cashAmount.value > 0
})

const maxPaymentAmount = computed(() => {
    if (!editingPayment.value) return props.order.total

    // Si estamos editando, excluir el monto actual del cálculo
    const currentAmount = editingPayment.value.type === 'app' && props.order.appPayment
        ? props.order.appPayment.amount
        : editingPayment.value.type === 'bank'
            ? props.order.bankPayments.find(p => p.tempId === editingPayment.value?.id)?.amount || 0
            : 0

    // Máximo = total - pagos actuales + monto que está editando
    return props.order.total - totalPayments.value + currentAmount
})

// Methods
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

const handleAddAppPayment = () => {
    if (!selectedAppId.value) return

    editingPayment.value = {
        id: `app-new`,
        type: 'app',
        name: ordersStore.apps.find(app => app.id === selectedAppId.value)?.name || ''
    }
    paymentAmount.value = maxPaymentAmount.value
    showAmountModal.value = true
}

const handleAddBankPayment = () => {
    if (!selectedBankId.value) return

    editingPayment.value = {
        id: `bank-new`,
        type: 'bank',
        name: ordersStore.banks.find(bank => bank.id === selectedBankId.value)?.name || ''
    }
    paymentAmount.value = maxPaymentAmount.value
    showAmountModal.value = true
}

const handleUpdateAppPayment = () => {
    const payment = props.order.appPayment
    if (!payment) return

    editingPayment.value = {
        id: payment.tempId,
        type: 'app',
        name: payment.appName || ''
    }
    paymentAmount.value = payment.amount
    showAmountModal.value = true
}

const handleRemoveAppPayment = () => {
    payments.removeAppPayment()
    emit('paymentUpdated', props.order)
}

const handleUpdateBankPayment = (paymentTempId: string) => {
    const payment = props.order.bankPayments.find(p => p.tempId === paymentTempId)
    if (!payment) return

    editingPayment.value = {
        id: payment.tempId,
        type: 'bank',
        name: payment.bankName || ''
    }
    paymentAmount.value = payment.amount
    showAmountModal.value = true
}

const handleRemoveBankPayment = (paymentTempId: string) => {
    payments.removeBankPayment(paymentTempId)
    emit('paymentUpdated', props.order)
}

const savePaymentAmount = () => {
    if (!editingPayment.value || paymentAmount.value <= 0) return

    // Validar que no exceda el máximo permitido
    if (paymentAmount.value > maxPaymentAmount.value) {
        paymentAmount.value = maxPaymentAmount.value
    }

    if (editingPayment.value.type === 'app') {
        if (editingPayment.value.id === 'app-new') {
            // Adding new app payment
            const appId = selectedAppId.value
            if (!appId) return
            payments.addAppPayment(appId, paymentAmount.value)
        } else {
            // Updating existing app payment
            payments.updateAppPayment(paymentAmount.value)
        }
    } else if (editingPayment.value.type === 'bank') {
        if (editingPayment.value.id === 'bank-new') {
            // Adding new bank payment
            const bankId = selectedBankId.value
            if (!bankId) return
            payments.addBankPayment(bankId, paymentAmount.value)
        } else {
            // Updating existing bank payment
            payments.updateBankPayment(editingPayment.value.id, paymentAmount.value)
        }
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
