<template>
    <div class="space-y-6">
        <!-- App Payment Section -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Pago por APP (máx. 1)</label>
                <BaseButton v-if="canEdit && !hasAppPayment && canAddPayments" size="sm" variant="secondary"
                    @click="handleAddAppPayment">
                    <PlusIcon class="w-4 h-4 mr-1" />
                    Agregar
                </BaseButton>
            </div>

            <div v-if="!hasAppPayment" class="text-center py-4 text-gray-500 text-sm">
                No hay pagos por app
            </div>

            <!-- Existing App Payment -->
            <div v-else class="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div class="flex items-center gap-3">
                    <DevicePhoneMobileIcon class="w-5 h-5 text-blue-600" />
                    <div>
                        <div class="text-sm font-medium text-blue-900">{{ appPayments[0].appName }}</div>
                        <div class="text-sm text-blue-600">{{ formatCurrency(appPayments[0].amount) }}</div>
                    </div>
                </div>
                <div v-if="canEdit" class="flex gap-1">
                    <BaseButton @click="handleEditAppPayment(appPayments[0])" variant="ghost" size="sm">
                        <PencilIcon class="w-4 h-4" />
                    </BaseButton>
                    <BaseButton @click="handleRemoveAppPayment(appPayments[0].id)" variant="ghost" size="sm"
                        class="text-red-600">
                        <TrashIcon class="w-4 h-4" />
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Bank Payment Section -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Pagos Bancarios (múltiples)</label>
                <BaseButton v-if="canEdit && canAddPayments" size="sm" variant="secondary"
                    @click="handleAddBankPayment">
                    <PlusIcon class="w-4 h-4 mr-1" />
                    Agregar
                </BaseButton>
            </div>

            <div v-if="bankPayments.length === 0" class="text-center py-4 text-gray-500 text-sm">
                No hay pagos bancarios
            </div>

            <!-- Existing Bank Payments -->
            <div v-for="payment in bankPayments" :key="payment.id"
                class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center gap-3">
                    <BuildingLibraryIcon class="w-5 h-5 text-green-600" />
                    <div>
                        <div class="text-sm font-medium text-green-900">{{ payment.bankName }}</div>
                        <div class="text-sm text-green-600">{{ formatCurrency(payment.amount) }}</div>
                    </div>
                </div>
                <div v-if="canEdit" class="flex gap-1">
                    <BaseButton @click="handleEditBankPayment(payment)" variant="ghost" size="sm">
                        <PencilIcon class="w-4 h-4" />
                    </BaseButton>
                    <BaseButton @click="handleRemoveBankPayment(payment.id)" variant="ghost" size="sm"
                        class="text-red-600">
                        <TrashIcon class="w-4 h-4" />
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Payment Summary -->
        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Total Pagos:</span>
                <span class="font-medium">{{ formatCurrency(totalPayments) }}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Total Pedido:</span>
                <span class="font-medium">{{ formatCurrency(total) }}</span>
            </div>
            <div class="flex justify-between font-semibold pt-2 border-t border-gray-200">
                <span>Efectivo:</span>
                <span class="text-emerald-600">{{ formatCurrency(cashAmount) }}</span>
            </div>
        </div>

        <!-- Total Covered Indicator -->
        <div v-if="!canAddPayments && (bankPayments.length > 0 || appPayments.length > 0)"
            class="text-sm text-emerald-600 font-medium text-center">
            ✓ Total cubierto
        </div>

        <!-- Modales -->
        <!-- Modal para agregar/editar App Payment -->
        <BaseDialog v-model="showAppModal" :title="editingAppPayment ? 'Editar Pago por App' : 'Agregar Pago por App'"
            size="sm">
            <div class="space-y-4">
                <div v-if="!editingAppPayment">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar App</label>
                    <BaseSelect v-model="selectedAppId" :options="appOptions" placeholder="Seleccionar app..."
                        value-key="value" display-key="label" />
                </div>

                <div v-if="selectedAppId || editingAppPayment">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Monto (Máx: {{ formatCurrency(maxPaymentAmount) }})
                    </label>
                    <BaseInput v-model.number="paymentAmount" type="number" :max="maxPaymentAmount" placeholder="0"
                        size="lg" autofocus />
                </div>
            </div>

            <template #footer>
                <BaseButton @click="closeAppModal" variant="secondary" size="sm">
                    Cancelar
                </BaseButton>
                <BaseButton @click="saveAppPayment" variant="primary" size="sm"
                    :disabled="!selectedAppId && !editingAppPayment">
                    Guardar
                </BaseButton>
            </template>
        </BaseDialog>

        <!-- Modal para agregar/editar Bank Payment -->
        <BaseDialog v-model="showBankModal"
            :title="editingBankPayment ? 'Editar Pago Bancario' : 'Agregar Pago Bancario'" size="sm">
            <div class="space-y-4">
                <div v-if="!editingBankPayment">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Banco</label>
                    <BaseSelect v-model="selectedBankId" :options="bankOptions" placeholder="Seleccionar banco..."
                        value-key="value" display-key="label" />
                </div>

                <div v-if="selectedBankId || editingBankPayment">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Monto (Máx: {{ formatCurrency(maxPaymentAmount) }})
                    </label>
                    <BaseInput v-model.number="paymentAmount" type="number" :max="maxPaymentAmount" placeholder="0"
                        size="lg" autofocus />
                </div>
            </div>

            <template #footer>
                <BaseButton @click="closeBankModal" variant="secondary" size="sm">
                    Cancelar
                </BaseButton>
                <BaseButton @click="saveBankPayment" variant="primary" size="sm"
                    :disabled="!selectedBankId && !editingBankPayment">
                    Guardar
                </BaseButton>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFormatting } from '@/composables/useFormatting'
