<template>
  <div class="space-y-3">
    <div v-if="error" class="flex h-72 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-6 text-center text-sm text-amber-800">{{ error }}</div>
    <div v-else class="relative">
      <div ref="mapContainer" class="h-[460px] w-full rounded-xl border border-gray-200" />
      <BaseLoading v-if="initializing" text="Inicializando Google Maps..." class="absolute inset-0 rounded-xl bg-white/80" />
      <button type="button" class="absolute right-3 top-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow" @click="engine.followEnabled.value = true">
        {{ engine.followEnabled.value ? 'Siguiendo recorrido' : 'Seguir recorrido' }}
      </button>
    </div>

    <div class="rounded-xl border border-gray-200 bg-white p-3">
      <div class="relative mb-2 h-3">
        <div v-if="incidentStart != null && incidentEnd != null" class="absolute top-0 h-3 rounded bg-amber-300/70" :style="incidentBandStyle" />
        <i v-for="event in allEvents" :key="event.id" class="absolute top-0 h-3 w-0.5 bg-red-500" :style="{ left: `${percent(time(event.recordedAt))}%` }" :title="event.eventType" />
      </div>
      <input class="w-full accent-emerald-600" type="range" min="0" max="1000" :value="Math.round(engine.progress.value * 1000)" @input="seekSlider" />
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1">
          <BaseButton size="sm" variant="outline" @click="engine.restart">↺</BaseButton>
          <BaseButton size="sm" variant="outline" @click="engine.stepBackward">−10 s</BaseButton>
          <BaseButton size="sm" @click="engine.togglePlayback">{{ engine.isPlaying.value ? 'Pausar' : 'Reproducir' }}</BaseButton>
          <BaseButton size="sm" variant="outline" @click="engine.stepForward">+10 s</BaseButton>
          <BaseButton size="sm" variant="outline" @click="engine.goToEnd">Final</BaseButton>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-600">
          <span>{{ formatClock(engine.currentTimestamp.value) }} / {{ formatDuration(engine.duration.value) }}</span>
          <select :value="engine.playbackRate.value" class="rounded border border-gray-300 px-2 py-1" @change="engine.setPlaybackRate(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="rate in rates" :key="rate" :value="rate">{{ rate }}x</option>
          </select>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button v-for="(deliveryman, index) in data.deliverymen" :key="deliveryman.deliverymanId" type="button"
        class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
        :class="hiddenIds.has(deliveryman.deliverymanId) ? 'opacity-40' : ''" @click="toggleVisibility(deliveryman.deliverymanId)">
        <i class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: colors[index % colors.length] }" />
        {{ deliveryman.deliverymanName }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import type { DeliveryPlaybackResponse } from '@/services/MainAPI/deliveryTrackingIncidentsApi'
import { detectStays, gapThreshold, hasTechnicalGap, useDeliveryRoutePlayback } from '@/composables/useDeliveryRoutePlayback'

const props = defineProps<{
  data: DeliveryPlaybackResponse
  incidentStart?: number | null
  incidentEnd?: number | null
  evidencePointIds?: number[]
}>()
const mapContainer = ref<HTMLDivElement | null>(null)
const initializing = ref(true)
const error = ref('')
const hiddenIds = reactive(new Set<number>())
const colors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0891b2']
const rates = [0.5, 1, 2, 5, 10, 30, 60]
const engine = useDeliveryRoutePlayback(() => new Date(props.data.from).getTime(), () => new Date(props.data.to).getTime())
const allEvents = computed(() => props.data.deliverymen.flatMap(item => item.events))
let map: google.maps.Map | null = null
let infoWindow: google.maps.InfoWindow | null = null
let listeners: google.maps.MapsEventListener[] = []
let objects: Array<google.maps.Marker | google.maps.Polyline> = []
let activePositions = new Map<number, google.maps.LatLngLiteral>()
let lastPointIds = new Map<number, number>()

const time = (value: string) => new Date(value).getTime()
const percent = (value: number) => Math.max(0, Math.min(100, ((value - new Date(props.data.from).getTime()) / Math.max(1, new Date(props.data.to).getTime() - new Date(props.data.from).getTime())) * 100))
const incidentBandStyle = computed(() => ({ left: `${percent(props.incidentStart!)}%`, width: `${percent(props.incidentEnd!) - percent(props.incidentStart!)}%` }))
const clearObjects = () => { objects.forEach(object => object.setMap(null)); objects = []; activePositions.clear() }
const interpolate = (a: any, b: any, timestamp: number) => {
  const start = time(a.recordedAt), end = time(b.recordedAt)
  const ratio = end === start ? 0 : (timestamp - start) / (end - start)
  return { lat: a.latitude + (b.latitude - a.latitude) * ratio, lng: a.longitude + (b.longitude - a.longitude) * ratio }
}
const popup = (deliveryman: any, point: any) => `<div style="max-width:260px;font-size:12px"><b>${deliveryman.deliverymanName}</b><br>${new Date(point.recordedAt).toLocaleString('es-CO',{timeZone:'America/Bogota'})}<br>${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}<br>Precisión: ${point.accuracyMeters == null ? 'sin dato' : `${Math.round(point.accuracyMeters)} m`} · Batería: ${point.batteryLevelPercent == null ? 'sin dato' : `${point.batteryLevelPercent}%`}<br>GPS: ${point.gpsEnabled === false ? 'apagado' : 'activo'} · Internet: ${point.internetAvailable === false ? 'no' : 'sí'}<br>Modo: ${point.trackingMode || 'sin dato'}<br>Sincronización: ${point.syncedAt ? new Date(point.syncedAt).toLocaleString('es-CO',{timeZone:'America/Bogota'}) : 'sin dato'}${point.syncedAt && time(point.syncedAt)-time(point.recordedAt)>60000?'<br><b>Enviado offline</b>':''}<br>Ruta: ${point.deliveryRouteId ?? '—'} · Jornada: ${point.workSessionId ?? '—'}</div>`

function render() {
  if (!map) return
  clearObjects()
  const now = engine.currentTimestamp.value
  props.data.deliverymen.forEach((deliveryman, deliverymanIndex) => {
    if (hiddenIds.has(deliveryman.deliverymanId)) return
    const occurred = deliveryman.points.filter(point => time(point.recordedAt) <= now)
    if (!occurred.length) return
    const color = colors[deliverymanIndex % colors.length]!
    const threshold = gapThreshold(deliveryman.points)
    let segment: google.maps.LatLngLiteral[] = []
    occurred.forEach((point, index) => {
      const position = { lat: point.latitude, lng: point.longitude }
      const previous = occurred[index - 1]
      if (previous && hasTechnicalGap(previous, point, deliveryman.events, threshold)) {
        if (segment.length > 1) objects.push(new google.maps.Polyline({ map, path: segment, strokeColor: color, strokeWeight: 4 }))
        objects.push(new google.maps.Polyline({ map, path: [{ lat: previous.latitude, lng: previous.longitude }, position], strokeColor: '#6b7280', strokeOpacity: .7, strokeWeight: 3, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }] }))
        segment = [position]
      } else segment.push(position)
      if (props.evidencePointIds?.includes(point.id)) {
        objects.push(new google.maps.Marker({
          map,
          position,
          title: 'Punto conservado como evidencia',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#ffffff',
            fillOpacity: 1,
            strokeColor: color,
            strokeWeight: 3,
            scale: 5,
          },
        }))
      }
    })
    if (segment.length > 1) objects.push(new google.maps.Polyline({ map, path: segment, strokeColor: color, strokeWeight: 4 }))
    const last = occurred[occurred.length - 1]!
    const next = deliveryman.points[occurred.length]
    const active = next && time(next.recordedAt) > now && !hasTechnicalGap(last, next, deliveryman.events, threshold) ? interpolate(last, next, now) : { lat: last.latitude, lng: last.longitude }
    activePositions.set(deliveryman.deliverymanId, active)
    const marker = new google.maps.Marker({ map, position: active, title: deliveryman.deliverymanName, label: { text: deliveryman.deliverymanName.charAt(0).toUpperCase(), color: '#fff', fontWeight: '700' }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3, scale: 12 } })
    marker.addListener('click', () => { infoWindow?.setContent(popup(deliveryman, last)); infoWindow?.open({ map, anchor: marker }) })
    objects.push(marker)
    if (lastPointIds.get(deliveryman.deliverymanId) !== last.id) {
      lastPointIds.set(deliveryman.deliverymanId, last.id)
      const pulse = new google.maps.Marker({ map, position: { lat: last.latitude, lng: last.longitude }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: .2, strokeColor: color, strokeWeight: 2, scale: 18 } })
      objects.push(pulse)
      window.setTimeout(() => pulse.setMap(null), 650)
    }
    detectStays(occurred).forEach(stay => {
      const elapsed = Math.max(0, Math.min(now, stay.end) - stay.start)
      const stayMarker = new google.maps.Marker({ map, position: { lat: stay.latitude, lng: stay.longitude }, label: { text: formatDuration(elapsed), color: '#111827', fontSize: '11px', fontWeight: '700' }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#fbbf24', fillOpacity: .9, strokeColor: '#fff', strokeWeight: 2, scale: 9 } })
      objects.push(stayMarker)
    })
  })
  if (engine.followEnabled.value && activePositions.size) {
    if (activePositions.size === 1) map.panTo([...activePositions.values()][0]!)
    else {
      const bounds = new google.maps.LatLngBounds()
      activePositions.forEach(position => bounds.extend(position))
      map.fitBounds(bounds, 80)
    }
  }
}

