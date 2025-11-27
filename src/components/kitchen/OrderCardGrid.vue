<template>
    <div class="space-y-4 sm:space-y-6">
        <div v-if="allOrders.length > 0" class="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
            <!-- Controles de selección y contador -->
            <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2 sm:gap-3 md:gap-4">
                    <button @click="selectAll" class="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap">
                        Seleccionar todos
                    </button>
                    <button @click="clearSelection" class="text-xs sm:text-sm text-gray-600 hover:text-gray-700 font-medium whitespace-nowrap">
                        Limpiar
                    </button>
                    <span v-if="selectedOrders.size > 0" class="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        {{ selectedOrders.size }} seleccionado(s)
                    </span>
                </div>
            </div>

            <!-- Botones de acción -->
            <div v-if="canMoveToPreparation || canMoveToReady" class="flex items-center gap-2 flex-wrap">
                <BaseButton v-if="canMoveToPreparation" @click="handleChangeStatus('in_preparation')" variant="primary"
                    size="sm" class="flex-1 sm:flex-none">
                    <span class="flex items-center gap-1 sm:gap-2 justify-center">
                        <ArrowRightIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span class="text-xs sm:text-sm">Pasar a Preparación</span>
                    </span>
                </BaseButton>

                <BaseButton v-if="canMoveToReady" @click="handleChangeStatus('ready')" variant="success" size="sm"
                    class="flex-1 sm:flex-none">
                    <span class="flex items-center gap-1 sm:gap-2 justify-center">
                        <CheckIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span class="text-xs sm:text-sm">Marcar como Listo</span>
                    </span>
                </BaseButton>
            </div>
        </div>

        <div v-if="takenOrders.length > 0">
            <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full flex-shrink-0"></span>
                <span>Tomado ({{ takenOrders.length }})</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                <OrderCard v-for="order in takenOrders" :key="order.id" :order="order"
                    :order-items="getOrderItems(order.id)" :is-selected="selectedOrders.has(order.id)"
                    @toggle-select="toggleSelect" />
            </div>
        </div>

        <div v-if="inPreparationOrders.length > 0">
            <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-400 rounded-full flex-shrink-0"></span>
                <span>En Preparación ({{ inPreparationOrders.length }})</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                <OrderCard v-for="order in inPreparationOrders" :key="order.id" :order="order"
                    :order-items="getOrderItems(order.id)" :is-selected="selectedOrders.has(order.id)"
                    @toggle-select="toggleSelect" />
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
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'change-status': [orderIds: number[], newStatus: OrderStatus] }>()

const { canChangeStatus } = useOrderPermissions()
const selectedOrders = ref(new Set<number>())

const takenOrders = computed(() => props.orders.filter(o => o.status === 'taken'))
const inPreparationOrders = computed(() => props.orders.filter(o => o.status === 'in_preparation'))
const allOrders = computed(() => props.orders)

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

const handleChangeStatus = (newStatus: OrderStatus) => {
    emit('change-status', Array.from(selectedOrders.value), newStatus)
}

defineExpose({ clearSelection })
</script>
