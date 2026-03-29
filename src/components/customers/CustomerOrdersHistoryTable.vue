<template>
    <div class="overflow-x-auto -mx-1">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="sticky top-0 z-30 bg-gray-50 shadow-sm">
                <tr>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide min-w-[12rem]">
                        Productos
                    </th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide min-w-[10rem]">
                        Entrega
                    </th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                        Pagos
                    </th>
                    <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                        Domiciliario
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
                <template v-if="loading && (!orders || orders.length === 0)">
                    <tr>
                        <td colspan="9" class="px-3 py-8 text-center text-gray-500">
                            <BaseLoading size="md" />
                        </td>
                    </tr>
                </template>
                <template v-else-if="!orders || orders.length === 0">
                    <tr>
                        <td colspan="9" class="px-3 py-8 text-center text-gray-500">Sin pedidos</td>
                    </tr>
                </template>
                <template v-else>
                <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50/90 align-top">
                    <td class="px-3 py-2 whitespace-nowrap">
                        <router-link
                            :to="{ name: 'OrderDetail', params: { id: order.id } }"
                            class="text-emerald-600 hover:text-emerald-800 font-medium text-sm">
                            #{{ order.id }}
                        </router-link>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-800">
                        <div>{{ formatDate(order.createdAt) }}</div>
                        <div class="text-gray-500">{{ formatTime(order.createdAt) }}</div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                        <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                    </td>
                    <td class="px-3 py-2 text-xs text-gray-800 max-w-md">
                        <div v-if="loadingDetails" class="text-gray-400">…</div>
                        <ul v-else-if="productLines(order.id).length" class="space-y-0.5">
                            <li v-for="(ln, idx) in productLines(order.id)" :key="idx" class="leading-snug">
                                <span class="font-medium tabular-nums text-gray-900">{{ ln.q }}×</span>
                                {{ ln.name }}
                            </li>
                        </ul>
                        <span v-else class="text-gray-400">—</span>
                    </td>
                    <td class="px-3 py-2 text-xs text-gray-800 max-w-xs">
                        <div>{{ deliveryLabel(order) }}</div>
                        <div v-if="order.addressDescription || order.neighborhoodName" class="mt-0.5 text-gray-700">
                            {{ [order.addressDescription, order.neighborhoodName].filter(Boolean).join(' · ') || '—' }}
                        </div>
                        <div v-if="order.addressAdditionalInfo" class="text-[11px] text-gray-500 mt-0.5">
                            {{ order.addressAdditionalInfo }}
                        </div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                        <OrderStatusBadge
                            :status="order.status"
                            :display-name="order.statusDisplayName"
                            :status-time="order.statusTimes[order.status]"
                            :clickable="false" />
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 tabular-nums">
                        {{ formatCurrency(order.total) }}
                    </td>
                    <td class="px-3 py-2 text-[11px] text-gray-700 hidden lg:table-cell max-w-[10rem]">
                        <div v-if="order.bankPayments?.length" class="space-y-0.5">
                            <div
                                v-for="p in order.bankPayments"
                                :key="p.id"
                                class="text-blue-900 bg-blue-50 rounded px-1.5 py-0.5 truncate"
                                :title="`${p.bankName} ${formatCurrency(p.amount)}`">
                                {{ p.bankName }} · {{ formatCurrency(p.amount) }}
                            </div>
                        </div>
                        <div v-if="order.appPayments?.length" class="space-y-0.5 mt-0.5">
                            <div
                                v-for="p in order.appPayments"
                                :key="p.id"
                                class="text-purple-900 bg-purple-50 rounded px-1.5 py-0.5 truncate">
                                {{ p.appName }} · {{ formatCurrency(p.amount) }}
                            </div>
                        </div>
                        <span
                            v-if="(!order.bankPayments || order.bankPayments.length === 0) && (!order.appPayments || order.appPayments.length === 0)"
                            class="text-gray-400 italic">
                            Efectivo
                        </span>
                    </td>
                    <td class="px-3 py-2 text-xs text-gray-700 hidden xl:table-cell whitespace-nowrap">
                        {{ order.deliveryManName || '—' }}
                    </td>
                </tr>
                </template>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import type { OrderListItem, OrderDetailItem } from '@/types/order'
import OrderStatusBadge from '@/components/orders/OrderStatusBadge.vue'
import OrderTypeBadge from '@/components/orders/OrderTypeBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { useFormatting } from '@/composables/useFormatting'

const props = defineProps<{
    orders: OrderListItem[]
    /** Detalle de líneas por pedido (desde GET /orders/:id/details) */
    orderLinesById: Record<number, OrderDetailItem[] | undefined>
    loading?: boolean
    loadingDetails?: boolean
}>()

const { formatCurrency } = useFormatting()

const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatTime = (dateString: string): string =>
    new Date(dateString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })

function productLines(orderId: number): { q: number; name: string }[] {
    const lines = props.orderLinesById[orderId]
    if (!lines?.length) return []
    return lines.map(l => ({ q: l.quantity, name: l.productName }))
}

function deliveryLabel(order: OrderListItem): string {
    if (order.type === 'delivery') return 'Domicilio'
    if (order.type === 'reservation') return 'Reserva'
    return 'En el local'
}
</script>
