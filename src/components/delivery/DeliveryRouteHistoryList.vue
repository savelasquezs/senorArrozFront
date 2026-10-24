<template>
  <section class="group relative min-w-0 bg-white" :class="expanded ? '' : 'rounded-xl border border-slate-200 shadow-sm'" :aria-labelledby="headingId">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100" :class="compact ? 'px-2 py-1.5' : 'px-5 py-4'">
      <div>
        <h2 :id="headingId" class="font-semibold text-slate-900" :class="compact ? 'text-[11px]' : ''">{{ expanded ? 'Selecciona una ruta' : 'Últimas rutas' }}</h2>
        <p class="text-slate-500" :class="compact ? 'text-[9px]' : 'mt-1 text-xs'">{{ expanded ? 'Consulta su recorrido, tiempos y pedidos sin salir de esta lista.' : compact ? 'Hover: mapa · Clic: detalle' : 'Pasa sobre una ruta para previsualizarla. Haz clic para explorar sus pedidos.' }}</p>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600">{{ routes.length }} {{ expanded ? routes.length === 1 ? 'ruta' : 'rutas' : 'recientes' }}</span>
        <button v-if="compact" type="button" aria-label="Ampliar últimas rutas" aria-haspopup="dialog" title="Ampliar últimas rutas" class="flex size-7 items-center justify-center rounded text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600" @click="expandList"><ArrowsPointingOutIcon class="size-3.5" /></button>
      </div>
    </div>
    <p v-if="!routes.length" class="p-10 text-center text-sm text-slate-500">No hay rutas en este periodo.</p>
    <div v-else class="grid min-w-0" :class="expanded ? 'gap-4 pt-3 lg:grid-cols-[280px_minmax(0,1fr)]' : compact ? '' : 'xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'">
      <div class="min-w-0" :class="compact ? 'p-1' : 'p-3'">
        <ul class="divide-y divide-slate-100" :class="expanded ? 'max-h-[32dvh] overflow-y-auto lg:max-h-[60dvh]' : compact ? 'max-h-[64px] overflow-y-auto' : ''" :tabindex="compact || expanded ? 0 : undefined" aria-label="Lista de rutas recientes">
          <li v-for="route in visibleRoutes" :key="route.id">
            <button type="button" class="w-full rounded-lg text-left transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
              :class="[compact ? 'px-1.5 py-1' : 'px-3 py-3', selected?.id === route.id ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : '']"
              :aria-label="`Ver recorrido de ${route.deliverymanName}, ruta ${route.id}`"
              :aria-pressed="expanded ? selected?.id === route.id : undefined"
              @pointerenter="preview(route)" @pointerleave="cancelPreview" @focus="select(route)" @click="open(route)">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0"><p class="truncate font-semibold text-slate-800" :class="compact ? 'text-[10px]' : 'text-sm'">{{ expanded ? `Ruta #${route.id}` : route.deliverymanName }} <span v-if="!expanded" class="font-normal text-slate-400">#{{ route.id }}</span></p>
                  <p v-if="expanded" class="mt-0.5 truncate text-xs text-slate-700" :title="route.deliverymanName">{{ route.deliverymanName }}</p>
                  <p class="truncate text-slate-500" :class="compact ? 'text-[9px]' : 'mt-0.5 text-[11px]'" :title="date(routeDate(route))">{{ !route.completedAtUtc && route.startedAtUtc ? 'Salida: ' : '' }}{{ compact || expanded ? compactDate(routeDate(route)) : date(routeDate(route)) }} · {{ route.branchName }}</p></div>
                <span class="shrink-0 rounded-full px-1.5 py-0.5 font-semibold" :class="[compact ? 'text-[9px]' : 'text-[10px]', route.status === 'returnPending' ? 'bg-amber-100 text-amber-800' : route.status === 'inProgress' ? 'bg-blue-100 text-blue-800' : route.metSla === true ? 'bg-emerald-100 text-emerald-800' : route.metSla === false ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500']">{{ deliveryRouteStatusLabel(route.status, route.metSla) }}</span>
              </div>
              <div class="flex flex-wrap text-slate-600" :class="compact ? 'gap-x-2 text-[9px]' : 'mt-2 gap-x-4 gap-y-1 text-xs'">
                <span><strong class="text-slate-800">{{ route.deliveredCount }}</strong> {{ route.deliveredCount === 1 ? 'entregado' : 'entregados' }}</span>
                <span v-if="route.pendingOrdersCount"><strong class="text-blue-800">{{ route.pendingOrdersCount }}</strong> {{ route.pendingOrdersCount === 1 ? 'pendiente' : 'pendientes' }}</span>
                <span v-if="route.returnIsInconsistent" class="font-medium text-amber-700">Regreso inconsistente</span>
                <span v-else-if="route.status !== 'inProgress' && route.status !== 'returnPending'"><strong class="text-slate-800">{{ number(route.durationMinutes) }}</strong> min <span v-if="!compact" class="text-slate-400">/ meta {{ number(route.metaMinutes) }}</span></span>
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
      <div v-if="expanded" class="min-w-0 border-t border-slate-100 pt-4 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0" aria-label="Detalle de la ruta seleccionada" :aria-busy="loading">
        <p v-if="!selected" class="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">Selecciona una ruta de la lista para ver el mapa y sus pedidos.</p>
        <template v-else>
          <h3 class="mb-3 text-sm font-semibold text-slate-900">Recorrido · Ruta #{{ selected.id }}</h3>
          <p v-if="loading" class="p-10 text-center text-sm text-slate-500" role="status">Cargando recorrido…</p>
          <p v-else-if="error" class="rounded-lg bg-rose-50 p-5 text-sm text-rose-700" role="alert">{{ error }} <button type="button" class="ml-2 font-semibold underline" @click="select(selected, true)">Reintentar</button></p>
          <DeliveryRouteHistoryDetail v-else-if="detail" :detail="detail" :driver-name="selected.deliverymanName" />
        </template>
      </div>
      <aside v-else-if="!compact || (selected && !modalOpen && !listExpanded)" class="min-w-0 border border-slate-100 bg-white" :class="compact ? 'absolute bottom-full right-0 z-20 mb-2 hidden w-[min(420px,90vw)] rounded-xl p-2 shadow-xl min-[56.25rem]:group-hover:block min-[56.25rem]:group-focus-within:block' : 'hidden border-l p-4 xl:block'" aria-label="Vista previa de ruta">
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
      <DeliveryRouteHistoryDetail v-else-if="detail" :detail="detail" :driver-name="selected?.deliverymanName" />
    </BaseDialog>
    <BaseDialog v-if="compact" v-model="listExpanded" title="Últimas rutas" size="7xl" mobile-full-screen scroll-body>
      <DeliveryRouteHistoryList v-if="listExpanded" expanded :routes="routes" :branch-id="branchId" :load-detail="loadDetail" />
    </BaseDialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import DeliveryRouteHistoryMap from './DeliveryRouteHistoryMap.vue'
