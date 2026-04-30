<template>
    <div class="overflow-x-auto">
        <table class="min-w-[72rem] w-full table-fixed divide-y divide-gray-200">
            <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr>
                    <th scope="col"
                        class="w-[20%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'id')">
                        <div class="flex items-center space-x-1">
                            <span>ID</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'id'" class="w-4 h-4" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-4 h-4" />
                            <ChevronDownIcon v-else class="w-4 h-4" />
                        </div>
                    </th>
                    <th scope="col"
                        class="w-[10%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        class="w-[19%] min-w-0 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                            <!-- Abonos de reserva (anticipos) -->
                            <div
                                v-if="order.type === 'reservation' && (order.reservationDeposits?.length ?? 0) > 0"
                                class="space-y-1"
                            >
                                <ReservationDepositCompactRow
                                    v-for="d in (order.reservationDeposits ?? [])"
                                    :key="d.id"
                                    :deposit="d"
                                    :show-edit-remove="permissions.canEditPayments(order)"
                                    @edit="(dep) => emit('edit-reservation-deposit', order, dep)"
                                    @remove="(dep) => emit('remove-reservation-deposit', order, dep)"
                                />
                            </div>
                            <!-- Bank Payments -->
                            <div v-if="order.bankPayments && order.bankPayments.length > 0" class="space-y-1">
                                <OrderBankPaymentRow v-for="payment in order.bankPayments" :key="payment.id"
                                    :payment="payment" density="compact" variant="table"
                                    :show-verify-actions="showVerifyBankActions(order)"
                                    :show-edit-remove="permissions.canEditPayments(order)"
                                    :show-verification-badge="false" @verify="emit('verify-bank-payment', order, payment)"
                                    @unverify="emit('verify-bank-payment', order, payment)"
                                    @edit="emit('edit-bank-payment', order, $event)"
                                    @remove="emit('remove-bank-payment', order, $event)" />
                            </div>

                            <!-- App Payments -->
                            <div v-if="order.appPayments && order.appPayments.length > 0" class="space-y-1">
                                <OrderAppPaymentRow v-for="payment in order.appPayments" :key="payment.id"
                                    :payment="payment" :show-settle-actions="showSettleAppActions(order)"
                                    @settle="emit('settle-app-payment', order, payment)"
                                    @unsettle="emit('settle-app-payment', order, payment)" />
                            </div>

                            <!-- Efectivo en tienda: siempre visible si aplica (junto con banco/app) -->
                            <div v-if="order.paidInStoreCash" class="flex flex-wrap items-center gap-1">
                                <PaidInStoreCashCompactRow
                                    :amount="order.paidInStoreCashAmount ?? null"
                                    :max-amount="paidInStoreCashCap(order)"
                                    :show-edit-remove="permissions.canEditPayments(order)"
                                    :disabled="savingPaidInStoreId === order.id"
                                    @edit="emit('edit-paid-in-store-cash', order)"
                                    @remove="emit('remove-paid-in-store-cash', order)" />
                            </div>

                            <!-- Sin electrónicos: atajos Pagó? + transferencia rápida -->
                            <div v-if="!orderHasElectronicPayments(order) && !order.paidInStoreCash"
                                class="flex flex-wrap items-center gap-1">
                                <button v-if="showPaidInStoreQuickButton(order)" type="button"
                                    class="text-[11px] font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded px-1.5 py-0.5 disabled:opacity-50"
                                    :disabled="savingPaidInStoreId === order.id"
                                    @click.stop="quickMarkPaidInStore(order)">
                                    {{ savingPaidInStoreId === order.id ? '…' : 'Pagó?' }}
                                </button>
                                <button
                                    v-for="bank in (props.quickBanks || []).slice(0, 2)"
                                    :key="bank.id"
                                    type="button"
                                    class="text-[11px] text-blue-600 hover:text-blue-800 underline decoration-dotted"
                                    @click.stop="emit('quick-bank-transfer', order, bank.id)">
                                    {{ formatQuickLabel(bank.name) }}
                                </button>
                            </div>

                            <!-- Con electrónicos y remanente: solo atajo Pagó? (evita duplicar con bloque sin electrónicos) -->
                            <div v-if="orderHasElectronicPayments(order) && showPaidInStoreQuickButton(order)"
                                class="flex flex-wrap items-center gap-1">
                                <button type="button"
                                    class="text-[11px] font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded px-1.5 py-0.5 disabled:opacity-50"
                                    :disabled="savingPaidInStoreId === order.id"
                                    @click.stop="quickMarkPaidInStore(order)">
                                    {{ savingPaidInStoreId === order.id ? '…' : 'Pagó?' }}
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
import { ref } from 'vue'
import type { OrderListItem, OrderBankPaymentDetail, OrderAppPaymentDetail } from '@/types/order'
import type { ReservationDeposit } from '@/types/reservationDeposit'
import type { Bank } from '@/types/bank'
import OrderStatusBadge from './OrderStatusBadge.vue'
import OrderTypeBadge from './OrderTypeBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrderBankPaymentRow from '@/components/payments/OrderBankPaymentRow.vue'
import OrderAppPaymentRow from '@/components/payments/OrderAppPaymentRow.vue'
import PaidInStoreCashCompactRow from '@/components/orders/PaidInStoreCashCompactRow.vue'
import ReservationDepositCompactRow from '@/components/reservations/ReservationDepositCompactRow.vue'
import { useFormatting, getStatusTimeFromRecord } from '@/composables/useFormatting'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import {
    orderListRecipientDisplayName,
    orderListRecipientDisplayTitle,
} from '@/utils/orderRecipientDisplay'
import { defaultBusinessCalendar } from '@/utils/datetime'
import { useToast } from '@/composables/useToast'
import { orderApi } from '@/services/MainAPI/orderApi'
import { orderCashToCollect, sumPaymentsAmounts } from '@/utils/orderCashToCollect'
import { orderHasElectronicPayments } from '@/utils/orderListPayments'
import {
    ArrowsUpDownIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ClipboardDocumentIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
    loading?: boolean
    sortBy?: 'id' | 'total' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
    quickBanks?: Bank[]
    /** Si true, muestra acción rápida “Pagó” (listado de pedidos). */
    enablePaidInStoreQuickAction?: boolean
    /** Si true, liquidar/desliquidar app desde la columna Pagos (solo listado; requiere handler en el padre). */
    enableAppSettleQuickAction?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    enablePaidInStoreQuickAction: false,
    enableAppSettleQuickAction: false,
})