import type { OrderBankPaymentDetail, OrderAppPaymentDetail } from '@/types/order'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import {
    DevicePhoneMobileIcon,
    BuildingLibraryIcon,
    TrashIcon,
    PencilIcon,
    PlusIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    bankPayments: OrderBankPaymentDetail[]
    appPayments: OrderAppPaymentDetail[]
    total: number
    totalPayments: number
    cashAmount: number
    canAddPayments: boolean
    canEdit: boolean
    bankOptions: { value: number; label: string }[]
    appOptions: { value: number; label: string }[]
    suggestedAmount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'add-app-payment': [appId: number, amount: number]
    'update-app-payment': [paymentId: number, amount: number]
    'remove-app-payment': [paymentId: number]
    'add-bank-payment': [bankId: number, amount: number]
    'update-bank-payment': [paymentId: number, amount: number]
    'remove-bank-payment': [paymentId: number]
}>()

const { formatCurrency } = useFormatting()

// State
const showAppModal = ref(false)
const showBankModal = ref(false)
const selectedAppId = ref<number | null>(null)
const selectedBankId = ref<number | null>(null)
const paymentAmount = ref(0)
const editingAppPayment = ref<OrderAppPaymentDetail | null>(null)
const editingBankPayment = ref<OrderBankPaymentDetail | null>(null)

// Computed
const hasAppPayment = computed(() => props.appPayments.length > 0)

const maxPaymentAmount = computed(() => {
    // Si estamos editando, excluir el monto actual
    if (editingAppPayment.value) {
        return props.total - props.totalPayments + editingAppPayment.value.amount
    }
    if (editingBankPayment.value) {
        return props.total - props.totalPayments + editingBankPayment.value.amount
    }
    return props.cashAmount
})

// Methods - App Payments
const handleAddAppPayment = () => {
    paymentAmount.value = props.suggestedAmount
    showAppModal.value = true
}

const handleEditAppPayment = (payment: OrderAppPaymentDetail) => {
    editingAppPayment.value = payment
    paymentAmount.value = payment.amount
    showAppModal.value = true
}

const handleRemoveAppPayment = (paymentId: number) => {
    emit('remove-app-payment', paymentId)
}

const saveAppPayment = () => {
    if (editingAppPayment.value) {
        emit('update-app-payment', editingAppPayment.value.id, paymentAmount.value)
    } else if (selectedAppId.value) {
        emit('add-app-payment', selectedAppId.value, paymentAmount.value)
    }
    closeAppModal()
}

const closeAppModal = () => {
    showAppModal.value = false
    selectedAppId.value = null
    editingAppPayment.value = null
    paymentAmount.value = 0
}

// Methods - Bank Payments
const handleAddBankPayment = () => {
    paymentAmount.value = props.suggestedAmount
    showBankModal.value = true
}

const handleEditBankPayment = (payment: OrderBankPaymentDetail) => {
    editingBankPayment.value = payment
    paymentAmount.value = payment.amount
    showBankModal.value = true
}

const handleRemoveBankPayment = (paymentId: number) => {
    emit('remove-bank-payment', paymentId)
}

const saveBankPayment = () => {
    if (editingBankPayment.value) {
        emit('update-bank-payment', editingBankPayment.value.id, paymentAmount.value)
    } else if (selectedBankId.value) {
        emit('add-bank-payment', selectedBankId.value, paymentAmount.value)
    }
    closeBankModal()
}

const closeBankModal = () => {
    showBankModal.value = false
    selectedBankId.value = null
    editingBankPayment.value = null
    paymentAmount.value = 0
}
</script>
