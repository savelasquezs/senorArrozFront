<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold text-gray-900">Mi Historial de Entregas ({{ totalCount }})</h3>

            <div class="flex items-center gap-3">
                <NeighborhoodFilter :model-value="filters.neighborhoodId"
                    @update:model-value="handleFilterChange('neighborhoodId', $event)" />

                <div class="flex items-center gap-2">
                    <BaseInput v-model="filters.fromDate" type="date" placeholder="Desde" class="w-40" />
                    <span class="text-gray-500">-</span>
                    <BaseInput v-model="filters.toDate" type="date" placeholder="Hasta" class="w-40" />
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barrio</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efectivo</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="font-bold text-gray-900">#{{ order.id }}</span>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-900">
                                {{ order.addressDescription || '-' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {{ order.neighborhoodName || '-' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {{ order.customerName || order.guestName || '-' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {{ order.customerPhone || '-' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {{ formatCurrency(getCashCollected(order)) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {{ formatCurrency(order.deliveryFee || 0) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {{ formatDeliveryTime(order) }}
                            </td>
                        </tr>
                    </tbody>
                    <tfoot class="bg-gray-50">
                        <tr>
                            <td colspan="5" class="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                Totales:
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                                {{ formatCurrency(totals.cashTotal) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                                {{ formatCurrency(totals.deliveryFeeTotal) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                                {{ formatCurrency(totals.grandTotal) }}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div v-if="orders.length === 0" class="text-center py-12">
                <ClockIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p class="text-gray-500">No hay entregas en este período</p>
            </div>
        </div>

        <BasePagination v-if="totalCount > pageSize" :current-page="page" :total="totalCount" :per-page="pageSize"
            @change="handlePageChange" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OrderListItem } from '@/types/order'
import { DeliveryService } from '@/services/domain/DeliveryService'
import { useFormatting } from '@/composables/useFormatting'
import BaseInput from '@/components/ui/BaseInput.vue'
import BasePagination from '@/components/ui/BasePaginatiopn.vue'
import NeighborhoodFilter from './NeighborhoodFilter.vue'
import { ClockIcon } from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
    totalCount: number
    page: number
    pageSize: number
}

interface Filters {
    fromDate: string
    toDate: string
    neighborhoodId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'page-change': [page: number], 'filter-change': [filters: Filters] }>()

const { formatCurrency } = useFormatting()
const filters = ref<Filters>({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    neighborhoodId: null
})

const totals = computed(() => DeliveryService.calculateTotals(props.orders))

const formatDeliveryTime = (order: OrderListItem): string => {
    const time = DeliveryService.getDeliveryTime(order)
    return DeliveryService.formatDeliveryTime(time)
}

const getCashCollected = (order: OrderListItem): number => {
    return DeliveryService.getCashCollected(order)
}

const handlePageChange = (newPage: number) => {
    emit('page-change', newPage)
}

const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    filters.value[key] = value
    emit('filter-change', { ...filters.value })
}

// Watch para detectar cambios en los filtros y emitir
watch(() => [filters.value.fromDate, filters.value.toDate, filters.value.neighborhoodId], () => {
    emit('filter-change', { ...filters.value })
}, { deep: true })
</script>
