<template>
    <div class="space-y-6">
        <div v-if="allOrders.length > 0" class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center gap-4">
                <button @click="selectAll" class="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    Seleccionar todos
                </button>
                <button @click="clearSelection" class="text-sm text-gray-600 hover:text-gray-700 font-medium">
                    Limpiar selección
                </button>
                <span v-if="selectedOrders.size > 0" class="text-sm text-gray-600">
                    {{ selectedOrders.size }} seleccionado(s)
                </span>
            </div>

            <div class="flex items-center gap-2">
                <BaseButton v-if="canMoveToPreparation" @click="handleChangeStatus('in_preparation')" variant="primary"
                    size="sm">
                    <span class="flex items-center gap-2">
                        <ArrowRightIcon class="w-4 h-4" />
                        Pasar a Preparación
                    </span>
                </BaseButton>

                <BaseButton v-if="canMoveToReady" @click="handleChangeStatus('ready')" variant="success" size="sm">
                    <span class="flex items-center gap-2">
                        <CheckIcon class="w-4 h-4" />
                        Marcar como Listo
                    </span>
                </BaseButton>
            </div>
        </div>

        <div v-if="takenOrders.length > 0">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
                Tomado ({{ takenOrders.length }})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <OrderCard v-for="order in takenOrders" :key="order.id" :order="order"
                    :order-items="getOrderItems(order.id)" :is-selected="selectedOrders.has(order.id)"
                    @toggle-select="toggleSelect" />
            </div>
        </div>

        <div v-if="inPreparationOrders.length > 0">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span class="w-3 h-3 bg-blue-400 rounded-full"></span>
                En Preparación ({{ inPreparationOrders.length }})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <OrderCard v-for="order in inPreparationOrders" :key="order.id" :order="order"
                    :order-items="getOrderItems(order.id)" :is-selected="selectedOrders.has(order.id)"
                    @toggle-select="toggleSelect" />
            </div>
        </div>

        <div v-if="allOrders.length === 0" class="text-center py-12">
            <CheckCircleIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500 text-lg">No hay pedidos pendientes</p>
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
