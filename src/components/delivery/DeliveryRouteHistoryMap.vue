<template>
  <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
    <div ref="container" class="w-full" :class="compact ? 'h-48' : 'h-80 sm:h-96'" :aria-label="`Mapa: ${history.label} y pedidos de la ruta`" />
    <div v-if="loading || error" class="absolute inset-0 flex items-center justify-center bg-slate-50/95 p-6 text-center text-sm text-slate-600" role="status">
      <div>
        <p>{{ error || 'Cargando mapa…' }}</p>
        <button v-if="error" type="button" class="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium" @click="initialize">Reintentar</button>
      </div>
    </div>
    <p v-if="!loading && !error && history.source !== 'gps'" class="absolute left-3 top-3 max-w-[70%] rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
      {{ history.label }}<span v-if="history.source === 'estimated'" class="mt-1 block font-normal">{{ history.itinerary }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { DeliveryRouteDetail } from '@/types/deliveryPerformance'
import { defaultBusinessCalendar } from '@/utils/datetime'
import { deliveryRouteHistory, deliveryStopTiming, hasRouteCoordinates } from '@/helpers/deliveryRouteHistory'

const props = defineProps<{ detail: DeliveryRouteDetail; selectedOrderId?: number | null; compact?: boolean }>()
const history = computed(() => deliveryRouteHistory(props.detail))
const emit = defineEmits<{ select: [orderId: number] }>()
const container = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')
let map: google.maps.Map | null = null
let info: google.maps.InfoWindow | null = null
let objects: Array<google.maps.Marker | google.maps.Polyline> = []
let markers = new Map<number, google.maps.Marker>()
let disposed = false

function clear() {
  objects.forEach(object => { google.maps.event.clearInstanceListeners(object); object.setMap(null) })
  objects = []
  markers.clear()
  info?.close()
}

function selectOrder(id: number, pan = true) {
  const marker = markers.get(id)
  const stop = history.value.stops.find(s => s.orderId === id)
  if (!marker || !stop || !map) return
  const content = document.createElement('div')
  content.style.cssText = 'max-width:260px;font-size:12px;line-height:1.6'
  const title = document.createElement('strong')
  title.textContent = `Pedido #${stop.orderId} · Parada ${stop.stopSequence}`
  const address = document.createElement('p')
  address.textContent = stop.addressSnapshotText || stop.addressText || 'Dirección sin registrar'
  const time = document.createElement('p')
  time.textContent = stop.deliveredAtUtc ? `Entregado: ${defaultBusinessCalendar.formatDateTime(stop.deliveredAtUtc)}` : 'Sin hora de entrega'
  const duration = document.createElement('p')
  const timing = deliveryStopTiming(stop)
  duration.textContent = `Tiempo de entrega: ${timing.duration}`
  const reference = document.createElement('p')
  reference.textContent = timing.reference
  const onTheWay = document.createElement('p')
  if (stop.onTheWayAtUtc) onTheWay.textContent = `En camino: ${defaultBusinessCalendar.formatDateTime(stop.onTheWayAtUtc)}`
  content.append(title, address, duration, reference, onTheWay, time)
  info?.setContent(content)
  info?.open({ map, anchor: marker, shouldFocus: false })
  if (pan && marker.getPosition()) map.panTo(marker.getPosition()!)
}

function draw() {
  if (!map) return
  clear()
  const bounds = new google.maps.LatLngBounds()
  const { detail } = props
  if (hasRouteCoordinates(detail.branchLatitude, detail.branchLongitude)) {
    const position = { lat: detail.branchLatitude!, lng: detail.branchLongitude! }
    bounds.extend(position)
    objects.push(new google.maps.Marker({ map, position, title: 'Sucursal · salida y regreso', label: { text: 'S', color: 'white' }, zIndex: 5 }))
  }
  for (const segment of detail.segments) {
    const path = segment.map(p => ({ lat: p.latitude, lng: p.longitude }))
    path.forEach(p => bounds.extend(p))
    if (path.length > 1) objects.push(new google.maps.Polyline({ map, path, strokeColor: '#059669', strokeWeight: 4, strokeOpacity: .9,
      icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2 }, offset: '70px', repeat: '140px' }] }))
  }
  if (history.value.source === 'estimated') {
    const path = history.value.estimatedPath.map(point => ({ lat: point.latitude, lng: point.longitude }))
    path.forEach(point => bounds.extend(point))
    for (let index = 1; index < path.length; index++) {
      objects.push(new google.maps.Polyline({ map, path: [path[index - 1]!, path[index]!], strokeOpacity: 0, strokeWeight: 3,
        icons: [
          { icon: { path: 'M 0,-1 0,1', strokeColor: '#64748b', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '14px' },
          { icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, strokeColor: '#334155', strokeOpacity: 1, fillColor: '#334155', fillOpacity: 1, scale: 3 }, offset: '50%' },
        ] }))
    }
  }
  for (const stop of history.value.stops) {
    if (!hasRouteCoordinates(stop.latitude, stop.longitude)) continue
    const position = { lat: stop.latitude!, lng: stop.longitude! }
    bounds.extend(position)
    const marker = new google.maps.Marker({ map, position, title: `Pedido #${stop.orderId}`, label: { text: String(stop.stopSequence), color: 'white', fontWeight: '700' },
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#1d4ed8', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 13 }, zIndex: 10 })
    marker.addListener('click', () => { emit('select', stop.orderId); selectOrder(stop.orderId) })
    markers.set(stop.orderId, marker)
    objects.push(marker)
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, 45)
    google.maps.event.addListenerOnce(map, 'idle', () => { if (map && (map.getZoom() ?? 0) > 17) map.setZoom(17) })
  }
  if (props.selectedOrderId != null) selectOrder(props.selectedOrderId, false)
}

async function initialize() {
  if (loading.value && map) return
  loading.value = true
  error.value = ''
  try {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) throw new Error('Google Maps no está configurado en este entorno.')
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    setOptions({ key, v: 'weekly', ...(mapId ? { mapIds: [mapId] } : {}) })
    const { Map } = await importLibrary('maps') as google.maps.MapsLibrary
    if (disposed || !container.value) return
    map = new Map(container.value, { center: { lat: 6.2442, lng: -75.5812 }, zoom: 13, mapId: mapId || undefined,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: true, gestureHandling: 'cooperative' })
    info = new google.maps.InfoWindow()
    draw()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar el mapa.'
  } finally { loading.value = false }
}

watch(() => props.detail, draw)
watch(() => props.selectedOrderId, id => { if (id != null) selectOrder(id) })
onMounted(initialize)
onBeforeUnmount(() => { disposed = true; if (map) { clear(); google.maps.event.clearInstanceListeners(map) }; map = null })
</script>