import DeliveryRouteHistoryDetail from './DeliveryRouteHistoryDetail.vue'
import { dashboardApi } from '@/services/MainAPI/dashboardApi'
import { defaultBusinessCalendar } from '@/utils/datetime'
import { deliveryRouteHistory, deliveryRouteStatusLabel } from '@/helpers/deliveryRouteHistory'
import type { DeliveryPerformanceRoute, DeliveryRouteDetail } from '@/types/deliveryPerformance'

const props = defineProps<{ routes: DeliveryPerformanceRoute[]; branchId: number | null; loadDetail?: (id: number) => Promise<DeliveryRouteDetail>; compact?: boolean; expanded?: boolean }>()
const headingId = useId()
const pageSize = 8
const page = ref(1)
const selected = ref<DeliveryPerformanceRoute | null>(null)
const detail = ref<DeliveryRouteDetail | null>(null)
const history = computed(() => detail.value ? deliveryRouteHistory(detail.value) : null)
const selectedOrder = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
const modalOpen = ref(false)
const listExpanded = ref(false)
const cache = new Map<string, DeliveryRouteDetail>()
let timer: ReturnType<typeof setTimeout> | undefined
let request = 0
const visibleRoutes = computed(() => props.routes.slice((page.value - 1) * pageSize, page.value * pageSize))
const number = (value: number | null) => value == null ? '—' : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)
const date = (value: string | null) => value ? defaultBusinessCalendar.formatDateTime(value) : 'Sin fecha'
const routeDate = (route: DeliveryPerformanceRoute) => route.completedAtUtc ?? route.startedAtUtc ?? route.departedAtUtc
const compactDateFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const compactDate = (value: string | null) => value ? compactDateFormatter.format(new Date(value)) : 'Sin fecha'
function cancelPreview() { clearTimeout(timer) }
function preview(route: DeliveryPerformanceRoute) {
  cancelPreview()
  if (props.expanded || listExpanded.value) return
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
function open(route: DeliveryPerformanceRoute) { if (!props.expanded) modalOpen.value = true; void select(route) }
function expandList() {
  request++; cancelPreview(); selected.value = null; detail.value = null; loading.value = false; error.value = ''
  modalOpen.value = false; listExpanded.value = true
}
watch(() => props.routes, () => { request++; cancelPreview(); page.value = 1; selected.value = null; detail.value = null; loading.value = false; error.value = ''; modalOpen.value = false })
watch(() => props.branchId, () => cache.clear())
onBeforeUnmount(() => { request++; cancelPreview() })
</script>