const permissions = useOrderPermissions()

const emit = defineEmits<{
    'edit-customer': [order: OrderListItem]
    'edit-address': [order: OrderListItem]
    'change-status': [order: OrderListItem]
    'assign-delivery': [order: OrderListItem]
    'edit-type': [order: OrderListItem]
    'verify-bank-payment': [order: OrderListItem, payment: OrderBankPaymentDetail]
    'settle-app-payment': [order: OrderListItem, payment: OrderAppPaymentDetail]
    'edit-bank-payment': [order: OrderListItem, payment: OrderBankPaymentDetail]
    'remove-bank-payment': [order: OrderListItem, payment: OrderBankPaymentDetail]
    'quick-bank-transfer': [order: OrderListItem, bankId: number]
    'add-deposit': [order: OrderListItem]
    'edit-reservation-deposit': [order: OrderListItem, deposit: ReservationDeposit]
    'remove-reservation-deposit': [order: OrderListItem, deposit: ReservationDeposit]
    'paid-in-store-updated': [order: OrderListItem]
    'edit-paid-in-store-cash': [order: OrderListItem]
    'remove-paid-in-store-cash': [order: OrderListItem]
    sort: [column: 'id' | 'total' | 'createdAt']
}>()

const { formatCurrency } = useFormatting()
const { success, error } = useToast()

const savingPaidInStoreId = ref<number | null>(null)

const showPaidInStoreQuickButton = (order: OrderListItem): boolean =>
    props.enablePaidInStoreQuickAction &&
    order.status !== 'cancelled' &&
    permissions.canEditPayments(order) &&
    order.paidInStoreCash !== true &&
    orderCashToCollect(
        order.total,
        { bankPayments: order.bankPayments, appPayments: order.appPayments },
        { floorAtZero: true },
    ) > 0

async function quickMarkPaidInStore(order: OrderListItem) {
    if (!showPaidInStoreQuickButton(order)) return
    savingPaidInStoreId.value = order.id
    try {
        const updated = await orderApi.setPaidInStoreCash(order.id, true)
        const u = updated as unknown as {
            paidInStoreCash?: boolean
            paidInStoreCashAt?: string | null
            paidInStoreCashAmount?: number | null
            updatedAt?: string
        }
        const patched: OrderListItem = {
            ...order,
            paidInStoreCash: Boolean(u.paidInStoreCash),
            paidInStoreCashAt: u.paidInStoreCashAt ?? null,
            paidInStoreCashAmount:
                typeof u.paidInStoreCashAmount === 'number' ? u.paidInStoreCashAmount : null,
            updatedAt: u.updatedAt ?? order.updatedAt,
        }
        emit('paid-in-store-updated', patched)
        success('Pagó en tienda', 3500, 'Pedido marcado como pagado en efectivo en sucursal')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo actualizar'
        error('Error', msg)
    } finally {
        savingPaidInStoreId.value = null
    }
}

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

const formatDate = (dateString: string): string => defaultBusinessCalendar.formatDateShort(dateString)

const formatTime = (dateString: string): string => defaultBusinessCalendar.formatTime12h(dateString)

const showVerifyBankActions = (order: OrderListItem): boolean =>
    permissions.canVerifyPayments() && order.status !== 'cancelled'

const showSettleAppActions = (order: OrderListItem): boolean =>
    props.enableAppSettleQuickAction &&
    permissions.canSettleAppPayments() &&
    order.status !== 'cancelled'

// Valida si se puede asignar domiciliario al pedido
const canAssignDeliveryman = (order: OrderListItem): boolean => {
    const typeOk = order.type === 'delivery' || order.type === 'onsite'
    return typeOk && ['ready', 'on_the_way', 'delivered'].includes(order.status)
}

// Obtiene la fecha del estado actual del pedido
const getStatusTime = (order: OrderListItem): string | undefined => {
    return getStatusTimeFromRecord(order.statusTimes, order.status)
}

const formatQuickLabel = (bankName: string): string => {
    const base = `Transf ${bankName}`
    return base.length > 13 ? base.slice(0, 13) : base
}

function paidInStoreCashCap(order: OrderListItem): number {
    const bank = sumPaymentsAmounts(order.bankPayments)
    const app = sumPaymentsAmounts(order.appPayments)
    return Math.max(0, order.total - bank - app)
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
