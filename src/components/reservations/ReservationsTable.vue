<template>
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <!-- ID -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'id')">
                        <div class="flex items-center space-x-1">
                            <span>ID</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'id'" class="w-3 h-3" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-3 h-3" />
                            <ChevronDownIcon v-else class="w-3 h-3" />
                        </div>
                    </th>
                    <!-- Quien recibe -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        title="Nombre de quien recibe; si no hay, el del cliente del pedido">
                        Recibe
                    </th>
                    <!-- Dirección -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dirección
                    </th>
                    <!-- Fecha evento -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        @click="$emit('sort', 'reservedFor')">
                        <div class="flex items-center space-x-1">
                            <CalendarDaysIcon class="w-3.5 h-3.5 text-amber-500" />
                            <span>Fecha evento</span>
                            <ArrowsUpDownIcon v-if="sortBy !== 'reservedFor'" class="w-3 h-3" />
                            <ChevronUpIcon v-else-if="sortOrder === 'asc'" class="w-3 h-3" />
                            <ChevronDownIcon v-else class="w-3 h-3" />
                        </div>
                    </th>
                    <!-- Preparación -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preparación
                    </th>
                    <!-- Total y Abonos -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total / Abonos
                    </th>
                    <!-- Estado (badge informativo) -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                    </th>
                    <!-- Registrado -->
                    <th scope="col"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registrado
                    </th>
                    <!-- Acciones -->
                    <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <tr v-if="loading">
                    <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex justify-center">
                            <BaseLoading size="md" />
                        </div>
                    </td>
                </tr>
                <tr v-else-if="!reservations || reservations.length === 0">
                    <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                        No se encontraron reservas
                    </td>
                </tr>
                <tr v-else v-for="order in reservations" :key="order.id"
                    class="hover:bg-amber-50/30 transition-colors">

                    <!-- ID -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <router-link :to="{ name: 'OrderDetail', params: { id: order.id } }"
                            class="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                            #{{ order.id }}
                        </router-link>
                    </td>

                    <!-- Quien recibe -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <button class="text-left hover:text-emerald-600 transition-colors"
                            @click.stop="$emit('edit-customer', order)">
                            <div v-if="orderListRecipientDisplayName(order)"
                                class="text-sm font-medium text-gray-900 hover:underline"
                                :title="orderListRecipientDisplayTitle(order)">
                                {{ orderListRecipientDisplayName(order) }}
                            </div>
                            <span v-else class="text-sm text-gray-400 italic hover:underline">Sin nombre</span>
                            <div v-if="order.customerPhone" class="text-xs text-gray-500">
                                {{ order.customerPhone }}
                            </div>
                        </button>
                    </td>

                    <!-- Dirección + Barrio -->
                    <td class="px-4 py-4 max-w-[160px]">
                        <button v-if="order.addressDescription || order.addressAdditionalInfo"
                            class="text-left text-sm text-gray-900 hover:text-emerald-600 hover:underline transition-colors block max-w-full"
                            @click.stop="$emit('edit-address', order)">
                            <span class="block truncate">{{ order.addressDescription || '—' }}</span>
                            <span v-if="order.addressAdditionalInfo"
                                class="block text-xs text-gray-500 font-normal truncate mt-0.5">{{
                                    order.addressAdditionalInfo }}</span>
                        </button>
                        <div v-if="order.neighborhoodName" class="text-xs text-gray-400 truncate">
                            {{ order.neighborhoodName }}
                        </div>
                        <span v-if="!order.addressDescription && !order.addressAdditionalInfo"
                            class="text-sm text-gray-400 italic">—</span>
                    </td>

                    <!-- Fecha evento -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div v-if="order.reservedFor" class="flex flex-col">
                            <span :class="[
                                'text-sm font-semibold',
                                isUpcoming(order.reservedFor) ? 'text-amber-700' : 'text-gray-500'
                            ]">
                                {{ formatDate(order.reservedFor) }}
                            </span>
                            <span class="text-xs text-gray-500">{{ formatTime(order.reservedFor) }}</span>
                        </div>
                        <span v-else class="text-sm text-gray-400 italic">Sin fecha</span>
                    </td>

                    <!-- Preparación -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div v-if="order.prepareAt" class="flex flex-col">
                            <span class="text-sm text-gray-700">{{ formatDate(order.prepareAt) }}</span>
                            <span class="text-xs text-gray-500">{{ formatTime(order.prepareAt) }}</span>
                        </div>
                        <span v-else class="text-xs text-gray-400 italic">—</span>
                    </td>

                    <!-- Total / Abonos -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div class="space-y-1">
                            <div class="flex items-baseline gap-1">
                                <span class="text-sm font-medium text-gray-900">{{ formatCurrency(order.total) }}</span>
                                <span class="text-xs text-gray-400">total</span>
                            </div>
                            <div v-if="order.totalDeposited > 0" class="text-xs text-amber-700 font-medium">
                                {{ formatCurrency(order.totalDeposited) }} abonado
                            </div>
                            <!-- Barra de progreso -->
                            <div v-if="order.total > 0" class="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    class="h-full bg-amber-400 rounded-full transition-all"
                                    :style="{ width: `${Math.min(100, (order.totalDeposited / order.total) * 100)}%` }"
                                />
                            </div>
                            <!-- Botón abono -->
                            <button
                                v-if="order.status !== 'cancelled' && order.status !== 'delivered'"
                                @click.stop="$emit('add-deposit', order)"
                                class="text-xs text-amber-600 hover:text-amber-800 underline decoration-dotted font-medium">
                                + Abono
                            </button>
                        </div>
                    </td>

                    <!-- Estado (solo informativo, no clickeable) -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <span :class="statusBadgeClass(order.status)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                            {{ order.statusDisplayName }}
                        </span>
                    </td>

                    <!-- Registrado -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div class="text-xs text-gray-500">{{ formatDate(order.createdAt) }}</div>
                        <div class="text-xs text-gray-400">{{ formatTime(order.createdAt) }}</div>
                    </td>

                    <!-- Acciones -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <button
                            v-if="order.status !== 'cancelled' && order.status !== 'delivered'"
                            @click.stop="$emit('cancel-reservation', order)"
                            class="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors border border-red-200 hover:border-red-300">
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
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { useFormatting } from '@/composables/useFormatting'
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

const props = defineProps<Props>()

const emit = defineEmits<{
    'edit-customer': [order: OrderListItem]
    'edit-address': [order: OrderListItem]
    'add-deposit': [order: OrderListItem]
    'cancel-reservation': [order: OrderListItem]
    sort: [column: string]
}>()

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

const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
        reservation: 'bg-amber-100 text-amber-800',
        taken: 'bg-blue-100 text-blue-800',
        inPreparation: 'bg-orange-100 text-orange-800',
        ready: 'bg-green-100 text-green-800',
        onTheWay: 'bg-purple-100 text-purple-800',
        delivered: 'bg-gray-100 text-gray-600',
        cancelled: 'bg-red-100 text-red-700',
    }
    return map[status] ?? 'bg-gray-100 text-gray-600'
}
</script>
