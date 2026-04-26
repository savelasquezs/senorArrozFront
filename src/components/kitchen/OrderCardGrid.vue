<template>
    <div :class="combinedMode ? 'space-y-2 sm:space-y-3' : 'space-y-3 sm:space-y-4'">
        <div v-if="allOrders.length > 0 && showStatusActions && (!combinedMode || canMarkCombinedReady)"
            :class="[
                'rounded-lg',
                combinedMode ? 'bg-gray-50 p-1.5 sm:p-2' : 'bg-gray-50 p-2 sm:p-3 space-y-1.5 sm:space-y-2',
            ]">
            <!-- Controles de selección (vista clásica) -->
            <div v-if="!combinedMode" class="flex items-center justify-between flex-wrap gap-1.5">
                <div class="flex items-center gap-1.5 sm:gap-2">
                    <button @click="selectAll" class="text-xs text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap">
                        Seleccionar todos
                    </button>
                    <button @click="clearSelection" class="text-xs text-gray-600 hover:text-gray-700 font-medium whitespace-nowrap">
                        Limpiar
                    </button>
                    <span v-if="selectedOrders.size > 0" class="text-xs text-gray-600 whitespace-nowrap">
                        {{ selectedOrders.size }} seleccionado(s)
                    </span>
                </div>
            </div>

            <!-- Botones de acción -->
            <div v-if="!combinedMode && (canMoveToPreparation || canMoveToReady)" class="flex items-center gap-1.5 flex-wrap">
                <BaseButton v-if="canMoveToPreparation" @click="handleChangeStatus('in_preparation')" variant="primary"
                    size="sm" class="flex-1 sm:flex-none">
                    <span class="flex items-center gap-1 justify-center">
                        <ArrowRightIcon class="w-3.5 h-3.5" />
                        <span class="text-xs">Pasar a Preparación</span>
                    </span>
                </BaseButton>

                <BaseButton v-if="canMoveToReady" @click="handleChangeStatus('ready')" variant="success" size="sm"
                    class="flex-1 sm:flex-none">
                    <span class="flex items-center gap-1 justify-center">
                        <CheckIcon class="w-3.5 h-3.5" />
                        <span class="text-xs">Marcar como Listo</span>
                    </span>
                </BaseButton>
            </div>
            <div v-else-if="combinedMode && canMarkCombinedReady" class="flex items-center justify-end gap-1.5 flex-wrap">
                <BaseButton @click="handleChangeStatus('ready')" variant="success" size="sm"
                    class="flex-1 sm:flex-none sm:min-w-[10rem]">
                    <span class="flex items-center gap-1 justify-center">
                        <CheckIcon class="w-3.5 h-3.5" />
                        <span class="text-xs">Marcar como Listo</span>
                    </span>
                </BaseButton>
            </div>
        </div>

        <div v-if="!combinedMode && takenOrders.length > 0">
            <h3 class="text-sm sm:text-base font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-yellow-400 rounded-full flex-shrink-0"></span>
                <span>Tomado ({{ takenOrders.length }})</span>
            </h3>
            <div
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2">
                <div v-for="group in takenOrdersGrouped" :key="`taken-${group.label}`" class="min-w-0 flex flex-col gap-2">
                    <h4 class="text-xs sm:text-sm font-medium text-gray-700 border-b border-gray-200 pb-0.5">
                        {{ group.label }}
                        <span class="text-gray-500 font-normal">({{ group.orders.length }})</span>
                    </h4>
                    <div class="flex flex-col gap-2">
                        <OrderCard v-for="order in group.orders" :key="order.id" :order="order"
                            :order-items="getOrderItems(order.id)" :is-selected="selectedOrders.has(order.id)"
                            :selectable="showStatusActions" @toggle-select="toggleSelect" />
                    </div>
                </div>
            </div>
        </div>

        <div v-if="!combinedMode && inPreparationOrders.length > 0">
            <h3 class="text-sm sm:text-base font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                <span>En Preparación ({{ inPreparationOrders.length }})</span>
            </h3>
            <div
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2">
                <div v-for="group in inPreparationOrdersGrouped" :key="`prep-${group.label}`" class="min-w-0 flex flex-col gap-2">
                    <h4 class="text-xs sm:text-sm font-medium text-gray-700 border-b border-gray-200 pb-0.5">
                        {{ group.label }}
                        <span class="text-gray-500 font-normal">({{ group.orders.length }})</span>
                    </h4>
                    <div class="flex flex-col gap-2">
                        <OrderCard v-for="order in group.orders" :key="order.id" :order="order"
                            :order-items="getOrderItems(order.id)" :is-selected="selectedOrders.has(order.id)"
                            :selectable="showStatusActions" @toggle-select="toggleSelect" />
                    </div>
                </div>
            </div>
        </div>

        <div v-if="combinedMode && allOrders.length > 0">
            <h3 class="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full flex-shrink-0"></span>
                <span>Tomado + En preparación ({{ allOrders.length }})</span>
            </h3>
            <div
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2">
                <div v-for="group in combinedOrdersGrouped" :key="`comb-${group.label}`" class="min-w-0 flex flex-col gap-2">
                    <h4 class="text-xs sm:text-sm font-medium text-gray-700 border-b border-gray-200 pb-0.5">
                        {{ group.label }}
                        <span class="text-gray-500 font-normal">({{ group.orders.length }})</span>
                    </h4>
                    <div class="flex flex-col gap-2">
                        <OrderCard v-for="order in group.orders" :key="order.id" :order="order"
                            :order-items="getOrderItems(order.id)" :is-selected="selectedOrders.has(order.id)"
                            :selectable="showStatusActions" @toggle-select="toggleSelect" />
                    </div>
                </div>
            </div>
        </div>

        <div v-if="allOrders.length === 0" class="text-center py-8 sm:py-12">
            <CheckCircleIcon class="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p class="text-gray-500 text-base sm:text-lg">No hay pedidos pendientes</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { OrderListItem, OrderDetailItem, OrderStatus } from '@/types/order'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import OrderCard from './OrderCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowRightIcon, CheckIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
    orderItemsMap: Map<number, OrderDetailItem[]>
    /** false en pestaña Reservas: sin selección ni botones de estado. */
    showStatusActions?: boolean
    /** Unifica Tomado y En preparación; solo el botón «Marcar como Listo» (encadena vía confirmación en la vista). */
    combinedMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showStatusActions: true,
    combinedMode: false,
})
const emit = defineEmits<{ 'change-status': [orderIds: number[], newStatus: OrderStatus] }>()

