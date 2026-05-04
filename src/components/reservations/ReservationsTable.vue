<template>
    <div class="overflow-x-auto">
        <table class="min-w-[92rem] w-full table-fixed divide-y divide-gray-200">
            <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr>
                    <th scope="col"
                        class="w-[7%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'id')">
                        <div class="flex items-center gap-1">
                            <span>ID</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'id'" class="w-3 h-3" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-3 h-3" />
                            <ChevronDownIcon v-else class="w-3 h-3" />
                        </div>
                    </th>
                    <th scope="col"
                        class="w-[15%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Cliente / tel.
                    </th>
                    <th scope="col"
                        class="w-[15%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Dirección / barrio
                    </th>
                    <th scope="col"
                        class="w-[11%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'reservedFor')">
                        <div class="flex items-center gap-1">
                            <CalendarDaysIcon class="w-3.5 h-3.5 text-amber-500" />
                            <span>Evento</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'reservedFor'" class="w-3 h-3" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-3 h-3" />
                            <ChevronDownIcon v-else class="w-3 h-3" />
                        </div>
                    </th>
                    <th scope="col"
                        class="w-[11%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Preparación
                    </th>
                    <th scope="col"
                        class="w-[16%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Productos
                    </th>
                    <th scope="col"
                        class="w-[11%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Total / abonos
                    </th>
                    <th scope="col"
                        class="w-[7%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Estado
                    </th>
                    <th scope="col"
                        class="w-[7%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Registro
                    </th>
                    <th scope="col"
                        class="w-[10%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Acciones
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
                <tr v-if="loading">
                    <td colspan="10" class="px-4 py-10 text-center text-gray-500">
                        <div class="flex justify-center">
                            <BaseLoading size="md" />
                        </div>
                    </td>
                </tr>
                <tr v-else-if="!reservations || reservations.length === 0">
                    <td colspan="10" class="px-4 py-10 text-center text-gray-500">
                        No se encontraron reservas
                    </td>
                </tr>
                <tr v-else v-for="reservation in reservations" :key="reservation.id"
                    class="hover:bg-gray-50/80 transition-colors">
                    <td class="px-2.5 py-2 align-top">
                        <router-link :to="{ name: 'OrderDetail', params: { id: reservation.id } }"
                            class="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline tabular-nums">
                            #{{ reservation.id }}
                        </router-link>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <button class="block w-full min-w-0 text-left hover:text-emerald-600 transition-colors"
                            @click.stop="$emit('edit-customer', reservation)">
                            <div v-if="orderListRecipientDisplayName(reservation)"
                                class="truncate text-sm font-medium text-gray-900 hover:underline"
                                :title="orderListRecipientDisplayTitle(reservation)">
                                {{ orderListRecipientDisplayName(reservation) }}
                            </div>
                            <div v-else class="text-sm text-gray-400 italic hover:underline">
                                Sin nombre
                            </div>
                            <div v-if="reservation.customerPhone" class="truncate text-[11px] text-gray-500 tabular-nums">
                                {{ reservation.customerPhone }}
                            </div>
                        </button>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <button v-if="reservation.addressDescription || reservation.addressAdditionalInfo"
                            class="block w-full min-w-0 text-left hover:text-emerald-600 transition-colors"
                            @click.stop="$emit('edit-address', reservation)">
                            <div class="truncate text-sm text-gray-900 hover:underline">
                                {{ reservation.addressDescription || '—' }}
                            </div>
                            <div v-if="reservation.addressAdditionalInfo"
                                class="truncate text-[11px] text-gray-500">
                                {{ reservation.addressAdditionalInfo }}
                            </div>
                        </button>
                        <div v-if="reservation.neighborhoodName" class="truncate text-[11px] text-gray-400">
                            {{ reservation.neighborhoodName }}
                        </div>
                        <span v-if="!reservation.addressDescription && !reservation.addressAdditionalInfo && !reservation.neighborhoodName"
                            class="text-sm text-gray-400 italic">
                            —
                        </span>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div v-if="reservation.reservedFor" class="space-y-0.5">
                            <div :class="[
                                'text-sm font-semibold leading-tight',
                                isUpcoming(reservation.reservedFor) ? 'text-amber-700' : 'text-gray-700',
                            ]">
                                {{ formatDate(reservation.reservedFor) }}
                            </div>
                            <div class="text-[11px] text-gray-500 tabular-nums">
                                {{ formatTime(reservation.reservedFor) }}
                            </div>
                        </div>
                        <span v-else class="text-sm text-gray-400 italic">—</span>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div v-if="reservation.prepareAt" class="space-y-0.5">
                            <div class="text-sm text-gray-700 leading-tight">
                                {{ formatDate(reservation.prepareAt) }}
                            </div>
                            <div class="text-[11px] text-gray-500 tabular-nums">
                                {{ formatTime(reservation.prepareAt) }}
                            </div>
                        </div>
                        <span v-else class="text-sm text-gray-400 italic">—</span>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <OrderSummaryLines :lines="reservation.summaryLines" :max-lines="2" />
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div class="space-y-1">
                            <div class="flex items-baseline gap-1">
                                <span class="text-sm font-semibold tabular-nums text-gray-900">
                                    {{ formatCurrency(reservation.total) }}
                                </span>
                                <span class="text-[10px] text-gray-400">total</span>
                            </div>
                            <div class="text-[11px] text-emerald-700 font-medium tabular-nums">
                                Abonos {{ formatCurrency(reservation.totalDeposited) }}
                            </div>
                            <div class="text-[11px] font-medium tabular-nums"
                                :class="pendingAmount(reservation) > 0 ? 'text-amber-700' : 'text-emerald-700'">
                                Saldo {{ formatCurrency(pendingAmount(reservation)) }}
                            </div>
                            <div v-if="reservation.total > 0"
                                class="h-1.5 w-full max-w-[6rem] overflow-hidden rounded-full bg-gray-200">
                                <div class="h-full rounded-full bg-amber-400 transition-all"
                                    :style="{ width: `${Math.min(100, (reservation.totalDeposited / reservation.total) * 100)}%` }" />
                            </div>
                            <div v-if="(reservation.reservationDeposits?.length ?? 0) > 0" class="space-y-1">
                                <ReservationDepositCompactRow
                                    v-for="d in (reservation.reservationDeposits ?? [])"
                                    :key="d.id"
                                    :deposit="d"
                                    :show-edit-remove="permissions.canEditPayments(reservation)"
                                    @edit="(dep) => $emit('edit-reservation-deposit', reservation, dep)"
                                    @remove="(dep) => $emit('remove-reservation-deposit', reservation, dep)"
                                />
                            </div>
                            <button v-if="reservation.status !== 'cancelled' && reservation.status !== 'delivered'"
                                type="button"
                                class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-900 underline decoration-dotted underline-offset-2"
                                @click.stop="$emit('add-deposit', reservation)">
                                + Abono
                            </button>
                        </div>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <span :class="statusBadgeClass(reservation.status)">
                            {{ reservation.statusDisplayName }}
                        </span>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div class="space-y-0.5">
                            <div class="text-xs text-gray-700 tabular-nums">
                                {{ formatDate(reservation.createdAt) }}
                            </div>
                            <div class="text-[11px] text-gray-500 tabular-nums">
                                {{ formatTime(reservation.createdAt) }}
                            </div>
                        </div>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <button v-if="reservation.status !== 'cancelled' && reservation.status !== 'delivered'"
                            type="button"
                            class="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                            @click.stop="$emit('cancel-reservation', reservation)">
                            <XMarkIcon class="w-3.5 h-3.5" />
                            Cancelar
                        </button>
                        <span v-else class="text-xs text-gray-400 italic">—</span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import type { OrderListItem } from '@/types/order'
