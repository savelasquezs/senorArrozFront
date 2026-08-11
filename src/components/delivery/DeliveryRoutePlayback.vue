<template>
  <div class="space-y-3">
    <div v-if="error" class="flex h-72 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-6 text-center text-sm text-amber-800">
      {{ error }}
    </div>
    <div v-else class="relative">
      <div ref="mapContainer" class="h-[460px] w-full rounded-xl border border-gray-200" />
      <BaseLoading v-if="initializing" text="Inicializando Google Maps..." class="absolute inset-0 rounded-xl bg-white/80" />
      <button type="button" class="absolute right-3 top-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow" @click="enableFollow">
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
      <button
        v-for="(deliveryman, index) in data.deliverymen"
        :key="deliveryman.deliverymanId"
        type="button"
        class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
        :class="hiddenIds.has(deliveryman.deliverymanId) ? 'opacity-40' : ''"
        @click="toggleVisibility(deliveryman.deliverymanId)"
      >
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
import type {
  DeliveryPlaybackDeliveryman,
  DeliveryPlaybackOrder,
  DeliveryPlaybackPoint,
  DeliveryPlaybackResponse,
  DeliveryPlaybackStay,
} from '@/services/MainAPI/deliveryTrackingIncidentsApi'
import {
  escapeMapHtml,
  formatStayDuration,
  gapThreshold,
  hasTechnicalGap,
  isPointInsideStay,
  useDeliveryRoutePlayback,
} from '@/composables/useDeliveryRoutePlayback'

const props = defineProps<{
  data: DeliveryPlaybackResponse
  incidentStart?: number | null
  incidentEnd?: number | null
  evidencePointIds?: number[]
}>()

interface StayOverlay {
  marker: google.maps.Marker
  circle: google.maps.Circle
  stay: DeliveryPlaybackStay
}

interface DeliverymanMapState {
  renderedPointCount: number
  pointMarkers: Map<number, google.maps.Marker>
  evidenceHalos: Map<number, google.maps.Marker>
  routeLines: google.maps.Polyline[]
  stayMarkers: Map<string, StayOverlay>
  orderMarkers: Map<number, google.maps.Marker>
  activeMarker: google.maps.Marker | null
  activePoint: DeliveryPlaybackPoint | null
}

const mapContainer = ref<HTMLDivElement | null>(null)
const initializing = ref(true)
const error = ref('')
const hiddenIds = reactive(new Set<number>())
const colors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0891b2']
const rates = [0.5, 1, 2, 5, 10, 30, 60]
const engine = useDeliveryRoutePlayback(
  () => new Date(props.data.from).getTime(),
  () => new Date(props.data.to).getTime(),
)
const allEvents = computed(() => props.data.deliverymen.flatMap(item => item.events))
const mapStates = new Map<number, DeliverymanMapState>()
const activePositions = new Map<number, google.maps.LatLngLiteral>()
const pulseMarkers = new Set<google.maps.Marker>()
const gapThresholds = new Map<number, number>()
let counterTimer: number | null = null

let map: google.maps.Map | null = null
let infoWindow: google.maps.InfoWindow | null = null
let listeners: google.maps.MapsEventListener[] = []
let cameraMovingProgrammatically = false
let cameraMoveToken = 0
let lastCameraMoveAt = 0

const time = (value: string) => new Date(value).getTime()
const percent = (value: number) => Math.max(0, Math.min(100,
  ((value - new Date(props.data.from).getTime())
    / Math.max(1, new Date(props.data.to).getTime() - new Date(props.data.from).getTime())) * 100))
const incidentBandStyle = computed(() => ({
  left: `${percent(props.incidentStart!)}%`,
  width: `${percent(props.incidentEnd!) - percent(props.incidentStart!)}%`,
}))
const formatDateTime = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
const popup = (deliveryman: DeliveryPlaybackDeliveryman, point: DeliveryPlaybackPoint) =>
  `<div style="max-width:260px;font-size:12px"><b>${escapeMapHtml(deliveryman.deliverymanName)}</b><br>${formatDateTime(point.recordedAt)}<br>${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}<br>Precisión: ${point.accuracyMeters == null ? 'sin dato' : `${Math.round(point.accuracyMeters)} m`} · Batería: ${point.batteryLevelPercent == null ? 'sin dato' : `${point.batteryLevelPercent}%`}<br>GPS: ${point.gpsEnabled === false ? 'apagado' : 'activo'} · Internet: ${point.internetAvailable === false ? 'no' : 'sí'}<br>Modo: ${escapeMapHtml(point.trackingMode || 'sin dato')}<br>Sincronización: ${point.syncedAt ? formatDateTime(point.syncedAt) : 'sin dato'}${point.syncedAt && time(point.syncedAt) - time(point.recordedAt) > 60000 ? '<br><b>Enviado offline</b>' : ''}<br>Ruta: ${point.deliveryRouteId ?? '—'} · Jornada: ${point.workSessionId ?? '—'}</div>`

