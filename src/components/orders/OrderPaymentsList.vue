<template>
    <div class="space-y-6">
        <!-- Bank Payments -->
        <div>
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">Pagos Bancarios</h3>
                <BaseButton v-if="canEdit" size="sm" variant="secondary" @click="$emit('add-bank-payment')">
                    <PlusIcon class="w-4 h-4 mr-1" />
                    Agregar
                </BaseButton>
            </div>

            <div v-if="bankPayments.length === 0" class="text-center py-8 text-gray-500">
                No hay pagos bancarios registrados
            </div>

            <div v-else class="space-y-3">
                <div v-for="payment in bankPayments" :key="payment.id"
                    class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3">
                            <BanknotesIcon class="w-5 h-5 text-gray-400" />
                            <div>
                                <p class="text-sm font-medium text-gray-900">{{ payment.bankName }}</p>
                                <p class="text-sm text-gray-500">{{ formatCurrency(payment.amount) }}</p>
                            </div>
                        </div>
                        <div v-if="payment.isVerified" class="mt-2 text-xs text-gray-500">
                            Verificado: {{ formatDateTime(payment.verifiedAt!) }}
                        </div>
                    </div>

                    <div class="flex items-center space-x-2">
                        <!-- Badge de estado -->
                        <span :class="[
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            payment.isVerified
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        ]">
                            <component :is="payment.isVerified ? CheckCircleIcon : XCircleIcon" class="w-3 h-3 mr-1" />
                            {{ payment.isVerified ? 'Verificado' : 'Pendiente' }}
                        </span>

                        <!-- Botones de acción (solo Admin/Superadmin) -->
                        <div v-if="canVerify" class="flex space-x-1">
                            <button v-if="!payment.isVerified" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Verificar pago" @click="$emit('verify-payment', payment.id)">
                                <CheckIcon class="w-4 h-4" />
                            </button>
                            <button v-else class="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Desverificar pago"
                                @click="$emit('unverify-payment', payment.id)">
                                <XMarkIcon class="w-4 h-4" />
                            </button>
                            <button v-if="canEdit" class="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Editar monto" @click="$emit('edit-bank-payment', payment)">
                                <PencilIcon class="w-4 h-4" />
                            </button>
                            <button v-if="canEdit" class="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar pago" @click="$emit('delete-bank-payment', payment.id)">
                                <TrashIcon class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- App Payments -->
        <div>
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">Pagos por App</h3>
                <BaseButton v-if="canEdit" size="sm" variant="secondary" @click="$emit('add-app-payment')">
                    <PlusIcon class="w-4 h-4 mr-1" />
                    Agregar
                </BaseButton>
            </div>

            <div v-if="appPayments.length === 0" class="text-center py-8 text-gray-500">
                No hay pagos por app registrados
            </div>

            <div v-else class="space-y-3">
                <div v-for="payment in appPayments" :key="payment.id"
                    class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3">
                            <DevicePhoneMobileIcon class="w-5 h-5 text-gray-400" />
                            <div>
                                <p class="text-sm font-medium text-gray-900">{{ payment.appName }}</p>
                                <p class="text-sm text-gray-500">{{ formatCurrency(payment.amount) }}</p>
                            </div>
                        </div>
                        <div v-if="payment.isSettled" class="mt-2 text-xs text-gray-500">
                            Liquidado: {{ formatDateTime(payment.settledAt!) }}
                        </div>
                    </div>

                    <div class="flex items-center space-x-2">
                        <!-- Badge de estado -->
                        <span :class="[
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            payment.isSettled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        ]">
                            <component :is="payment.isSettled ? CheckCircleIcon : XCircleIcon" class="w-3 h-3 mr-1" />
                            {{ payment.isSettled ? 'Liquidado' : 'Pendiente' }}
                        </span>

                        <!-- Botones de acción (solo Admin/Superadmin) -->
                        <div v-if="canSettle" class="flex space-x-1">
                            <button v-if="!payment.isSettled" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Liquidar pago" @click="$emit('settle-payment', payment.id)">
                                <CheckIcon class="w-4 h-4" />
                            </button>
                            <button v-else class="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Desliquidar pago"
                                @click="$emit('unsettle-payment', payment.id)">
                                <XMarkIcon class="w-4 h-4" />
                            </button>
                            <button v-if="canEdit" class="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Editar monto" @click="$emit('edit-app-payment', payment)">
                                <PencilIcon class="w-4 h-4" />
                            </button>
                            <button v-if="canEdit" class="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar pago" @click="$emit('delete-app-payment', payment.id)">
                                <TrashIcon class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cálculo de Efectivo -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-emerald-700">Efectivo</p>
                    <p class="text-xs text-emerald-600 mt-1">
                        Total - (Pagos bancarios + Pagos app)
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-emerald-700">
                        {{ formatCurrency(cashAmount) }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderBankPaymentDetail, OrderAppPaymentDetail } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    PlusIcon,
    BanknotesIcon,
    DevicePhoneMobileIcon,
    CheckCircleIcon,
    XCircleIcon,
    CheckIcon,
    XMarkIcon,
    PencilIcon,
    TrashIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    bankPayments: OrderBankPaymentDetail[]
    appPayments: OrderAppPaymentDetail[]
    total: number
    canEdit: boolean
}

const props = defineProps<Props>()

defineEmits<{
    'add-bank-payment': []
    'verify-payment': [id: number]
    'unverify-payment': [id: number]
    'edit-bank-payment': [payment: OrderBankPaymentDetail]
    'delete-bank-payment': [id: number]
    'add-app-payment': []
    'settle-payment': [id: number]
    'unsettle-payment': [id: number]
    'edit-app-payment': [payment: OrderAppPaymentDetail]
    'delete-app-payment': [id: number]
}>()

const { formatCurrency, formatDateTime } = useFormatting()
const { canVerifyPayments, canSettleAppPayments } = useOrderPermissions()

// Computed
const canVerify = computed(() => canVerifyPayments())
const canSettle = computed(() => canSettleAppPayments())

const cashAmount = computed(() => {
    const bankTotal = props.bankPayments.reduce((sum, p) => sum + p.amount, 0)
    const appTotal = props.appPayments.reduce((sum, p) => sum + p.amount, 0)
    return props.total - bankTotal - appTotal
})
</script>