import type { ReservationDeposit } from '@/types/reservationDeposit'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import ReservationDepositCompactRow from '@/components/reservations/ReservationDepositCompactRow.vue'
import OrderSummaryLines from '@/components/orders/OrderSummaryLines.vue'
import { useFormatting } from '@/composables/useFormatting'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { defaultBusinessCalendar } from '@/utils/datetime'
import {
    orderListRecipientDisplayName,
    orderListRecipientDisplayTitle,
} from '@/utils/orderRecipientDisplay'
import {
    ArrowsUpDownIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    CalendarDaysIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'

interface Props {
    reservations: OrderListItem[]
    loading?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

defineProps<Props>()

defineEmits<{
    'edit-customer': [order: OrderListItem]
    'edit-address': [order: OrderListItem]
    'add-deposit': [order: OrderListItem]
    'edit-reservation-deposit': [order: OrderListItem, deposit: ReservationDeposit]
    'remove-reservation-deposit': [order: OrderListItem, deposit: ReservationDeposit]
    'cancel-reservation': [order: OrderListItem]
    sort: [column: string]
}>()

const permissions = useOrderPermissions()
const { formatCurrency } = useFormatting()

const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return '—'
    return defaultBusinessCalendar.formatDateShort(dateString as string)
}

const formatTime = (dateString: string | Date | null): string => {
    if (!dateString) return ''
    return defaultBusinessCalendar.formatTime12h(dateString as string)
}

const isUpcoming = (dateString: string | null): boolean => {
    if (!dateString) return false
    return new Date(dateString) > new Date()
}

const pendingAmount = (order: OrderListItem): number => {
    return Math.max(0, order.total - order.totalDeposited)
}

const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
        taken: 'bg-blue-50 text-blue-700 border-blue-200',
        in_preparation: 'bg-orange-50 text-orange-700 border-orange-200',
        ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        on_the_way: 'bg-purple-50 text-purple-700 border-purple-200',
        delivered: 'bg-gray-100 text-gray-600 border-gray-200',
        cancelled: 'bg-red-50 text-red-700 border-red-200',
    }

    return [
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200',
    ].join(' ')
}
</script>