function formatDuration(milliseconds: number) {
  return formatStayDuration(milliseconds / 1000)
}

function formatClock(timestamp: number) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(timestamp))
}

function getMapState(deliverymanId: number) {
  const existing = mapStates.get(deliverymanId)
  if (existing) return existing
  const state: DeliverymanMapState = {
    renderedPointCount: -1,
    pointMarkers: new Map(),
    evidenceHalos: new Map(),
    routeLines: [],
    stayMarkers: new Map(),
    orderMarkers: new Map(),
    activeMarker: null,
    activePoint: null,
  }
  mapStates.set(deliverymanId, state)
  return state
}

function clearMapState(state: DeliverymanMapState) {
  state.pointMarkers.forEach(marker => marker.setMap(null))
  state.evidenceHalos.forEach(marker => marker.setMap(null))
  state.stayMarkers.forEach(({ marker, circle }) => {
    marker.setMap(null)
    circle.setMap(null)
  })
  state.orderMarkers.forEach(marker => marker.setMap(null))
  state.routeLines.forEach(line => line.setMap(null))
  state.activeMarker?.setMap(null)
  state.pointMarkers.clear()
  state.evidenceHalos.clear()
  state.stayMarkers.clear()
  state.orderMarkers.clear()
  state.routeLines = []
  state.activeMarker = null
  state.activePoint = null
  state.renderedPointCount = -1
}

function clearObjects() {
  mapStates.forEach(clearMapState)
  mapStates.clear()
  pulseMarkers.forEach(marker => marker.setMap(null))
  pulseMarkers.clear()
  activePositions.clear()
  gapThresholds.clear()
}

function getGapThreshold(deliveryman: DeliveryPlaybackDeliveryman) {
  const existing = gapThresholds.get(deliveryman.deliverymanId)
  if (existing != null) return existing
  const value = gapThreshold(deliveryman.points)
  gapThresholds.set(deliveryman.deliverymanId, value)
  return value
}

function moveCamera(action: () => void) {
  if (!map) return
  const token = ++cameraMoveToken
  cameraMovingProgrammatically = true
  action()
  google.maps.event.addListenerOnce(map, 'idle', () => {
    if (token === cameraMoveToken) cameraMovingProgrammatically = false
  })
}

function centerOnRouteStart() {
  if (!map) return
  const starts = props.data.deliverymen
    .filter(item => !hiddenIds.has(item.deliverymanId))
    .map(item => item.points[0])
    .filter((point): point is DeliveryPlaybackPoint => Boolean(point))
  if (!starts.length) return
  if (starts.length === 1) {
    moveCamera(() => {
      map!.setZoom(16)
      map!.panTo({ lat: starts[0]!.latitude, lng: starts[0]!.longitude })
    })
    return
  }
  const bounds = new google.maps.LatLngBounds()
  starts.forEach(point => bounds.extend({ lat: point.latitude, lng: point.longitude }))
  moveCamera(() => map!.fitBounds(bounds, 80))
}

function occurredPointCount(points: DeliveryPlaybackPoint[], timestamp: number) {
  let low = 0
  let high = points.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (time(points[middle]!.recordedAt) <= timestamp) low = middle + 1
    else high = middle
  }
  return low
}

function interpolate(a: DeliveryPlaybackPoint, b: DeliveryPlaybackPoint, timestamp: number) {
  const start = time(a.recordedAt)
  const end = time(b.recordedAt)
  const ratio = end === start ? 0 : Math.max(0, Math.min(1, (timestamp - start) / (end - start)))
  return {
    lat: a.latitude + (b.latitude - a.latitude) * ratio,
    lng: a.longitude + (b.longitude - a.longitude) * ratio,
  }
}

