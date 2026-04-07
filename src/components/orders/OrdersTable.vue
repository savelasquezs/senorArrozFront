<template>
    <div class="overflow-x-auto">
        <table class="min-w-[72rem] w-full table-fixed divide-y divide-gray-200">
            <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr>
                    <th scope="col"
                        class="w-[30%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'id')">
                        <div class="flex items-center space-x-1">
                            <span>ID</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'id'" class="w-4 h-4" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-4 h-4" />
                            <ChevronDownIcon v-else class="w-4 h-4" />
                        </div>
                    </th>
                    <th scope="col"
                        class="w-[6%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                    </th>
                    <th scope="col"
                        class="w-[10%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        title="Nombre de quien recibe; si no hay, el del cliente del pedido">
                        Recibe
                    </th>
                    <th scope="col"
                        class="w-[10%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dirección
                    </th>
                    <th scope="col"
                        class="w-[9%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                    </th>
                    <th scope="col"
                        class="w-[8%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'total')">
                        <div class="flex items-center space-x-1">
                            <span>Total</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'total'" class="w-4 h-4" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-4 h-4" />
                            <ChevronDownIcon v-else class="w-4 h-4" />
                        </div>
                    </th>
                    <th scope="col"
                        class="w-[13%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pagos
                    </th>
                    <th scope="col"
                        class="w-[7%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Domiciliario
                    </th>
                    <th scope="col"
                        class="w-[7%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                    <td colspan="9" class="px-3 py-12 text-center text-gray-500">
                        <div class="flex justify-center">
                            <BaseLoading size="md" />
                        </div>
                    </td>
                </tr>
                <tr v-else-if="!orders || orders.length === 0">
                    <td colspan="9" class="px-3 py-12 text-center text-gray-500">
                        No se encontraron pedidos
                    </td>
                </tr>
                <tr v-else v-for="order in orders" :key="order.id" class="hover:bg-gray-50 transition-colors">
                    <!-- ID + productos (máx. 2 ítems + ....; hasta 2 líneas por nombre) -->
                    <td class="min-w-0 px-3 py-2 align-top">
                        <div class="flex items-start gap-1.5 min-w-0 w-full">
                            <router-link :to="{ name: 'OrderDetail', params: { id: order.id } }"
                                class="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline whitespace-nowrap tabular-nums">
                                #{{ order.id }}
                            </router-link>
                            <div v-if="productPreviewLines(order).length"
                                class="min-w-0 flex-1 text-xs text-gray-600 leading-snug space-y-0.5">
                                <div v-for="(line, idx) in productPreviewLines(order)" :key="idx"
                                    :class="line === '....' ? 'text-gray-400' : 'line-clamp-2 break-words'"
                                    :title="line === '....' ? undefined : line">
                                    {{ line }}
                                </div>
                            </div>
                        </div>
                    </td>

                    <!-- Tipo - CLICKEABLE -->
                    <td class="min-w-0 px-3 py-2 whitespace-nowrap">
                        <button type="button" @click.stop="$emit('edit-type', order)"
                            class="hover:opacity-80 transition-opacity cursor-pointer">
                            <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                        </button>
                        <!-- Botón abono para reservas activas -->
                        <button type="button"
                            v-if="order.type === 'reservation' && order.status !== 'cancelled' && order.status !== 'delivered'"
                            @click.stop="$emit('add-deposit', order)"
                            class="mt-1 text-xs text-amber-600 hover:text-amber-800 underline decoration-dotted block"
                        >
                            + Abono
                        </button>
                    </td>

                    <!-- Quien recibe (guestName); respaldo nombre del cliente del pedido -->
                    <td class="min-w-0 px-3 py-2">
                        <div class="flex items-start gap-1">
                            <button type="button" class="text-left hover:text-emerald-600 transition-colors min-w-0 flex-1"
                                @click.stop="$emit('edit-customer', order)">
                                <div v-if="orderListRecipientDisplayName(order)"
                                    class="text-sm font-medium text-gray-900 hover:underline truncate"
                                    :title="orderListRecipientDisplayTitle(order)">
                                    {{ orderListRecipientDisplayName(order) }}
                                </div>
                                <span v-else class="text-sm text-gray-400 italic hover:underline">Sin nombre</span>
                                <div v-if="order.customerPhone" class="text-sm text-gray-500 tabular-nums truncate">
                                    {{ order.customerPhone }}
                                </div>
                            </button>
                            <button v-if="order.customerPhone"
                                type="button"
                                class="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Copiar teléfono"
                                @click.stop="copyCustomerPhone(order)">
                                <ClipboardDocumentIcon class="w-4 h-4" />
                            </button>
                        </div>
                    </td>

                    <!-- Dirección (clickeable; columna estrecha: prioridad a productos) -->
                    <td class="min-w-0 px-3 py-2">
                        <button type="button" v-if="order.addressDescription || order.addressAdditionalInfo"
                            class="text-left text-sm text-gray-900 hover:text-emerald-600 hover:underline transition-colors w-full min-w-0"
                            @click.stop="$emit('edit-address', order)">
                            <span class="block truncate" :title="order.addressDescription || ''">{{ order.addressDescription || '—' }}</span>
                            <span v-if="order.addressAdditionalInfo"
                                class="block text-xs text-gray-500 font-normal truncate mt-0.5"
                                :title="order.addressAdditionalInfo">{{
                                    order.addressAdditionalInfo }}</span>
                        </button>
                        <span v-else class="text-sm text-gray-400 italic">-</span>
                    </td>

                    <!-- Estado (clickeable para cambiar) -->
                    <td class="min-w-0 px-3 py-2 whitespace-nowrap">
                        <OrderStatusBadge :status="order.status" :display-name="order.statusDisplayName"
                            :status-time="getStatusTime(order)" :clickable="true"
                            @click="$emit('change-status', order)" />
                    </td>

                    <!-- Total -->
                    <td class="min-w-0 px-3 py-2 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">
                            {{ formatCurrency(order.total) }}
                        </div>
                    </td>

                    <!-- Pagos -->
                    <td class="min-w-0 px-3 py-2">
                        <div class="space-y-1">
                            <!-- Bank Payments -->
                            <div v-if="order.bankPayments && order.bankPayments.length > 0" class="space-y-1">
                                <div v-for="payment in order.bankPayments" :key="payment.id"
                                    class="flex items-center justify-between gap-1 text-xs bg-blue-50 rounded px-1.5 py-0.5 min-w-0">
                                    <div class="flex items-center gap-1 min-w-0">
                                        <BanknotesIcon class="w-4 h-4 text-blue-600" />
                                        <span class="font-medium text-blue-900 truncate max-w-[5.5rem]" :title="payment.bankName">{{ payment.bankName }}</span>
                                        <span class="text-blue-700 shrink-0 tabular-nums">{{ formatCurrency(payment.amount) }}</span>
                                    </div>
                                    <!-- Botón de verificación -->
                                    <button type="button" v-if="canVerifyPayment(order)"
                                        @click.stop="emit('verify-bank-payment', order, payment)" :class="[
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
                                    class="flex items-center gap-1 text-xs bg-purple-50 rounded px-1.5 py-0.5 min-w-0">
                                    <DevicePhoneMobileIcon class="w-4 h-4 text-purple-600 shrink-0" />
                                    <span class="font-medium text-purple-900 truncate max-w-[4.5rem]" :title="payment.appName">{{ payment.appName }}</span>
                                    <span class="text-purple-700 shrink-0 tabular-nums">{{ formatCurrency(payment.amount) }}</span>
                                </div>
                            </div>

                            <!-- Sin pagos = efectivo + acciones rápidas -->
                            <div v-if="(!order.bankPayments || order.bankPayments.length === 0) &&
                                (!order.appPayments || order.appPayments.length === 0)"
                                class="flex flex-wrap items-center gap-1">
                                <span class="text-xs text-gray-400 italic">
                                    Efectivo
                                </span>
                                <button type="button" v-for="bank in (props.quickBanks || []).slice(0, 2)" :key="bank.id"
                                    class="text-[11px] text-blue-600 hover:text-blue-800 underline decoration-dotted"
                                    @click.stop="emit('quick-bank-transfer', order, bank.id)">
                                    {{ formatQuickLabel(bank.name) }}
                                </button>
                            </div>
                        </div>
                    </td>

                    <!-- Domiciliario (clickeable para asignar/cambiar) -->
                    <td class="min-w-0 px-3 py-2">
                        <button type="button" :disabled="!canAssignDeliveryman(order)" :class="[
                            'text-left transition-colors w-full min-w-0',
                            canAssignDeliveryman(order)
                                ? 'hover:text-emerald-600 cursor-pointer'
                                : 'cursor-not-allowed opacity-50'
                        ]" @click.stop="canAssignDeliveryman(order) && $emit('assign-delivery', order)">
                            <div v-if="order.deliveryManName" class="text-sm text-gray-900 truncate"
                                :class="{ 'hover:underline': canAssignDeliveryman(order) }"
                                :title="order.deliveryManName">
                                {{ order.deliveryManName }}
                            </div>
                            <div v-else class="text-sm text-gray-400 italic"
                                :class="{ 'hover:underline': canAssignDeliveryman(order) }">
                                {{ canAssignDeliveryman(order) ? 'Asignar' : 'N/A' }}
                            </div>
                        </button>
                    </td>

                    <!-- Fecha -->
                    <td class="min-w-0 px-3 py-2 whitespace-nowrap">
                        <div class="text-xs text-gray-900">{{ formatDate(order.createdAt) }}</div>
                        <div class="text-xs text-gray-500">{{ formatTime(order.createdAt) }}</div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import type { OrderListItem, OrderBankPaymentDetail } from '@/types/order'
