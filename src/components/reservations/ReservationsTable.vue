<template>
    <div class="overflow-x-auto">
        <table class="min-w-[84rem] w-full table-fixed divide-y divide-gray-200">
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
                        class="w-[14%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Productos
                    </th>
                    <th scope="col"
                        class="w-[14%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Cliente / tel.
                    </th>
                    <th scope="col"
                        class="w-[14%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Dirección
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
                        class="w-[10%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Total
                    </th>
                    <th scope="col"
                        class="w-[12%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Abonos
                    </th>
                    <th scope="col"
                        class="w-[7%] px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Registro
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
                <tr v-if="loading">
                    <td colspan="9" class="px-4 py-10 text-center text-gray-500">
                        <div class="flex justify-center">
                            <BaseLoading size="md" />
                        </div>
                    </td>
                </tr>
                <tr v-else-if="!reservations || reservations.length === 0">
                    <td colspan="9" class="px-4 py-10 text-center text-gray-500">
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
                        <OrderSummaryLines :lines="reservation.summaryLines" :max-lines="2" />
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <button class="block w-full min-w-0 text-left hover:text-emerald-600 transition-colors"
                            @click.stop="$emit('edit-customer', reservation)">
                            <div class="truncate text-xs text-gray-600 tabular-nums hover:underline"
                                :title="orderListRecipientDisplayTitle(reservation)">
                                <span v-if="orderListRecipientDisplayName(reservation)" class="font-medium text-gray-900">
                                    {{ orderListRecipientDisplayName(reservation) }}
                                </span>
                                <span v-else class="italic">Sin nombre</span>
                                <span v-if="reservation.customerPhone"> · {{ reservation.customerPhone }}</span>
                            </div>
                        </button>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <button v-if="reservation.addressDescription"
                            class="block w-full min-w-0 text-left hover:text-emerald-600 transition-colors"
                            @click.stop="$emit('edit-address', reservation)">
                            <div class="truncate text-xs text-gray-900 hover:underline">
                                {{ reservation.addressDescription || '-' }}
                            </div>
                        </button>
                        <span v-else class="text-xs text-gray-400 italic">
                            -
                        </span>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div v-if="reservation.reservedFor">
                            <div :class="[
                                'truncate text-xs font-semibold leading-tight',
                                isUpcoming(reservation.reservedFor) ? 'text-amber-700' : 'text-gray-700',
                            ]">
                                {{ formatDate(reservation.reservedFor) }} · <span class="text-gray-500">{{ formatTime(reservation.reservedFor) }}</span>
                            </div>
                        </div>
                        <span v-else class="text-xs text-gray-400 italic">-</span>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div v-if="reservation.prepareAt">
                            <div class="truncate text-xs text-gray-700 leading-tight">
                                {{ formatDate(reservation.prepareAt) }} · <span class="text-gray-500">{{ formatTime(reservation.prepareAt) }}</span>
                            </div>
                        </div>
                        <span v-else class="text-xs text-gray-400 italic">-</span>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div class="space-y-0.5">
                            <div class="text-sm font-semibold tabular-nums text-gray-900">
                                {{ formatCurrency(reservation.total) }}
                            </div>
                            <div class="text-[10px] uppercase tracking-wide text-gray-400">
                                total
                            </div>
                        </div>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div class="space-y-1">
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
                            <div class="flex items-center justify-between gap-2 min-w-0">
                                <div class="text-[11px] font-medium tabular-nums whitespace-nowrap"
                                    :class="pendingAmount(reservation) > 0 ? 'text-amber-700' : 'text-emerald-700'">
                                    Saldo {{ formatCurrency(pendingAmount(reservation)) }}
                                </div>
                                <button v-if="pendingAmount(reservation) > 0 && reservation.status !== 'cancelled' && reservation.status !== 'delivered'"
                                    type="button"
                                    class="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                                    :title="'Agregar abono'"
                                    @click.stop="$emit('add-deposit', reservation)">
                                    <PlusIcon class="w-3.5 h-3.5" />
                                    <span class="hidden xl:inline">Abono</span>
                                </button>
                            </div>
                        </div>
                    </td>

                    <td class="px-2.5 py-2 align-top">
                        <div>
                            <div class="truncate text-xs text-gray-700 tabular-nums">
                                {{ formatDate(reservation.createdAt) }} · <span class="text-gray-500">{{ formatTime(reservation.createdAt) }}</span>
                            </div>
                        </div>
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
    PlusIcon,
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
    sort: [column: string]
}>()

const permissions = useOrderPermissions()
const { formatCurrency } = useFormatting()

const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return '-'
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
</script>