function createPointMarker(
  deliveryman: DeliveryPlaybackDeliveryman,
  point: DeliveryPlaybackPoint,
  color: string,
  isEvidence: boolean,
) {
  const marker = new google.maps.Marker({
    map,
    position: { lat: point.latitude, lng: point.longitude },
    title: isEvidence ? 'Punto del incidente' : `${deliveryman.deliverymanName} · punto GPS`,
    zIndex: isEvidence ? 21 : 10,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: isEvidence ? '#ffffff' : color,
      fillOpacity: 1,
      strokeColor: isEvidence ? '#d97706' : '#ffffff',
      strokeWeight: isEvidence ? 3 : 2,
      scale: isEvidence ? 7 : 6,
    },
  })
  marker.addListener('click', () => {
    infoWindow?.setContent(popup(deliveryman, point))
    infoWindow?.open({ map, anchor: marker })
  })
  return marker
}

function createEvidenceHalo(point: DeliveryPlaybackPoint) {
  return new google.maps.Marker({
    map,
    position: { lat: point.latitude, lng: point.longitude },
    title: 'Punto del incidente',
    zIndex: 20,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#fef3c7',
      fillOpacity: .7,
      strokeColor: '#f59e0b',
      strokeWeight: 4,
      scale: 12,
    },
  })
}

function syncRouteLines(
  state: DeliverymanMapState,
  deliveryman: DeliveryPlaybackDeliveryman,
  occurred: DeliveryPlaybackPoint[],
  color: string,
) {
  const threshold = getGapThreshold(deliveryman)
  const segments: Array<{ path: google.maps.LatLngLiteral[]; gap: boolean }> = []
  let current: google.maps.LatLngLiteral[] = []

  occurred.forEach((point, index) => {
    const position = { lat: point.latitude, lng: point.longitude }
    const previous = occurred[index - 1]
    if (previous && hasTechnicalGap(previous, point, deliveryman.events, threshold)) {
      if (current.length > 1) segments.push({ path: current, gap: false })
      segments.push({
        path: [{ lat: previous.latitude, lng: previous.longitude }, position],
        gap: true,
      })
      current = [position]
    } else {
      current.push(position)
    }
  })
  if (current.length > 1) segments.push({ path: current, gap: false })

  segments.forEach((segment, index) => {
    let line = state.routeLines[index]
    if (!line) {
      line = new google.maps.Polyline({ map })
      state.routeLines.push(line)
    }
    line.setOptions({
      map,
      path: segment.path,
      strokeColor: segment.gap ? '#6b7280' : color,
      strokeOpacity: segment.gap ? .7 : 1,
      strokeWeight: segment.gap ? 3 : 4,
      icons: segment.gap
        ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }]
        : [],
    })
  })
  while (state.routeLines.length > segments.length)
    state.routeLines.pop()!.setMap(null)
}

function showPointPulse(point: DeliveryPlaybackPoint, color: string) {
  const pulse = new google.maps.Marker({
    map,
    position: { lat: point.latitude, lng: point.longitude },
    zIndex: 25,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: .2,
      strokeColor: color,
      strokeWeight: 2,
      scale: 18,
    },
  })
  pulseMarkers.add(pulse)
  window.setTimeout(() => {
    pulse.setMap(null)
    pulseMarkers.delete(pulse)
  }, 650)
}

function stayDurationSeconds(stay: DeliveryPlaybackStay, playhead: number) {
  const start = time(stay.startedAt)
  const end = stay.endedAt ? time(stay.endedAt) : null
  const reference = stay.isActive ? Date.now() : playhead
  if (end != null && reference >= end) return stay.durationSeconds
  return Math.max(0, Math.floor((reference - start) / 1000))
}

const roleLabels: Record<string, string> = {
  previous: 'Pedido anterior',
  related: 'Pedido relacionado',
  next: 'Pedido siguiente',
}

function orderDescription(order: DeliveryPlaybackOrder) {
  const roles = order.roles.map(role => roleLabels[role]).join(' · ')
  return `<div style="margin-top:6px"><b>${escapeMapHtml(roles)} #${order.orderId}</b><br>${escapeMapHtml(order.address || 'Dirección no disponible')}${order.deliveredAt ? `<br>Entregado: ${formatDateTime(order.deliveredAt)}` : ''}</div>`
}

