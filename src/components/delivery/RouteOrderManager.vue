<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Orden de Entrega</h3>
            <BaseButton @click="optimizeRoute" variant="outline" size="sm">
                Optimizar ruta
            </BaseButton>
        </div>

        <div class="space-y-2">
            <div v-for="(order, index) in orderedOrders" :key="order.id" draggable="true"
                @dragstart="handleDragStart(index, $event)" @dragover.prevent="handleDragOver(index)"
                @drop="handleDrop(index, $event)" :class="[
                    'p-3 rounded-lg border-2 cursor-move transition-colors',
                    dragOverIndex === index ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50',
                    index === 0 ? 'ring-2 ring-emerald-500' : ''
                ]">
                <div class="flex items-center gap-3">
                    <span class="font-bold text-emerald-600">#{{ index + 1 }}</span>
                    <span class="font-bold text-gray-900">#{{ order.id }}</span>
                    <div class="flex-1">
                        <div class="text-sm font-medium text-gray-900">
                            {{ order.addressDescription || 'Sin dirección' }}
                        </div>
                        <div class="text-xs text-gray-500">{{ order.neighborhoodName }}</div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18V5" />
                        <path d="M15 18V5" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { OrderListItem } from '@/types/order'

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'route-optimized': [orderIds: number[]] }>()

const orderedOrders = ref<OrderListItem[]>([])
const dragOverIndex = ref<number | null>(null)
const draggedIndex = ref<number | null>(null)

watch(() => props.orders, (val) => {
    orderedOrders.value = [...val]
}, { immediate: true, deep: true })

const handleDragStart = (index: number, event: DragEvent) => {
    draggedIndex.value = index
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDragOver = (index: number) => {
    dragOverIndex.value = index
}

const handleDrop = (index: number, event: DragEvent) => {
    event.preventDefault()
    dragOverIndex.value = null

    if (draggedIndex.value === null || draggedIndex.value === index) return

    const newOrders = [...orderedOrders.value]
    const [removed] = newOrders.splice(draggedIndex.value, 1)
    newOrders.splice(index, 0, removed)

    orderedOrders.value = newOrders
    draggedIndex.value = null

    emit('route-optimized', newOrders.map(o => o.id))
}

const optimizeRoute = () => {
    emit('route-optimized', orderedOrders.value.map(o => o.id))
}
</script>
