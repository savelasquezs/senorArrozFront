<template>
    <div class="space-y-3 md:space-y-4">
        <!-- Mobile: Header y filtros verticales -->
        <div class="md:flex md:items-center md:justify-between bg-gray-50 p-3 md:p-4 rounded-lg gap-3">
            <h3 class="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-0">Mi Historial ({{ totalCount }})
            </h3>

            <!-- Filtros en desktop -->
            <div class="hidden md:flex items-center gap-3">
                <NeighborhoodFilter :model-value="filters.neighborhoodId"
                    @update:model-value="handleFilterChange('neighborhoodId', $event)" />

                <div class="flex items-center gap-2">
                    <BaseInput v-model="filters.fromDate" type="date" placeholder="Desde" class="w-40" />
                    <span class="text-gray-500">-</span>
                    <BaseInput v-model="filters.toDate" type="date" placeholder="Hasta" class="w-40" />
                </div>
            </div>

            <!-- Filtros en mobile: apilados -->
            <div class="md:hidden space-y-2">
                <NeighborhoodFilter :model-value="filters.neighborhoodId"
                    @update:model-value="handleFilterChange('neighborhoodId', $event)" />
                <div class="flex items-center gap-2">
                    <BaseInput v-model="filters.fromDate" type="date" placeholder="Desde" class="text-sm" />
                    <span class="text-gray-500">-</span>
                    <BaseInput v-model="filters.toDate" type="date" placeholder="Hasta" class="text-sm" />
                </div>
            </div>
        </div>

        <!-- Desktop: Tabla -->
        <div class="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
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
                            <td class="px-6 py-4 whitespace-nowrap">
                                <BaseBadge :variant="getStatusVariant(order.status)">
                                    {{ order.statusDisplayName }}
                                </BaseBadge>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <button v-if="order.status === 'on_the_way'" @click="showConfirmDialog(order)"
                                    :disabled="deliveringOrderId === order.id"
                                    class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <CheckCircleIcon class="w-5 h-5" />
                                </button>
                                <span v-else-if="order.status === 'delivered'" class="text-sm text-gray-500">
                                    Entregado
                                </span>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot class="bg-gray-50">
                        <tr>
                            <td colspan="7" class="px-6 py-4 text-right text-sm font-semibold text-gray-900">
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
                            <td colspan="2" class="px-6 py-4"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div v-if="orders.length === 0" class="text-center py-12">
                <ClockIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p class="text-gray-500">No hay entregas en este período</p>
            </div>
        </div>

        <!-- Mobile: Vista de Cards -->
        <div class="md:hidden space-y-3">
            <div v-for="order in orders" :key="order.id"
                class="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-lg font-bold text-gray-900">#{{ order.id }}</span>
                    <BaseBadge :variant="getStatusVariant(order.status)">
                        {{ order.statusDisplayName }}
                    </BaseBadge>
                </div>

                <div class="text-sm text-gray-700 space-y-1">
                    <div><span class="font-medium">Dirección:</span> {{ order.addressDescription || '-' }}</div>
                    <div><span class="font-medium">Barrio:</span> {{ order.neighborhoodName || '-' }}</div>
                    <div><span class="font-medium">Cliente:</span> {{ order.customerName || order.guestName || '-' }}
                    </div>
                    <div><span class="font-medium">Teléfono:</span> {{ order.customerPhone || '-' }}</div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div>
                        <div class="text-xs text-gray-500">Efectivo</div>
                        <div class="text-sm font-medium text-gray-900">{{ formatCurrency(getCashCollected(order)) }}
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500">Delivery</div>
                        <div class="text-sm font-medium text-gray-900">{{ formatCurrency(order.deliveryFee || 0) }}
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500">Tiempo</div>
                        <div class="text-sm font-medium text-gray-900">{{ formatDeliveryTime(order) }}</div>
                    </div>
                </div>

                <BaseButton v-if="order.status === 'on_the_way'" @click="showConfirmDialog(order)" variant="success"
                    size="sm" :loading="deliveringOrderId === order.id" class="w-full">
                    <span class="flex items-center gap-2 justify-center">
                        <CheckCircleIcon class="w-4 h-4" />
                        Marcar como entregado
                    </span>
                </BaseButton>
            </div>

            <div v-if="orders.length === 0" class="text-center py-12">
                <ClockIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p class="text-gray-500">No hay entregas en este período</p>
            </div>
        </div>

        <BasePagination v-if="totalCount > pageSize" :current-page="page" :total="totalCount" :per-page="pageSize"
            @change="handlePageChange" />
    </div>

    <!-- Modal de confirmación -->
    <BaseDialog :model-value="showModal" @update:model-value="showModal = false" title="Confirmar entrega">
        <div class="space-y-4">
            <p class="text-gray-700">¿Confirmar que el pedido <span class="font-bold">#{{ orderToDeliver?.id }}</span>
                ha sido entregado?</p>

            <div v-if="orderToDeliver" class="bg-gray-50 rounded-lg p-4">
                <div class="space-y-2 text-sm">
                    <div><span class="font-medium">Dirección:</span> {{ orderToDeliver.addressDescription || '-' }}
                    </div>
                    <div><span class="font-medium">Cliente:</span> {{ orderToDeliver.customerName ||
                        orderToDeliver.guestName || '-' }}</div>
                    <div><span class="font-medium">Teléfono:</span> {{ orderToDeliver.customerPhone || '-' }}</div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-3 justify-end">
                <BaseButton @click="showModal = false" variant="outline" :disabled="deliveringOrderId !== null">
                    Cancelar
                </BaseButton>
                <BaseButton @click="handleConfirmDelivery" variant="success"
                    :loading="deliveringOrderId === orderToDeliver?.id">
                    Confirmar entrega
                </BaseButton>
            </div>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OrderListItem } from '@/types/order'
import { DeliveryService } from '@/services/domain/DeliveryService'
import { useFormatting } from '@/composables/useFormatting'
import BaseInput from '@/components/ui/BaseInput.vue'
import BasePagination from '@/components/ui/BasePaginatiopn.vue'
import NeighborhoodFilter from './NeighborhoodFilter.vue'
import { ClockIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { useOrdersDataStore } from '@/store/ordersData'
import { useToast } from '@/composables/useToast'
import type { OrderStatus } from '@/types/order'

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
const emit = defineEmits<{ 'page-change': [page: number], 'filter-change': [filters: Filters], 'order-delivered': [] }>()

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

// Variables para entrega
const ordersStore = useOrdersDataStore()
const { success, error } = useToast()
const deliveringOrderId = ref<number | null>(null)
const showModal = ref(false)
const orderToDeliver = ref<OrderListItem | null>(null)

const getStatusVariant = (status: OrderStatus): 'success' | 'warning' | 'info' | 'default' => {
    switch (status) {
        case 'delivered': return 'success'
        case 'on_the_way': return 'warning'
        case 'ready': return 'info'
        default: return 'default'
    }
}

const showConfirmDialog = (order: OrderListItem) => {
    orderToDeliver.value = order
    showModal.value = true
}

const handleConfirmDelivery = async () => {
    if (!orderToDeliver.value) return

    try {
        deliveringOrderId.value = orderToDeliver.value.id
        await ordersStore.updateStatus(orderToDeliver.value.id, 'delivered')

        success(`Pedido #${orderToDeliver.value.id} marcado como entregado`, 3000)

        // Cerrar modal
        showModal.value = false
        orderToDeliver.value = null

        // Emitir evento para recargar datos
        emit('order-delivered')
    } catch (err: any) {
        error('Error al marcar como entregado', err.message)
    } finally {
        deliveringOrderId.value = null
    }
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
