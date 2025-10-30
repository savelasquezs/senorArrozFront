<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Orden de Entrega</h3>
        </div>

        <draggable v-model="orderedOrders" item-key="id" handle=".drag-handle" :animation="150" ghost-class="opacity-50"
            tag="div" :component-data="{ class: 'space-y-2' }" @change="onReordered">
            <template #item="{ element: order, index }">
                <div class="draggable-row p-3 rounded-lg border-2 transition-colors">
                    <div class="flex items-start gap-3">
                        <span
                            class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 select-none text-lg">≡</span>
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-900">
                                #{{ order.id }} · {{ order.addressDescription || 'Sin dirección' }}
                            </div>
                            <div class="text-xs text-gray-500">{{ order.neighborhoodName }}</div>
                            <div v-if="!hasCoords(order)" class="mt-1 text-xs text-amber-700">
                                Sin ubicación •
                                <button class="underline hover:text-amber-800"
                                    @click="emit('geocode-requested', order.id)">Buscar ubicación</button>
                            </div>
                        </div>
                        <span class="text-xs font-semibold text-emerald-700">#{{ index + 1 }}</span>
                    </div>
                </div>
            </template>
        </draggable>

    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import type { OrderListItem } from '@/types/order'

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'route-optimized': [orderIds: number[]], 'geocode-requested': [orderId: number] }>()

const orderedOrders = ref([...props.orders].sort((a, b) => a.id - b.id))
watch(() => props.orders, (val) => {
    orderedOrders.value = [...val].sort((a, b) => a.id - b.id)
}, { deep: true })



const onReordered = () => {
    emit('route-optimized', orderedOrders.value.map(o => o.id))
}

const hasCoords = (order: any) => typeof order?.latitude === 'number' && typeof order?.longitude === 'number'
</script>
