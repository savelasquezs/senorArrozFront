<template>
    <BaseDialog :model-value="modelValue" :title="`Seguimiento · Pedido #${order.id} · ${order.branchName}`"
        size="5xl" :whatsapp-theme="theme" :z-class="nested ? 'z-[60]' : undefined"
        scroll-body @update:model-value="emit('update:modelValue', $event)">
        <div class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{{ statusLabel }}<span v-if="snapshot?.deliveryManName"> · {{ snapshot.deliveryManName }}</span></span>
                <BaseButton size="sm" variant="outline" :loading="loading" :disabled="!isOnline" @click="refresh">Actualizar</BaseButton>
            </div>
            <p v-if="failure" role="alert" class="text-sm text-red-700">{{ failure }}</p>
            <p v-else-if="snapshot?.location" class="text-xs text-gray-600">
                {{ snapshot.location.isFresh ? 'Ubicación reciente del domiciliario' : 'Última ubicación conocida; no es una posición en vivo' }}:
                {{ formatDateTime(snapshot.location.recordedAt) }}
            </p>
            <p v-else-if="snapshot" class="text-sm text-amber-700">
                {{ snapshot.status === 'on_the_way' ? 'Sin ubicación del domiciliario en la ruta activa de este pedido.' : 'El pedido no está en camino. No se muestra la ubicación del domiciliario.' }}
            </p>
            <p v-else-if="loading" class="text-sm text-gray-500">Consultando seguimiento…</p>
            <p v-if="!isOnline" class="text-sm text-amber-700">Sin conexión. El seguimiento se actualizará al reconectar.</p>
            <p v-if="destinationUnavailable" role="status" class="text-sm text-amber-700">{{ destinationUnavailable }}</p>
            <DeliveryMapAsync v-if="modelValue" :key="theme" :orders="[displayedOrder]" :deliveryman-locations="locations"
                :focus-order-id="order.id" track-focused-order :whatsapp-theme="theme"
                @focus-unavailable="destinationUnavailable = $event" @focus-completed="destinationUnavailable = ''" />
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
import { injectWhatsAppTheme, useSavedWhatsAppTheme } from '@/composables/useWhatsAppTheme'
import { getOrderStatusDisplayName, useFormatting } from '@/composables/useFormatting'
import { useAuthStore } from '@/store/auth'
import type { OrderListItem } from '@/types/order'
import type { OrderTracking } from '@/types/orderManagement'
import type { DriverLocation } from '@/components/delivery/DeliveryMap.vue'

const DeliveryMapAsync = defineAsyncComponent(() => import('@/components/delivery/DeliveryMap.vue'))
const props = defineProps<{ modelValue: boolean; order: OrderListItem; nested?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>()
const { formatDateTime } = useFormatting()
const auth = useAuthStore()
const theme = injectWhatsAppTheme() ?? useSavedWhatsAppTheme(() => auth.user?.id).theme
const snapshot = ref<OrderTracking | null>(null)
const detail = ref<OrderListItem | null>(null)
const loading = ref(false)
const failure = ref('')
const destinationUnavailable = ref('')
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
        snapshot.value = result
        failure.value = ''
        if (result.status !== 'on_the_way' && timer) { clearInterval(timer); timer = undefined }
        else if (result.status === 'on_the_way' && !timer) timer = setInterval(() => { void refresh() }, 30_000)
        if (result.managementVersion !== (detail.value ?? props.order).managementVersion) {
            const current = await orderApi.fetchDetail(orderId)
            if (request === generation && orderId === props.order.id) detail.value = current
        }
    } catch (err: unknown) {
        if (request !== generation) return
        if (snapshot.value) snapshot.value = { ...snapshot.value, location: null }
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
    destinationUnavailable.value = ''
    if (open) {
        void refresh()
        timer = setInterval(() => { void refresh() }, 30_000)
    }
}, { immediate: true })
onUnmounted(() => { generation++; if (timer) clearInterval(timer) })
</script>