import type { Bank } from '@/types/bank'
import OrderStatusBadge from './OrderStatusBadge.vue'
import OrderTypeBadge from './OrderTypeBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { useFormatting, getStatusTimeFromRecord } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import {
    ArrowsUpDownIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    BanknotesIcon,
    DevicePhoneMobileIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClipboardDocumentIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
    loading?: boolean
    sortBy?: 'id' | 'total' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
    quickBanks?: Bank[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'edit-customer': [order: OrderListItem]
    'edit-address': [order: OrderListItem]
    'change-status': [order: OrderListItem]
    'assign-delivery': [order: OrderListItem]
    'edit-type': [order: OrderListItem]
    'verify-bank-payment': [order: OrderListItem, payment: OrderBankPaymentDetail]
    'quick-bank-transfer': [order: OrderListItem, bankId: number]
    'add-deposit': [order: OrderListItem]
    sort: [column: 'id' | 'total' | 'createdAt']
}>()

const { formatCurrency } = useFormatting()
const { success, error } = useToast()

async function copyCustomerPhone(order: OrderListItem) {
    const phone = order.customerPhone?.trim()
    if (!phone) return
    try {
        await navigator.clipboard.writeText(phone)
        success('Teléfono copiado', 2500, phone)
    } catch {
        error('No se pudo copiar', 'Permite el acceso al portapapeles o copia el número manualmente.')
    }
}

