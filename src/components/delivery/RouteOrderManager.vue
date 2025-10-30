<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Orden de Entrega</h3>
            <BaseButton @click="optimizeRoute" variant="outline" size="sm">
                Optimizar ruta

            </BaseButton>
        </div>

        <VueDraggableNext v-model="orderedOrders" item-key="id" handle=".handle" animation="150"
            @end="emit('route-optimized', orderedOrders.map(o => o.id))" class="space-y-2">
            <template #item="{ element: order, index }">
                <div :class="[
                    'p-3 rounded-lg border-2 transition-colors cursor-grab',
                    index === 0 ? 'ring-2 ring-emerald-500' : 'border-gray-200 bg-white hover:bg-gray-50'
                ]">
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-emerald-600">#{{ index + 1 }}</span>
                        <span class="font-bold text-gray-900">#{{ order.id }}</span>
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-900">
                                {{ order.addressDescription || 'Sin dirección' }}
                            </div>
                            <div class="text-xs text-gray-500">{{ order.neighborhoodName }}</div>
                            <div v-if="!hasCoords(order)" class="mt-1 text-xs text-amber-700">
                                Sin ubicación •
                                <button class="underline hover:text-amber-800"
                                    @click="emit('geocode-requested', order.id)">Buscar ubicación</button>
                            </div>
                        </div>
                        <svg class="w-5 h-5 text-gray-400 handle" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 18V5" />
                            <path d="M15 18V5" />
                        </svg>
                    </div>
                </div>
            </template>
        </VueDraggableNext>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueDraggableNext } from 'vue-draggable-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { OrderListItem } from '@/types/order'

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'route-optimized': [orderIds: number[]], 'geocode-requested': [orderId: number] }>()

const orderedOrders = ref<OrderListItem[]>([])

watch(() => props.orders, (val) => {
    orderedOrders.value = [...val]
}, { immediate: true, deep: true })

const optimizeRoute = () => {
    emit('route-optimized', orderedOrders.value.map(o => o.id))
}
watch(() => props.orders, (val) => {
    console.log('📦 Pedidos recibidos en RouteOrderManager:', val)
    orderedOrders.value = [...val]
}, { immediate: true, deep: true })

const hasCoords = (order: any) => typeof order?.latitude === 'number' && typeof order?.longitude === 'number'
</script>