function stayPopup(deliveryman: DeliveryPlaybackDeliveryman, stay: DeliveryPlaybackStay) {
  const duration = formatStayDuration(stayDurationSeconds(stay, engine.currentTimestamp.value))
  const end = stay.isActive ? 'Activa' : stay.endedAt ? formatDateTime(stay.endedAt) : 'Sin dato'
  const relatedOrders = stay.orders.map(orderDescription).join('')
  return `<div style="max-width:320px;font-size:12px;line-height:1.45"><b>Estadía · ${escapeMapHtml(deliveryman.deliverymanName)}</b><br>Inicio: ${formatDateTime(stay.startedAt)}<br>Fin: ${end}<br>Duración: <b>${duration}</b><br>Puntos agrupados: ${stay.pointCount}<br>Ubicación aproximada: ${stay.centerLatitude.toFixed(6)}, ${stay.centerLongitude.toFixed(6)}<br>Radio observado: ${Math.round(stay.radiusMeters)} m<br>Distancia a sucursal: ${stay.distanceToBranchMeters == null ? 'sin dato' : `${Math.round(stay.distanceToBranchMeters)} m`}<br>Distancia al pedido: ${stay.distanceToOrderMeters == null ? 'sin dato' : `${Math.round(stay.distanceToOrderMeters)} m`}${relatedOrders || '<br>Sin pedidos relacionados'}</div>`
}

function openStay(deliveryman: DeliveryPlaybackDeliveryman, stay: DeliveryPlaybackStay, anchor: google.maps.Marker) {
  infoWindow?.setContent(stayPopup(deliveryman, stay))
  infoWindow?.open({ map, anchor })
}

function syncStayOverlays(
  state: DeliverymanMapState,
  deliveryman: DeliveryPlaybackDeliveryman,
  playhead: number,
) {
  const visibleStays = deliveryman.stays.filter(stay => time(stay.startedAt) <= playhead)
  const desiredStays = new Set(visibleStays.map(stay => String(stay.id)))
  state.stayMarkers.forEach(({ marker, circle }, key) => {
    if (!desiredStays.has(key)) {
      marker.setMap(null)
      circle.setMap(null)
      state.stayMarkers.delete(key)
    }
  })

  visibleStays.forEach(stay => {
    const key = String(stay.id)
    const position = { lat: stay.centerLatitude, lng: stay.centerLongitude }
    let overlay = state.stayMarkers.get(key)
    if (!overlay) {
      const marker = new google.maps.Marker({
        map,
        position,
        zIndex: 24,
        title: 'Ver detalle de la estadía',
        label: {
          text: formatStayDuration(stayDurationSeconds(stay, playhead)),
          color: '#111827',
          fontSize: '12px',
          fontWeight: '700',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#fbbf24',
          fillOpacity: .95,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 22,
        },
      })
      const circle = new google.maps.Circle({
        map,
        center: position,
        radius: Math.max(stay.radiusMeters, 5),
        fillColor: '#facc15',
        fillOpacity: .22,
        strokeColor: '#d97706',
        strokeOpacity: .9,
        strokeWeight: 2,
        clickable: true,
      })
      overlay = { marker, circle, stay }
      state.stayMarkers.set(key, overlay)
      marker.addListener('click', () => openStay(deliveryman, state.stayMarkers.get(key)?.stay || stay, marker))
      circle.addListener('click', () => openStay(deliveryman, state.stayMarkers.get(key)?.stay || stay, marker))
    } else {
      overlay.stay = stay
      overlay.marker.setPosition(position)
      overlay.circle.setCenter(position)
      overlay.circle.setRadius(Math.max(stay.radiusMeters, 5))
    }
  })

  const orders = new Map<number, DeliveryPlaybackOrder>()
  visibleStays.flatMap(stay => stay.orders).forEach(order => {
    const current = orders.get(order.orderId)
    orders.set(order.orderId, current
      ? { ...current, roles: [...new Set([...current.roles, ...order.roles])] }
      : order)
  })
  state.orderMarkers.forEach((marker, orderId) => {
    const order = orders.get(orderId)
    if (!order || order.latitude == null || order.longitude == null) {
      marker.setMap(null)
      state.orderMarkers.delete(orderId)
    }
  })
  orders.forEach(order => {
    if (order.latitude == null || order.longitude == null || state.orderMarkers.has(order.orderId)) return
    const role = order.roles.includes('related') ? 'related' : order.roles[0] || 'next'
    const styles = role === 'related'
      ? { color: '#059669', label: 'R' }
      : role === 'previous'
        ? { color: '#2563eb', label: 'A' }
        : { color: '#7c3aed', label: 'S' }
    const marker = new google.maps.Marker({
      map,
      position: { lat: order.latitude, lng: order.longitude },
      title: `${order.roles.map(item => roleLabels[item]).join(' · ')} #${order.orderId}`,
      zIndex: 18,
      label: { text: styles.label, color: '#ffffff', fontWeight: '700' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: styles.color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 12,
      },
    })
    marker.addListener('click', () => {
      infoWindow?.setContent(`<div style="max-width:260px;font-size:12px">${orderDescription(order)}</div>`)
      infoWindow?.open({ map, anchor: marker })
    })
    state.orderMarkers.set(order.orderId, marker)
  })
}