// Formatear solo fecha
const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

// Formatear solo hora
const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

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
    return getStatusTimeFromRecord(order.statusTimes, order.status)
}

const formatQuickLabel = (bankName: string): string => {
    const base = `Transf ${bankName}`
    return base.length > 13 ? base.slice(0, 13) : base
}

/** Prioriza quien recibe (guestname); si vacío, titular del pedido (customerName). */
function orderListRecipientDisplayName(order: OrderListItem): string {
    const g = order.guestName?.trim()
    const c = order.customerName?.trim()
    return g || c || ''
}

/** Tooltip: si hay ambos nombres y difieren, muestra ambos para identificar al titular. */
function orderListRecipientDisplayTitle(order: OrderListItem): string {
    const line1 = orderListRecipientDisplayName(order)
    const g = order.guestName?.trim()
    const c = order.customerName?.trim()
    if (g && c && g !== c) return `${line1} (cliente: ${c})`
    return line1
}

/** Hasta 2 líneas de producto × cantidad; si hay más ítems, tercera línea "....". */
function productPreviewLines(order: OrderListItem): string[] {
    const lines = order.summaryLines ?? []
    if (lines.length === 0) return []
    const formatted = lines.map((l) => `${l.productName} × ${l.quantity}`)
    if (formatted.length <= 2) return formatted
    return [...formatted.slice(0, 2), '....']
}
</script>