function seekSlider(event: Event) {
  const value = Number((event.target as HTMLInputElement).value) / 1000
  engine.seekTo(new Date(props.data.from).getTime() + engine.duration.value * value)
}
function toggleVisibility(id: number) { hiddenIds.has(id) ? hiddenIds.delete(id) : hiddenIds.add(id); render() }
function formatDuration(milliseconds: number) { const total = Math.floor(milliseconds / 1000); return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}` }
function formatClock(timestamp: number) { return new Intl.DateTimeFormat('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'America/Bogota'}).format(new Date(timestamp)) }

async function initialize() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) { error.value = 'Google Maps no está configurado.'; initializing.value = false; return }
  try {
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    setOptions({ key, v: 'weekly', ...(mapId ? { mapIds: [mapId] } : {}) })
    const { Map: GoogleMap } = await importLibrary('maps') as google.maps.MapsLibrary
    if (!mapContainer.value) return
    map = new GoogleMap(mapContainer.value, { center: { lat: 6.2442, lng: -75.5812 }, zoom: 14, mapId: mapId || undefined, streetViewControl: false, mapTypeControl: false })
    infoWindow = new google.maps.InfoWindow()
    listeners = ['dragstart', 'zoom_changed'].map(name => map!.addListener(name, () => { engine.followEnabled.value = false }))
    render()
  } catch { error.value = 'No fue posible cargar Google Maps.' }
  finally { initializing.value = false }
}

watch(() => engine.currentTimestamp.value, render)
watch(() => props.data, () => { engine.reset(); hiddenIds.clear(); lastPointIds.clear(); render() }, { deep: true })
onMounted(initialize)
onUnmounted(() => { engine.pause(); listeners.forEach(listener => listener.remove()); clearObjects(); infoWindow?.close(); map = null })
</script>
