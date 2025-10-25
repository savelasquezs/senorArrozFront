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
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dirección
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
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
                        Pagos
                    </th>
                    <th scope="col"
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Domiciliario
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
                <tr v-else-if="!orders || orders.length === 0">
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        No se encontraron pedidos
                    </td>
                </tr>
                <tr v-else v-for="order in orders" :key="order.id" class="hover:bg-gray-50 transition-colors">
                    <!-- ID (clickeable para ir a detalle) -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <router-link :to="{ name: 'OrderDetail', params: { id: order.id } }"
                            class="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                            #{{ order.id }}
                        </router-link>
                    </td>

                    <!-- Tipo - CLICKEABLE -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button @click.stop="$emit('edit-type', order)"
                            class="hover:opacity-80 transition-opacity cursor-pointer">
                            <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                        </button>
                    </td>

                    <!-- Cliente (clickeable para editar) -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button class="text-left hover:text-emerald-600 transition-colors"
                            @click.stop="$emit('edit-customer', order)">
                            <div v-if="order.customerName || order.guestName"
                                class="text-sm font-medium text-gray-900 hover:underline">
                                {{ order.customerName || order.guestName }}
                            </div>
                            <span v-else class="text-sm text-gray-400 italic hover:underline">Sin cliente</span>
                            <div v-if="order.customerPhone" class="text-sm text-gray-500">
                                {{ order.customerPhone }}
                            </div>
                        </button>
                    </td>

                    <!-- Dirección (clickeable para cambiar) -->
                    <td class="px-6 py-4">
                        <button v-if="order.addressDescription"
                            class="text-left text-sm text-gray-900 hover:text-emerald-600 hover:underline transition-colors max-w-xs truncate"
                            @click.stop="$emit('edit-address', order)">
                            {{ order.addressDescription }}
                        </button>
                        <span v-else class="text-sm text-gray-400 italic">-</span>
                    </td>

                    <!-- Estado (clickeable para cambiar) -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <OrderStatusBadge :status="order.status" :display-name="order.statusDisplayName"
                            :status-time="getStatusTime(order)" :clickable="true"
                            @click="$emit('change-status', order)" />
                    </td>

                    <!-- Total -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">
                            {{ formatCurrency(order.total) }}
                        </div>
                    </td>

                    <!-- Pagos -->
                    <td class="px-6 py-4">
                        <div class="space-y-2">
                            <!-- Bank Payments -->
                            <div v-if="order.bankPayments && order.bankPayments.length > 0" class="space-y-1">
                                <div v-for="payment in order.bankPayments" :key="payment.id"
                                    class="flex items-center justify-between text-xs bg-blue-50 rounded px-2 py-1">
                                    <div class="flex items-center space-x-2">
                                        <BanknotesIcon class="w-4 h-4 text-blue-600" />
                                        <span class="font-medium text-blue-900">{{ payment.bankName }}</span>
                                        <span class="text-blue-700">{{ formatCurrency(payment.amount) }}</span>
                                    </div>
                                    <!-- Botón de verificación -->
                                    <button v-if="canVerifyPayment(order)"
                                        @click.stop="$emit('verify-bank-payment', order, payment)" :class="[
                                            'p-1 rounded transition-colors',
                                            payment.isVerified
                                                ? 'text-green-600 hover:bg-green-100'
                                                : 'text-gray-400 hover:bg-gray-100'
                                        ]" :title="payment.isVerified ? 'Verificado' : 'Verificar pago'">
                                        <CheckCircleIcon v-if="payment.isVerified" class="w-4 h-4" />
                                        <XCircleIcon v-else class="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <!-- App Payments (solo visualización) -->
                            <div v-if="order.appPayments && order.appPayments.length > 0" class="space-y-1">
                                <div v-for="payment in order.appPayments" :key="payment.id"
                                    class="flex items-center space-x-2 text-xs bg-purple-50 rounded px-2 py-1">
                                    <DevicePhoneMobileIcon class="w-4 h-4 text-purple-600" />
                                    <span class="font-medium text-purple-900">{{ payment.appName }}</span>
                                    <span class="text-purple-700">{{ formatCurrency(payment.amount) }}</span>
                                </div>
                            </div>

                            <!-- Sin pagos -->
                            <span v-if="(!order.bankPayments || order.bankPayments.length === 0) &&
                                (!order.appPayments || order.appPayments.length === 0)"
                                class="text-xs text-gray-400 italic">
                                Efectivo
                            </span>
                        </div>
                    </td>

                    <!-- Domiciliario (clickeable para asignar/cambiar) -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button :disabled="!canAssignDeliveryman(order)" :class="[
                            'text-left transition-colors',
                            canAssignDeliveryman(order)
                                ? 'hover:text-emerald-600 cursor-pointer'
                                : 'cursor-not-allowed opacity-50'
                        ]" @click.stop="canAssignDeliveryman(order) && $emit('assign-delivery', order)">
                            <div v-if="order.deliveryManName" class="text-sm text-gray-900"
                                :class="{ 'hover:underline': canAssignDeliveryman(order) }">
                                {{ order.deliveryManName }}
                            </div>
                            <div v-else class="text-sm text-gray-400 italic"
                                :class="{ 'hover:underline': canAssignDeliveryman(order) }">
                                {{ canAssignDeliveryman(order) ? 'Asignar' : 'N/A' }}
                            </div>
                        </button>
                    </td>

                    <!-- Fecha -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-xs text-gray-900">{{ formatDate(order.createdAt) }}</div>
                        <div class="text-xs text-gray-500">{{ formatTime(order.createdAt) }}</div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import type { OrderListItem, OrderBankPaymentDetail } from '@/types/order'
import OrderStatusBadge from './OrderStatusBadge.vue'
import OrderTypeBadge from './OrderTypeBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { useFormatting } from '@/composables/useFormatting'
import {
    ArrowsUpDownIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    BanknotesIcon,
    DevicePhoneMobileIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
    loading?: boolean
    sortBy?: 'id' | 'total' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
}

defineProps<Props>()

defineEmits<{
    'edit-customer': [order: OrderListItem]
    'edit-address': [order: OrderListItem]
    'change-status': [order: OrderListItem]
    'assign-delivery': [order: OrderListItem]
    'edit-type': [order: OrderListItem]
    'verify-bank-payment': [order: OrderListItem, payment: OrderBankPaymentDetail]
    sort: [column: 'id' | 'total' | 'createdAt']
}>()

const { formatCurrency } = useFormatting()

// ✅ NUEVO: Formatear solo fecha
const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

// ✅ NUEVO: Formatear solo hora
const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

// ✅ NUEVO: Verificar si se puede verificar un pago
const canVerifyPayment = (order: OrderListItem): boolean => {
    // Solo si el pedido no está cancelado
    return order.status !== 'cancelled'
}

// Valida si se puede asignar domiciliario al pedido
const canAssignDeliveryman = (order: OrderListItem): boolean => {
    return order.type === 'delivery' &&
        ['ready', 'on_the_way', 'delivered'].includes(order.status)
}

// Obtiene la fecha del estado actual del pedido
const getStatusTime = (order: OrderListItem): string | undefined => {
    return order.statusTimes[order.status]
}
</script>
