<template>
  <section class="group relative min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="route-history-heading">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100" :class="compact ? 'px-2 py-1.5' : 'px-5 py-4'">
      <div>
        <h2 id="route-history-heading" class="font-semibold text-slate-900" :class="compact ? 'text-[11px]' : ''">Últimas rutas</h2>
        <p class="text-slate-500" :class="compact ? 'text-[9px]' : 'mt-1 text-xs'">{{ compact ? 'Hover: mapa · Clic: detalle' : 'Pasa sobre una ruta para previsualizarla. Haz clic para explorar sus pedidos.' }}</p>
      </div>
      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600">{{ routes.length }} recientes</span>
    </div>
    <p v-if="!routes.length" class="p-10 text-center text-sm text-slate-500">No hay rutas completadas en este periodo.</p>
    <div v-else class="grid min-w-0" :class="compact ? '' : 'xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'">
      <div class="min-w-0" :class="compact ? 'p-1' : 'p-3'">
        <ul class="divide-y divide-slate-100" :class="compact ? 'max-h-[64px] overflow-y-auto' : ''" :tabindex="compact ? 0 : undefined" aria-label="Lista de rutas recientes">
          <li v-for="route in visibleRoutes" :key="route.id">
            <button type="button" class="w-full rounded-lg text-left transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
              :class="[compact ? 'px-1.5 py-1' : 'px-3 py-3', selected?.id === route.id ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : '']"
              :aria-label="`Ver recorrido de ${route.deliverymanName}, ruta ${route.id}`"
              @pointerenter="preview(route)" @pointerleave="cancelPreview" @focus="select(route)" @click="open(route)">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0"><p class="truncate font-semibold text-slate-800" :class="compact ? 'text-[10px]' : 'text-sm'">{{ route.deliverymanName }} <span class="font-normal text-slate-400">#{{ route.id }}</span></p>
                  <p class="truncate text-slate-500" :class="compact ? 'text-[9px]' : 'mt-0.5 text-[11px]'" :title="date(route.completedAtUtc)">{{ compact ? compactDate(route.completedAtUtc) : date(route.completedAtUtc) }} · {{ route.branchName }}</p></div>
                <span class="shrink-0 rounded-full px-1.5 py-0.5 font-semibold" :class="[compact ? 'text-[9px]' : 'text-[10px]', route.metSla === true ? 'bg-emerald-100 text-emerald-800' : route.metSla === false ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500']">{{ route.metSla === true ? 'A tiempo' : route.metSla === false ? 'Con retraso' : 'Sin SLA' }}</span>
              </div>
              <div class="flex flex-wrap text-slate-600" :class="compact ? 'gap-x-2 text-[9px]' : 'mt-2 gap-x-4 gap-y-1 text-xs'">
                <span><strong class="text-slate-800">{{ route.deliveredCount }}</strong> pedidos</span>
                <span v-if="route.returnIsInconsistent" class="font-medium text-amber-700">Regreso inconsistente</span>
                <span v-else><strong class="text-slate-800">{{ number(route.durationMinutes) }}</strong> min <span v-if="!compact" class="text-slate-400">/ meta {{ number(route.metaMinutes) }}</span></span>
                <span v-if="route.gpsDistanceKm != null"><strong class="text-slate-800">{{ number(route.gpsDistanceKm) }}</strong> km GPS</span>
                <span v-else class="text-slate-400">{{ number(route.plannedDistanceKm) }} km planificados</span>
              </div>
            </button>
          </li>
        </ul>
        <div v-if="routes.length > pageSize" class="flex items-center justify-between border-t border-slate-100 px-1 text-slate-500" :class="compact ? 'mt-1 pt-1 text-[9px]' : 'mt-3 pt-3 text-xs'">
          <span>{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, routes.length) }} de {{ routes.length }}</span>
          <div class="flex gap-1"><button type="button" class="rounded border disabled:opacity-40" :class="compact ? 'px-2 py-0.5' : 'px-3 py-2'" :disabled="page === 1" @click="page--">Anterior</button><button type="button" class="rounded border disabled:opacity-40" :class="compact ? 'px-2 py-0.5' : 'px-3 py-2'" :disabled="page * pageSize >= routes.length" @click="page++">Siguiente</button></div>
        </div>
      </div>
      <aside v-if="!compact || (selected && !modalOpen)" class="min-w-0 border border-slate-100 bg-white" :class="compact ? 'absolute bottom-full right-0 z-20 mb-2 hidden w-[min(420px,90vw)] rounded-xl p-2 shadow-xl min-[56.25rem]:group-hover:block min-[56.25rem]:group-focus-within:block' : 'hidden border-l p-4 xl:block'" aria-label="Vista previa de ruta">
        <div v-if="!selected" class="flex h-96 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">Selecciona una ruta para ver su recorrido y destinos.</div>
        <template v-else>
          <div class="mb-3 flex items-center justify-between gap-2"><p class="text-xs font-semibold text-slate-700">{{ history?.label || 'Recorrido' }} · Ruta #{{ selected.id }}</p><button type="button" class="text-xs font-semibold text-emerald-700 hover:underline" @click="modalOpen = true">Ampliar mapa ↗</button></div>
          <div v-if="loading" class="flex h-96 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500" role="status">Cargando recorrido…</div>
          <div v-else-if="error" class="rounded-xl bg-rose-50 p-5 text-sm text-rose-700" role="alert">{{ error }} <button type="button" class="mt-3 block font-semibold underline" @click="select(selected, true)">Reintentar</button></div>
          <template v-else-if="detail">
            <DeliveryRouteHistoryMap v-if="!modalOpen" :compact="compact" :detail="detail" :selected-order-id="selectedOrder" @select="selectedOrder = $event" />
            <p class="mt-2 text-[11px] text-slate-500">{{ history?.caption }}</p>
            <div class="mt-3 flex flex-wrap gap-2"><button v-for="stop in history?.stops" :key="stop.orderId" type="button" class="rounded-lg border px-2.5 py-1.5 text-xs" :class="selectedOrder === stop.orderId ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'" @click="selectedOrder = stop.orderId">{{ stop.stopSequence }} · #{{ stop.orderId }}</button></div>
          </template>
        </template>
      </aside>
    </div>
    <BaseDialog v-model="modalOpen" :title="`Recorrido · Ruta #${selected?.id ?? ''}`" size="6xl" mobile-full-screen scroll-body>
      <div v-if="loading" class="p-12 text-center text-sm text-slate-500" role="status">Cargando recorrido…</div>
      <div v-else-if="error" class="rounded-lg bg-rose-50 p-5 text-sm text-rose-700" role="alert">{{ error }} <button type="button" class="ml-2 font-semibold underline" @click="selected && select(selected, true)">Reintentar</button></div>
      <div v-else-if="detail" class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(230px,1fr)]">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 lg:col-span-2">
          <div><p class="text-xs font-medium text-emerald-800">Tiempo total de la ruta</p><p class="mt-1 text-xl font-bold text-slate-900">{{ routeTiming?.duration }}</p><p class="text-[11px] text-slate-500">{{ routeTiming?.description }}</p></div>
          <div class="space-y-1 text-xs text-slate-600"><p><span class="font-medium">Salida:</span> {{ routeTiming?.start ? date(routeTiming.start) : 'Sin registrar' }}</p><p><span class="font-medium">{{ detail.returnIsInconsistent ? 'Cierre registrado:' : 'Regreso:' }}</span> {{ detail.completedAtUtc ? date(detail.completedAtUtc) : 'Sin registrar' }}</p></div>
        </div>
        <div><DeliveryRouteHistoryMap :detail="detail" :selected-order-id="selectedOrder" @select="selectedOrder = $event" />
          <p class="mt-2 text-xs font-semibold text-slate-700">{{ history?.label }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ history?.caption }}</p></div>
        <div class="min-w-0"><p class="mb-3 text-sm font-semibold text-slate-800">{{ selected?.deliverymanName }} · {{ detail.stops.length }} {{ detail.stops.length === 1 ? 'pedido' : 'pedidos' }}</p>
          <ul class="max-h-96 space-y-2 overflow-y-auto"><li v-for="stop in history?.stops" :key="stop.orderId"><button type="button" class="w-full rounded-xl border p-3 text-left" :class="selectedOrder === stop.orderId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'" @click="selectedOrder = stop.orderId">
            <p class="text-xs font-semibold text-slate-800">{{ stop.stopSequence }} · Pedido #{{ stop.orderId }}</p>
            <p class="mt-2 text-xs font-semibold text-blue-800">Tiempo de entrega: {{ stopTiming(stop).duration }}</p>
            <p class="text-[10px] text-slate-500">{{ stopTiming(stop).reference }}</p>
            <p v-if="stop.onTheWayAtUtc" class="mt-1 text-[11px] text-slate-500">En camino: {{ date(stop.onTheWayAtUtc) }}</p>
            <p class="mt-1 text-xs text-slate-600">{{ stop.addressSnapshotText || stop.addressText || 'Dirección sin registrar' }}</p>
            <p v-if="stop.customerName" class="mt-1 text-[11px] text-slate-500">{{ stop.customerName }}</p>
            <p class="mt-1 text-[11px] text-slate-500">{{ stop.deliveredAtUtc ? `Entregado: ${date(stop.deliveredAtUtc)}` : 'Sin hora de entrega' }}</p>
            <p v-if="!hasRouteCoordinates(stop.latitude, stop.longitude)" class="mt-1 text-[11px] text-amber-700">Sin coordenadas para el marcador</p>
          </button></li></ul>
        </div>
      </div>
    </BaseDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import DeliveryRouteHistoryMap from './DeliveryRouteHistoryMap.vue'
