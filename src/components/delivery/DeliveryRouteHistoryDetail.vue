<template>
  <div class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(230px,1fr)]">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 lg:col-span-2">
      <div><p class="text-xs font-medium text-emerald-800">Tiempo total de la ruta</p><p class="mt-1 text-xl font-bold text-slate-900">{{ routeTiming.duration }}</p><p class="text-[11px] text-slate-500">{{ routeTiming.description }}</p></div>
      <div class="space-y-1 text-xs text-slate-600"><p><span class="font-medium">Salida:</span> {{ routeTiming.start ? date(routeTiming.start) : 'Sin registrar' }}</p><p><span class="font-medium">{{ detail.returnIsInconsistent ? 'Cierre registrado:' : 'Regreso:' }}</span> {{ detail.completedAtUtc ? date(detail.completedAtUtc) : 'Sin registrar' }}</p></div>
    </div>
    <div><DeliveryRouteHistoryMap :detail="detail" :selected-order-id="selectedOrder" @select="selectedOrder = $event" />
      <p class="mt-2 text-xs font-semibold text-slate-700">{{ history.label }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ history.caption }}</p></div>
    <div class="min-w-0"><p class="mb-3 text-sm font-semibold text-slate-800">{{ driverName }} · {{ detail.stops.length }} {{ detail.stops.length === 1 ? 'pedido' : 'pedidos' }}</p>
      <ul class="max-h-96 space-y-2 overflow-y-auto"><li v-for="stop in history.stops" :key="stop.orderId"><button type="button" class="w-full rounded-xl border p-3 text-left" :class="selectedOrder === stop.orderId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'" @click="selectedOrder = stop.orderId">
        <p class="text-xs font-semibold text-slate-800">{{ stop.stopSequence }} · Pedido #{{ stop.orderId }}</p>
        <p class="mt-2 text-xs font-semibold text-blue-800">{{ stop.isPending ? stop.isOnTheWay ? 'Pedido en camino · Pendiente de entrega' : 'Pedido pendiente de entrega' : `Tiempo de entrega: ${stopTiming(stop).duration}` }}</p>
        <p class="text-[10px] text-slate-500">{{ stopTiming(stop).reference }}</p>
        <p v-if="stop.onTheWayAtUtc" class="mt-1 text-[11px] text-slate-500">En camino: {{ date(stop.onTheWayAtUtc) }}</p>
        <p class="mt-1 text-xs text-slate-600">{{ stop.addressSnapshotText || stop.addressText || 'Dirección sin registrar' }}</p>
        <p v-if="stop.customerName" class="mt-1 text-[11px] text-slate-500">{{ stop.customerName }}</p>
        <p class="mt-1 text-[11px] text-slate-500">{{ stop.deliveredAtUtc ? `Entregado: ${date(stop.deliveredAtUtc)}` : stop.isPending ? 'Aún no entregado' : 'Sin hora de entrega' }}</p>
        <p v-if="!hasRouteCoordinates(stop.latitude, stop.longitude)" class="mt-1 text-[11px] text-amber-700">Sin coordenadas para el marcador</p>
      </button></li></ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DeliveryRouteHistoryMap from './DeliveryRouteHistoryMap.vue'
import { defaultBusinessCalendar } from '@/utils/datetime'
import { deliveryRouteHistory, deliveryRouteTiming, deliveryStopTiming, hasRouteCoordinates } from '@/helpers/deliveryRouteHistory'
import type { DeliveryRouteDetail } from '@/types/deliveryPerformance'

const props = defineProps<{ detail: DeliveryRouteDetail; driverName?: string }>()
const selectedOrder = ref<number | null>(null)
const history = computed(() => deliveryRouteHistory(props.detail))
const routeTiming = computed(() => deliveryRouteTiming(props.detail))
const stopTiming = deliveryStopTiming
const date = (value: string) => defaultBusinessCalendar.formatDateTime(value)
watch(() => props.detail.routeId, () => { selectedOrder.value = null })
</script>
