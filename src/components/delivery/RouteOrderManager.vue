<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Orden de Entrega</h3>
        </div>

        <draggable v-model="orderedOrders" item-key="id" handle=".drag-handle" :animation="150" ghost-class="opacity-50"
            tag="div" :component-data="{ class: 'space-y-2' }" @change="onReordered">
            <template #item="{ element: order }">
                <RouteOrderItem :order="order" @delivered="emit('delivered', $event)"
                    @addressUpdated="emit('address-updated', $event)" />
            </template>
        </draggable>

    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import RouteOrderItem from './RouteOrderItem.vue'
import type { OrderListItem } from '@/types/order'

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'route-optimized': [orderIds: number[]],
    'geocode-requested': [orderId: number],
    'delivered': [orderId: number],
    'address-updated': [payload: { orderId: number, addressDescription?: string, lat?: number, lng?: number }]
}>()

const orderedOrders = ref([...props.orders].sort((a, b) => a.id - b.id))
watch(() => props.orders, (val) => {
    orderedOrders.value = [...val].sort((a, b) => a.id - b.id)
}, { deep: true })



const onReordered = () => {
    emit('route-optimized', orderedOrders.value.map(o => o.id))
}

</script>