import { dashboardApi } from '@/services/MainAPI/dashboardApi'
import { defaultBusinessCalendar } from '@/utils/datetime'
import { deliveryRouteHistory, deliveryRouteTiming, deliveryStopTiming, hasRouteCoordinates } from '@/helpers/deliveryRouteHistory'
import type { DeliveryPerformanceRoute, DeliveryRouteDetail } from '@/types/deliveryPerformance'

const props = defineProps<{ routes: DeliveryPerformanceRoute[]; branchId: number | null; loadDetail?: (id: number) => Promise<DeliveryRouteDetail>; compact?: boolean }>()
const pageSize = 8
const page = ref(1)
const selected = ref<DeliveryPerformanceRoute | null>(null)
const detail = ref<DeliveryRouteDetail | null>(null)
const history = computed(() => detail.value ? deliveryRouteHistory(detail.value) : null)
const routeTiming = computed(() => detail.value ? deliveryRouteTiming(detail.value) : null)
const stopTiming = deliveryStopTiming
const selectedOrder = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
const modalOpen = ref(false)
const cache = new Map<string, DeliveryRouteDetail>()
let timer: ReturnType<typeof setTimeout> | undefined
let request = 0
const visibleRoutes = computed(() => props.routes.slice((page.value - 1) * pageSize, page.value * pageSize))
const number = (value: number | null) => value == null ? '—' : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)
const date = (value: string | null) => value ? defaultBusinessCalendar.formatDateTime(value) : 'Sin fecha'
const compactDateFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const compactDate = (value: string | null) => value ? compactDateFormatter.format(new Date(value)) : 'Sin fecha'
function cancelPreview() { clearTimeout(timer) }
function preview(route: DeliveryPerformanceRoute) {
  cancelPreview()
  if (window.matchMedia(`(hover: hover) and (min-width: ${props.compact ? 900 : 1280}px)`).matches) timer = setTimeout(() => void select(route), 300)
}
async function select(route: DeliveryPerformanceRoute, retry = false) {
  cancelPreview()
  if (selected.value?.id === route.id && !retry && (detail.value || loading.value)) return
  const version = ++request
  const key = `${props.branchId ?? 'all'}:${route.id}`
  selected.value = route
  selectedOrder.value = null
  detail.value = cache.get(key) ?? null
  error.value = ''
  loading.value = !detail.value
  if (detail.value && !retry) return
  try {
    const result = await (props.loadDetail ? props.loadDetail(route.id) : dashboardApi.getDeliveryRouteStops(route.id, props.branchId))
    if (version !== request) return
    detail.value = result
    cache.set(key, result)
    if (cache.size > 20) cache.delete(cache.keys().next().value!)
  } catch (e) {
    if (version === request) error.value = e instanceof Error ? e.message : 'No se pudo cargar el recorrido.'
  } finally { if (version === request) loading.value = false }
}
function open(route: DeliveryPerformanceRoute) { modalOpen.value = true; void select(route) }
watch(() => props.routes, () => { request++; cancelPreview(); page.value = 1; selected.value = null; detail.value = null; loading.value = false; error.value = ''; modalOpen.value = false })
watch(() => props.branchId, () => cache.clear())
onBeforeUnmount(() => { request++; cancelPreview() })
</script>