const { canChangeStatus } = useOrderPermissions()
const selectedOrders = ref(new Set<number>())

const SIN_CATEGORIA = 'Sin categoría'

const takenOrders = computed(() => props.orders.filter(o => o.status === 'taken'))
const inPreparationOrders = computed(() => props.orders.filter(o => o.status === 'in_preparation'))
const allOrders = computed(() => props.orders)

/** Categoría del primer ítem del pedido (por id de línea), para subagrupar en cocina. */
const firstLineCategoryLabel = (orderId: number): string => {
    const items = props.orderItemsMap.get(orderId) ?? []
    if (items.length === 0) return SIN_CATEGORIA
    const first = [...items].sort((a, b) => a.id - b.id)[0]
    const name = first.productCategoryName?.trim()
    return name || SIN_CATEGORIA
}

const groupOrdersByFirstLineCategory = (orders: OrderListItem[]): { label: string; orders: OrderListItem[] }[] => {
    const map = new Map<string, OrderListItem[]>()
    for (const o of orders) {
        const label = firstLineCategoryLabel(o.id)
        if (!map.has(label)) map.set(label, [])
        map.get(label)!.push(o)
    }
    const rows = [...map.entries()].map(([label, list]) => ({ label, orders: list }))
    rows.sort((a, b) => {
        if (a.label === SIN_CATEGORIA && b.label !== SIN_CATEGORIA) return 1
        if (b.label === SIN_CATEGORIA && a.label !== SIN_CATEGORIA) return -1
        return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
    })
    return rows
}

const takenOrdersGrouped = computed(() => groupOrdersByFirstLineCategory(takenOrders.value))
const inPreparationOrdersGrouped = computed(() => groupOrdersByFirstLineCategory(inPreparationOrders.value))
const combinedOrdersGrouped = computed(() => groupOrdersByFirstLineCategory(allOrders.value))

const toggleSelect = (orderId: number) => {
    if (selectedOrders.value.has(orderId)) {
        selectedOrders.value.delete(orderId)
    } else {
        selectedOrders.value.add(orderId)
    }
}

const selectAll = () => {
    props.orders.forEach(order => selectedOrders.value.add(order.id))
}

const clearSelection = () => {
    selectedOrders.value.clear()
}

const getOrderItems = (orderId: number): OrderDetailItem[] => {
    return props.orderItemsMap.get(orderId) || []
}

const canMoveToPreparation = computed(() => {
    if (selectedOrders.value.size === 0) return false
    return Array.from(selectedOrders.value).every(id => {
        const order = props.orders.find(o => o.id === id)
        return order && canChangeStatus(order, 'in_preparation')
    })
})

const canMoveToReady = computed(() => {
    if (selectedOrders.value.size === 0) return false
    return Array.from(selectedOrders.value).every(id => {
        const order = props.orders.find(o => o.id === id)
        return order && canChangeStatus(order, 'ready')
    })
})

/** Modo combinado: solo «Marcar listo»; tomado requiere permiso a preparación, en preparación a listo. */
const canMarkCombinedReady = computed(() => {
    if (selectedOrders.value.size === 0) return false
    return Array.from(selectedOrders.value).every((id) => {
        const order = props.orders.find((o) => o.id === id)
        if (!order) return false
        if (order.status === 'taken') return canChangeStatus(order, 'in_preparation')
        if (order.status === 'in_preparation') return canChangeStatus(order, 'ready')
        return false
    })
})

const handleChangeStatus = (newStatus: OrderStatus) => {
    emit('change-status', Array.from(selectedOrders.value), newStatus)
}

defineExpose({ clearSelection })
</script>
