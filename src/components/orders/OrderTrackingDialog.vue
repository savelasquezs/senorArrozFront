<template>
    <BaseDialog :model-value="modelValue" :title="`Seguimiento · Pedido #${order.id} · ${order.branchName}`"
        size="5xl" @update:model-value="emit('update:modelValue', $event)">
        <div class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{{ statusLabel }}<span v-if="snapshot?.deliveryManName"> · {{ snapshot.deliveryManName }}</span></span>
                <BaseButton size="sm" variant="outline" :loading="loading" @click="refresh">Actualizar</BaseButton>
            </div>
            <p v-if="failure" role="alert" class="text-sm text-red-700">{{ failure }}</p>
            <p v-else-if="snapshot?.location" class="text-xs text-gray-600">
                {{ snapshot.location.isFresh ? 'Ubicación reciente' : 'Última ubicación conocida; no es una posición en vivo' }}:
                {{ formatDateTime(snapshot.location.recordedAt) }}
            </p>
            <p v-else-if="snapshot" class="text-sm text-amber-700">
                {{ snapshot.status === 'on_the_way' ? 'Sin ubicación disponible para la ruta activa de este pedido.' : 'El pedido no está en camino. No se muestra la ubicación del domiciliario.' }}
            </p>
            <p v-else-if="loading" class="text-sm text-gray-500">Consultando seguimiento…</p>
            <DeliveryMapAsync v-if="modelValue" :orders="[displayedOrder]" :deliveryman-locations="locations"
                :focus-order-id="order.id" />
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onUnmounted, ref, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { orderManagementApi } from '@/services/MainAPI/orderManagementApi'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useOrderManagementUpdates } from '@/composables/useOrderManagementUpdates'
import { getOrderStatusDisplayName, useFormatting } from '@/composables/useFormatting'
import type { OrderListItem } from '@/types/order'
import type { OrderTracking } from '@/types/orderManagement'
import type { DriverLocation } from '@/components/delivery/DeliveryMap.vue'

const DeliveryMapAsync = defineAsyncComponent(() => import('@/components/delivery/DeliveryMap.vue'))
const props = defineProps<{ modelValue: boolean; order: OrderListItem }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>()
const { formatDateTime } = useFormatting()
const snapshot = ref<OrderTracking | null>(null)
const detail = ref<OrderListItem | null>(null)
const loading = ref(false)
const failure = ref('')
let generation = 0
let inFlight = false
let timer: ReturnType<typeof setInterval> | undefined
const { isPageVisible, isOnline } = useOrderManagementUpdates(
    event => { if (event.orderId === props.order.id) void refresh() },
    () => { void refresh() },
    () => {},
)
const displayedOrder = computed<OrderListItem>(() => ({
    ...(detail.value ?? props.order),
    ...(snapshot.value ? {
        status: snapshot.value.status,
        statusDisplayName: getOrderStatusDisplayName(snapshot.value.status),
        deliveryManId: snapshot.value.deliveryManId,
        deliveryManName: snapshot.value.deliveryManName,
        deliveryRouteId: snapshot.value.deliveryRouteId,
    } : {}),
}))
const statusLabel = computed(() => getOrderStatusDisplayName(snapshot.value?.status ?? props.order.status))
const locations = computed<Record<number, DriverLocation>>(() => {
    const tracking = snapshot.value
    if (!tracking?.location || tracking.status !== 'on_the_way' || tracking.deliveryManId == null) return {}
    return { [tracking.deliveryManId]: {
        lat: tracking.location.latitude, lng: tracking.location.longitude,
        updatedAt: new Date(tracking.location.recordedAt), name: tracking.deliveryManName ?? undefined,
        deliveryRouteId: tracking.deliveryRouteId,
    } }
})
async function refresh() {
    if (!props.modelValue || !isPageVisible.value || !isOnline.value || inFlight) return
    const request = generation
    const orderId = props.order.id
    loading.value = true
    inFlight = true
    try {
        const result = await orderManagementApi.tracking(orderId)
        if (request !== generation || orderId !== props.order.id) return
        if (result.managementVersion !== (detail.value ?? props.order).managementVersion) {
            const current = await orderApi.fetchDetail(orderId)
            if (request !== generation) return
            detail.value = current
        }
        snapshot.value = result
        failure.value = ''
        if (result.status !== 'on_the_way' && timer) { clearInterval(timer); timer = undefined }
        else if (result.status === 'on_the_way' && !timer) timer = setInterval(() => { void refresh() }, 30_000)
    } catch (err: unknown) {
        if (request !== generation) return
        snapshot.value = null // A failed poll must not leave a green live-location indication.
        failure.value = err instanceof Error ? err.message : 'No se pudo consultar el seguimiento.'
    } finally {
        if (request === generation) { inFlight = false; loading.value = false }
    }
}
watch(() => [props.modelValue, props.order.id] as const, ([open]) => {
    generation++
    if (timer) clearInterval(timer)
    timer = undefined
    inFlight = false
    loading.value = false
    snapshot.value = null
    detail.value = null
    failure.value = ''
    if (open) {
        void refresh()
        timer = setInterval(() => { void refresh() }, 30_000)
    }
}, { immediate: true })
onUnmounted(() => { generation++; if (timer) clearInterval(timer) })
</script>
