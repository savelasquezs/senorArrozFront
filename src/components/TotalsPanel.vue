<template>
    <div class="totals-panel p-4 bg-gray-50 border-t border-gray-200">
        <h4 class="text-md font-medium text-gray-900 mb-3">Resumen del Pedido</h4>

        <div class="space-y-2">
            <!-- Subtotal -->
            <div class="flex justify-between text-sm">
                <span class="text-gray-600">Subtotal:</span>
                <span class="font-medium">{{ formatCurrency(order.subtotal) }}</span>
            </div>

            <!-- Delivery Fee (if applicable) -->
            <div v-if="order.type === 'delivery' && order.deliveryFee" class="flex justify-between text-sm">
                <span class="text-gray-600">Costo de envío:</span>
                <span class="font-medium">{{ formatCurrency(order.deliveryFee) }}</span>
            </div>

            <!-- Loyalty Discount (if applicable) -->
            <div v-if="order.loyaltyRuleId" class="flex justify-between text-sm text-green-600">
                <span>Descuento lealtad:</span>
                <span class="font-medium">- {{ formatCurrency(order.discountTotal) }}</span>
            </div>

            <!-- Items Count -->
            <div class="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-300">
                <span>{{ itemCount }} {{ itemCount === 1 ? 'producto' : 'productos' }}</span>
                <span>{{ itemCount }} {{ itemCount === 1 ? 'unidad' : 'unidades' }}</span>
            </div>

            <!-- Total Highlight -->
            <div class="pt-3 border-t border-gray-300 mt-3">
                <div class="flex justify-between text-lg font-bold">
                    <span class="text-gray-900">Total:</span>
                    <span class="text-indigo-600">{{ formatCurrency(order.total) }}</span>
                </div>
            </div>
        </div>

        <!-- Payment Status -->
        <div v-if="hasPayments" class="mt-4 p-3 rounded-lg" :class="paymentStatusClass">
            <div class="flex items-center mb-2">
                <component :is="paymentStatusIcon" class="w-4 h-4 mr-2" />
                <span class="text-sm font-medium">{{ paymentStatusText }}</span>
            </div>

            <div class="space-y-1">
                <!-- App Payments -->
                <div v-if="order.appPayments.length > 0" class="text-xs">
                    <div class="flex justify-between">
                        <span>App:</span>
                        <span>{{ formatCurrency(appPaymentTotal) }}</span>
                    </div>
                </div>

                <!-- Bank Payments -->
                <div v-if="order.bankPayments.length > 0" class="text-xs">
                    <div class="flex justify-between">
                        <span>Bancarios:</span>
                        <span>{{ formatCurrency(bankPaymentTotal) }}</span>
                    </div>
                </div>

                <!-- Change Due -->
                <div v-if="paymentDifference > 0" class="text-xs font-medium pt-1 border-t border-current">
                    <div class="flex justify-between">
                        <span>Cambio:</span>
                        <span>{{ formatCurrency(paymentDifference) }}</span>
                    </div>
                </div>

                <!-- Outstanding Amount -->
                <div v-if="paymentDifference < 0" class="text-xs font-medium pt-1 border-t border-current">
                    <div class="flex justify-between">
                        <span>Falta:</span>
                        <span>{{ formatCurrency(Math.abs(paymentDifference)) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Order Type Summary -->
        <div v-if="orderSummaryInfo" class="mt-3 p-2 bg-white rounded border text-xs text-gray-600">
            <div class="flex items-center">
                <component :is="orderSummaryInfo.icon" class="w-3 h-3 mr-1" />
                <span>{{ orderSummaryInfo.text }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ActiveOrder } from '@/types/order'

// Icons
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    CurrencyDollarIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    order: ActiveOrder
}

const props = defineProps<Props>()

// Computed
const itemCount = computed(() => {
    return props.order.orderDetails.reduce((sum, item) => sum + item.quantity, 0)
})

const hasPayments = computed(() => {
    return props.order.appPayments.length > 0 || props.order.bankPayments.length > 0
})

const appPaymentTotal = computed(() => {
    return props.order.appPayments.reduce((sum, payment) => sum + payment.amount, 0)
})

const bankPaymentTotal = computed(() => {
    return props.order.bankPayments.reduce((sum, payment) => sum + payment.amount, 0)
})

const totalPayments = computed(() => {
    return appPaymentTotal.value + bankPaymentTotal.value
})

const paymentDifference = computed(() => {
    return totalPayments.value - props.order.total
})

const paymentStatusClass = computed(() => {
    if (!hasPayments.value) return 'bg-gray-100 border border-gray-300'

    if (paymentDifference.value === 0) {
        return 'bg-green-100 border border-green-300 text-green-800'
    } else if (paymentDifference.value > 0) {
        return 'bg-yellow-100 border border-yellow-300 text-yellow-800'
    } else {
        return 'bg-red-100 border border-red-300 text-red-800'
    }
})

const paymentStatusText = computed(() => {
    if (!hasPayments.value) return 'Sin pagos registrados'

    if (paymentDifference.value === 0) {
        return 'Pago completo'
    } else if (paymentDifference.value > 0) {
        return 'Esperando cambio'
    } else {
        return 'Pago insuficiente'
    }
})

const paymentStatusIcon = computed(() => {
    if (!hasPayments.value) return InformationCircleIcon

    if (paymentDifference.value === 0) {
        return CheckCircleIcon
    } else if (paymentDifference.value > 0) {
        return CurrencyDollarIcon
    } else {
        return ExclamationTriangleIcon
    }
})

const orderSummaryInfo = computed(() => {
    switch (props.order.type) {
        case 'onsite':
            return {
                text: 'Pedido para consumo en local',
                icon: 'BuildingStorefrontIcon'
            }
        case 'delivery':
            return {
                text: 'Pedido para entrega a domicilio',
                icon: 'TruckIcon'
            }
        case 'reservation':
            return {
                text: `Reservado para ${props.order.reservedFor ? new Date(props.order.reservedFor).toLocaleString('es-CO') : 'fecha por definir'}`,
                icon: 'CalendarIcon'
            }
        default:
            return null
    }
})

// Methods
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}
</script>

<style scoped>
/* Custom styles if needed */
</style>

