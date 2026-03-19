<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="font-semibold text-gray-900">Orden de Entrega</h3>
            <button
                @click="openInGoogleMaps"
                :disabled="!hasCoords"
                :class="[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    hasCoords
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                ]"
            >
                <MapIcon class="w-4 h-4" />
                Abrir en Google Maps
            </button>
        </div>

        <p v-if="orderedOrders.length === 0" class="text-sm text-gray-500 text-center py-6">
            No hay pedidos en ruta
        </p>

        <draggable
            v-else
            v-model="orderedOrders"
            item-key="id"
            handle=".drag-handle"
            :animation="150"
            ghost-class="opacity-50"
            tag="div"
            :component-data="{ class: 'space-y-2' }"
            @change="onReordered"
        >
            <template #item="{ element: order }">
                <RouteOrderItem
                    :order="order"
                    @delivered="emit('delivered', $event)"
                    @address-updated="emit('address-updated', $event)"
                />
            </template>
        </draggable>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import draggable from 'vuedraggable'
import RouteOrderItem from './RouteOrderItem.vue'
import type { OrderListItem } from '@/types/order'
import type { GeoLocation } from '@/composables/useGeolocation'
import { MapIcon } from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'route-optimized': [orderIds: number[]]
    'delivered': [orderId: number]
    'address-updated': [payload: { orderId: number, addressDescription?: string, lat?: number, lng?: number }]
}>()

const orderedOrders = ref([...props.orders].sort((a, b) => a.id - b.id))

watch(() => props.orders, (val) => {
    orderedOrders.value = [...val].sort((a, b) => a.id - b.id)
}, { deep: true })

const onReordered = () => {
    emit('route-optimized', orderedOrders.value.map(o => o.id))
}

// ─── Google Maps ──────────────────────────────────────────────

const getOrderCoords = (order: OrderListItem): GeoLocation | null => {
    const o = order as any
    if (typeof o.latitude === 'number' && typeof o.longitude === 'number') {
        return { lat: o.latitude, lng: o.longitude }
    }
    return null
}

const hasCoords = computed(() =>
    orderedOrders.value.some(o => o.type === 'delivery' && getOrderCoords(o) !== null)
)

const openInGoogleMaps = () => {
    const coordsList = orderedOrders.value
        .filter(o => o.type === 'delivery')
        .map(o => getOrderCoords(o))
        .filter(Boolean) as GeoLocation[]

    if (coordsList.length === 0) return

    const destination = coordsList[coordsList.length - 1]
    const rawWaypoints = coordsList.slice(0, coordsList.length - 1)
    const waypoints = rawWaypoints.slice(0, 24)

    const fmt = (p: GeoLocation) => `${p.lat},${p.lng}`
    const base = 'https://www.google.com/maps/dir/?api=1&travelmode=driving'
    const params = [`destination=${encodeURIComponent(fmt(destination))}`]
    if (waypoints.length > 0) {
        params.push(`waypoints=${encodeURIComponent(waypoints.map(fmt).join('|'))}`)
    }
    window.open(`${base}&${params.join('&')}`, '_blank')
}
</script>
