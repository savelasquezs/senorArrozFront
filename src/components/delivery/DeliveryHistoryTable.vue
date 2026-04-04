<template>
    <div class="flex flex-col gap-3 md:gap-4 max-h-[min(80vh,44rem)] min-h-0">
        <!-- Mobile: Header y filtros verticales -->
        <div class="shrink-0 md:flex md:items-center md:justify-between bg-gray-50 p-3 md:p-4 rounded-lg gap-3">
            <h3 class="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-0">Mi Historial ({{ totalCount }})
            </h3>

            <!-- Filtros en desktop -->
            <div class="hidden md:flex items-center gap-3">
                <NeighborhoodFilter :model-value="neighborhoodId" :options="neighborhoodOptions"
                    @update:model-value="onNeighborhoodChange" />

                <div class="flex items-center gap-2">
                    <BaseInput :model-value="fromDate" type="date" placeholder="Desde" class="w-40"
                        @update:model-value="onFromDate" />
                    <span class="text-gray-500">-</span>
                    <BaseInput :model-value="toDate" type="date" placeholder="Hasta" class="w-40"
                        @update:model-value="onToDate" />
                </div>
            </div>

            <!-- Filtros en mobile: apilados -->
            <div class="md:hidden space-y-2">
                <NeighborhoodFilter :model-value="neighborhoodId" :options="neighborhoodOptions"
                    @update:model-value="onNeighborhoodChange" />
                <div class="flex items-center gap-2">
                    <BaseInput :model-value="fromDate" type="date" placeholder="Desde" class="text-sm"
                        @update:model-value="onFromDate" />
                    <span class="text-gray-500">-</span>
                    <BaseInput :model-value="toDate" type="date" placeholder="Hasta" class="text-sm"
                        @update:model-value="onToDate" />
                </div>
            </div>
        </div>

        <!-- Lista con scroll (muchos pedidos / página 100) -->
        <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden space-y-3 md:space-y-4 pr-0.5">
        <!-- Desktop: Tabla -->
        <div class="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
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
                        <tr v-for="order in displayedOrders" :key="order.id" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="font-bold text-gray-900">#{{ order.id }}</span>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-900">
                                <div class="flex items-start gap-2">
                                    <div class="min-w-0 flex-1">
                                        <div>{{ order.addressDescription || '-' }}</div>
                                        <div v-if="order.addressAdditionalInfo" class="text-xs text-gray-500 mt-0.5">{{
                                            order.addressAdditionalInfo }}</div>
                                    </div>
                                    <button
                                        v-if="canEditOrderAddress(order)"
                                        type="button"
                                        class="shrink-0 p-1 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                        title="Editar dirección"
                                        @click="openAddressFlow(order)"
                                    >
                                        <PencilSquareIcon class="w-5 h-5" />
                                    </button>
                                </div>
                                <div v-if="orderNotes(order)"
                                    class="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1.5 whitespace-pre-wrap">
                                    <span class="font-semibold">Notas: </span>{{ orderNotes(order) }}
                                </div>
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
                                {{ formatCurrency(displayedTotals.cashTotal) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                                {{ formatCurrency(displayedTotals.deliveryFeeTotal) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                                {{ formatCurrency(displayedTotals.grandTotal) }}
                            </td>
                            <td colspan="2" class="px-6 py-4"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div v-if="displayedOrders.length === 0" class="text-center py-12">
                <ClockIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p class="text-gray-500">No hay entregas en este período</p>
            </div>
        </div>

        <!-- Mobile: Vista de Cards -->
        <div class="md:hidden space-y-3">
            <div v-for="order in displayedOrders" :key="order.id"
                class="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-lg font-bold text-gray-900">#{{ order.id }}</span>
                    <BaseBadge :variant="getStatusVariant(order.status)">
                        {{ order.statusDisplayName }}
                    </BaseBadge>
                </div>

                <div class="text-sm text-gray-700 space-y-1">
                    <div class="flex items-start gap-2">
                        <div class="min-w-0 flex-1">
                            <span class="font-medium">Dirección:</span> {{ order.addressDescription || '-' }}
                            <span v-if="order.addressAdditionalInfo" class="block text-xs text-gray-500 mt-0.5">{{
                                order.addressAdditionalInfo }}</span>
                        </div>
                        <button
                            v-if="canEditOrderAddress(order)"
                            type="button"
                            class="shrink-0 p-1 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Editar dirección"
                            @click="openAddressFlow(order)"
                        >
                            <PencilSquareIcon class="w-5 h-5" />
                        </button>
                    </div>
                    <div><span class="font-medium">Barrio:</span> {{ order.neighborhoodName || '-' }}</div>
                    <div><span class="font-medium">Cliente:</span> {{ order.customerName || order.guestName || '-' }}
                    </div>
                    <div><span class="font-medium">Teléfono:</span> {{ order.customerPhone || '-' }}</div>
                    <div v-if="orderNotes(order)"
                        class="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-1 whitespace-pre-wrap">
                        <span class="font-semibold">Notas del pedido:</span> {{ orderNotes(order) }}
                    </div>
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

            <div v-if="displayedOrders.length === 0" class="text-center py-12">
                <ClockIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p class="text-gray-500">No hay entregas en este período</p>
            </div>
        </div>

        </div>

        <div class="shrink-0 pt-1">
            <BasePagination v-if="totalCount > pageSize" :current-page="page" :total="totalCount" :per-page="pageSize"
                @change="handlePageChange" />
        </div>
    </div>

    <!-- Modal de confirmación -->
    <BaseDialog :model-value="showModal" @update:model-value="showModal = false" title="Confirmar entrega">
        <div class="space-y-4">
            <p class="text-gray-700">¿Confirmar que el pedido <span class="font-bold">#{{ orderToDeliver?.id }}</span>
                ha sido entregado?</p>

            <div v-if="orderToDeliver" class="bg-gray-50 rounded-lg p-4">
                <div class="space-y-2 text-sm">
                    <div><span class="font-medium">Dirección:</span> {{ orderToDeliver.addressDescription || '-' }}
                        <span v-if="orderToDeliver.addressAdditionalInfo" class="block text-gray-600 mt-0.5">{{
                            orderToDeliver.addressAdditionalInfo }}</span>
                    </div>
                    <div><span class="font-medium">Cliente:</span> {{ orderToDeliver.customerName ||
                        orderToDeliver.guestName || '-' }}</div>
                    <div><span class="font-medium">Teléfono:</span> {{ orderToDeliver.customerPhone || '-' }}</div>
                    <div v-if="orderNotes(orderToDeliver)"
                        class="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5 mt-2 whitespace-pre-wrap">
                        <span class="font-semibold">Notas del pedido: </span>{{ orderNotes(orderToDeliver) }}
                    </div>
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

    <EditDeliveryAddressFlow
        v-model="addressFlowOpen"
        :order="addressFlowOrder"
        @address-updated="onAddressFlowUpdated"
    />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OrderListItem } from '@/types/order'
import { DeliveryService } from '@/services/domain/DeliveryService'
import { useFormatting } from '@/composables/useFormatting'
import BaseInput from '@/components/ui/BaseInput.vue'
import BasePagination from '@/components/ui/BasePaginatiopn.vue'
import NeighborhoodFilter from './NeighborhoodFilter.vue'
import { ClockIcon, CheckCircleIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import EditDeliveryAddressFlow from '@/components/delivery/EditDeliveryAddressFlow.vue'
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
    /** YYYY-MM-DD — sincronizado con el store (por defecto hoy local) */
    fromDate: string
    toDate: string
    neighborhoodId: number | null
    neighborhoodOptions: Array<{ id: number; name: string }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'page-change': [page: number]
    'filter-change': [filters: { fromDate: string; toDate: string }]
    'update:neighborhoodId': [id: number | null]
    'order-delivered': []
    'address-updated': [payload: { orderId: number; addressDescription?: string; lat?: number; lng?: number }]
}>()

const { formatCurrency } = useFormatting()

const orderNotes = (order: OrderListItem): string => (order.notes ?? '').trim()

const addressFlowOpen = ref(false)
const addressFlowOrder = ref<OrderListItem | null>(null)

function canEditOrderAddress(order: OrderListItem): boolean {
    return Boolean(order.customerId && order.addressId)
}

function openAddressFlow(order: OrderListItem) {
    addressFlowOrder.value = order
    addressFlowOpen.value = true
}

function onAddressFlowUpdated(payload: {
    orderId: number
    addressDescription?: string
    lat?: number
    lng?: number
}) {
    emit('address-updated', payload)
}

watch(addressFlowOpen, (open) => {
    if (!open) addressFlowOrder.value = null
})

const displayedOrders = computed(() => props.orders)

const displayedTotals = computed(() => DeliveryService.calculateTotals(displayedOrders.value))

const emitDateFilterChange = (fromDate: string, toDate: string) => {
    emit('filter-change', { fromDate, toDate })
}

const onFromDate = (v: string | number | null) => {
    emitDateFilterChange(String(v ?? ''), props.toDate)
}

const onToDate = (v: string | number | null) => {
    emitDateFilterChange(props.fromDate, String(v ?? ''))
}

const onNeighborhoodChange = (id: number | null) => {
    emit('update:neighborhoodId', id)
}

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
</script>