function syncHistoricalOverlays(
  state: DeliverymanMapState,
  deliveryman: DeliveryPlaybackDeliveryman,
  count: number,
  color: string,
  now: number,
) {
  const occurred = deliveryman.points.slice(0, count)
  const visiblePoints = occurred.filter(point => !deliveryman.stays.some(stay => isPointInsideStay(point, stay)))
  const desiredIds = new Set(visiblePoints.map(point => point.id))
  const evidenceIds = new Set(props.evidencePointIds || [])

  state.pointMarkers.forEach((marker, id) => {
    if (!desiredIds.has(id)) {
      marker.setMap(null)
      state.pointMarkers.delete(id)
    }
  })
  state.evidenceHalos.forEach((marker, id) => {
    if (!desiredIds.has(id) || !evidenceIds.has(id)) {
      marker.setMap(null)
      state.evidenceHalos.delete(id)
    }
  })
  visiblePoints.forEach(point => {
    const isEvidence = evidenceIds.has(point.id)
    if (!state.pointMarkers.has(point.id))
      state.pointMarkers.set(point.id, createPointMarker(deliveryman, point, color, isEvidence))
    if (isEvidence && !state.evidenceHalos.has(point.id))
      state.evidenceHalos.set(point.id, createEvidenceHalo(point))
  })

  syncRouteLines(state, deliveryman, occurred, color)
  syncStayOverlays(state, deliveryman, now)

  if (count > state.renderedPointCount && count > 0) {
    const latest = deliveryman.points[count - 1]!
    if (!deliveryman.stays.some(stay => isPointInsideStay(latest, stay)))
      showPointPulse(latest, color)
  }
  state.renderedPointCount = count
}

function updateStayCounters(state: DeliverymanMapState, now: number) {
  state.stayMarkers.forEach(({ marker, stay }) => {
    marker.setLabel({
      text: formatStayDuration(stayDurationSeconds(stay, now)),
      color: '#111827',
      fontSize: '12px',
      fontWeight: '700',
    })
  })
}

function updateActiveMarker(
  state: DeliverymanMapState,
  deliveryman: DeliveryPlaybackDeliveryman,
  count: number,
  color: string,
  now: number,
) {
  if (count === 0) {
    state.activeMarker?.setMap(null)
    state.activePoint = null
    return
  }
  const last = deliveryman.points[count - 1]!
  const next = deliveryman.points[count]
  const threshold = getGapThreshold(deliveryman)
  const position = next && !hasTechnicalGap(last, next, deliveryman.events, threshold)
    ? interpolate(last, next, now)
    : { lat: last.latitude, lng: last.longitude }
  state.activePoint = last

  if (!state.activeMarker) {
    state.activeMarker = new google.maps.Marker({
      map,
      position,
      zIndex: 30,
      title: deliveryman.deliverymanName,
      label: {
        text: deliveryman.deliverymanName.charAt(0).toUpperCase(),
        color: '#fff',
        fontWeight: '700',
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
        scale: 14,
      },
    })
    state.activeMarker.addListener('click', () => {
      if (!state.activePoint) return
      infoWindow?.setContent(popup(deliveryman, state.activePoint))
      infoWindow?.open({ map, anchor: state.activeMarker! })
    })
  } else {
    state.activeMarker.setMap(map)
    state.activeMarker.setPosition(position)
  }
  activePositions.set(deliveryman.deliverymanId, position)
}

function followActivePositions() {
  if (!map || !engine.followEnabled.value || !activePositions.size) return
  const now = performance.now()
  if (now - lastCameraMoveAt < 180) return
  lastCameraMoveAt = now
  if (activePositions.size === 1) {
    moveCamera(() => map!.panTo([...activePositions.values()][0]!))
    return
  }
  const bounds = new google.maps.LatLngBounds()
  activePositions.forEach(position => bounds.extend(position))
  const visibleBounds = map.getBounds()
  const allVisible = visibleBounds
    && [...activePositions.values()].every(position => visibleBounds.contains(position))
  moveCamera(() => allVisible ? map!.panTo(bounds.getCenter()) : map!.fitBounds(bounds, 80))
}

function render() {
  if (!map) return
  const now = engine.currentTimestamp.value
  activePositions.clear()
  props.data.deliverymen.forEach((deliveryman, index) => {
    const state = getMapState(deliveryman.deliverymanId)
    if (hiddenIds.has(deliveryman.deliverymanId)) {
      clearMapState(state)
      mapStates.delete(deliveryman.deliverymanId)
      return
    }
    const count = occurredPointCount(deliveryman.points, now)
    const color = colors[index % colors.length]!
    if (count !== state.renderedPointCount)
      syncHistoricalOverlays(state, deliveryman, count, color, now)
    updateStayCounters(state, now)
    updateActiveMarker(state, deliveryman, count, color, now)
  })
  followActivePositions()
}

function seekSlider(event: Event) {
  const value = Number((event.target as HTMLInputElement).value) / 1000
  engine.seekTo(new Date(props.data.from).getTime() + engine.duration.value * value)
}

function toggleVisibility(id: number) {
  hiddenIds.has(id) ? hiddenIds.delete(id) : hiddenIds.add(id)
  render()
}

function enableFollow() {
  engine.followEnabled.value = true
  if (activePositions.size) render()
  else centerOnRouteStart()
}

async function initialize() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) {
    error.value = 'Google Maps no está configurado.'
    initializing.value = false
    return
  }
  try {
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    setOptions({ key, v: 'weekly', ...(mapId ? { mapIds: [mapId] } : {}) })
    const { Map: GoogleMap } = await importLibrary('maps') as google.maps.MapsLibrary
    if (!mapContainer.value) return
    map = new GoogleMap(mapContainer.value, {
      center: { lat: 6.2442, lng: -75.5812 },
      zoom: 14,
      mapId: mapId || undefined,
      streetViewControl: false,
      mapTypeControl: false,
    })
    infoWindow = new google.maps.InfoWindow()
    listeners = [
      map.addListener('dragstart', () => { engine.followEnabled.value = false }),
      map.addListener('zoom_changed', () => {
        if (!cameraMovingProgrammatically) engine.followEnabled.value = false
      }),
    ]
    if (props.data.deliverymen.some(item => item.stays.some(stay => stay.isActive)))
      engine.goToEnd()
    centerOnRouteStart()
    render()
  } catch {
    error.value = 'No fue posible cargar Google Maps.'
  } finally {
    initializing.value = false
  }
}

watch(() => engine.currentTimestamp.value, render)
watch(() => props.data, (_value, previous) => {
  const current = engine.currentTimestamp.value
  const wasAtLiveEdge = Math.abs(current - new Date(previous.to).getTime()) < 2_000
  clearObjects()
  engine.seekTo(wasAtLiveEdge ? new Date(props.data.to).getTime() : current)
  render()
}, { deep: true })
watch(() => props.evidencePointIds, () => {
  mapStates.forEach(state => { state.renderedPointCount = -1 })
  render()
}, { deep: true })

onMounted(() => {
  void initialize()
  counterTimer = window.setInterval(() => {
    mapStates.forEach(state => updateStayCounters(state, engine.currentTimestamp.value))
  }, 1_000)
})
onUnmounted(() => {
  engine.pause()
  if (counterTimer != null) window.clearInterval(counterTimer)
  listeners.forEach(listener => listener.remove())
  clearObjects()
  infoWindow?.close()
  map = null
})
</script>
