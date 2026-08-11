<template>
  <div>
    <div v-if="error" class="flex h-72 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-6 text-center text-sm text-amber-800">
      {{ error }}
    </div>
    <div v-else ref="mapContainer" class="h-[420px] w-full rounded-xl border border-gray-200" />
    <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
      <span v-if="showStayRadius" class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-amber-400" /> Estadía agrupada</span>
      <span class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-gray-400" /> Margen</span>
      <span v-if="hasCurrentRouteOrder()" class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-violet-600" /> Pedido de ruta en curso</span>
      <span v-if="hasPreviousRouteOrder()" class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-blue-600" /> Pedido de ruta anterior</span>
      <span v-if="hasRelatedOrder()" class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Ubicación relacionada</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { escapeMapHtml, formatStayDuration } from '@/composables/useDeliveryRoutePlayback'
import type { DeliveryIncidentLocationEvidence, DeliveryPlaybackStay } from '@/services/MainAPI/deliveryTrackingIncidentsApi'

const props = defineProps<{
  locations: DeliveryIncidentLocationEvidence[]
  centerLatitude: number | null
  centerLongitude: number | null
  radiusMeters: number
  showStayRadius?: boolean
  stay?: DeliveryPlaybackStay | null
  startedAt?: string | null
  endedAt?: string | null
  isActive?: boolean
  durationSeconds?: number
  pointCount?: number
  branchName?: string
  distanceToBranchMeters?: number | null
  distanceToOrderMeters?: number | null
  orderId?: number | null
  orderAddress?: string | null
  orderLatitude?: number | null
  orderLongitude?: number | null
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const error = ref('')
let map: google.maps.Map | null = null
let markers: google.maps.Marker[] = []
let routeLine: google.maps.Polyline | null = null
let stayCircle: google.maps.Circle | null = null
let stayMarker: google.maps.Marker | null = null
let infoWindow: google.maps.InfoWindow | null = null
let counterTimer: number | null = null

const hasOrder = () => (props.orderLatitude != null && props.orderLongitude != null)
  || Boolean(props.stay?.orders.some(order => order.latitude != null && order.longitude != null))
const hasCurrentRouteOrder = () => Boolean(props.stay?.orders.some(order => order.roles.includes('current_route')))
const hasPreviousRouteOrder = () => Boolean(props.stay?.orders.some(order => order.roles.includes('previous_route')))
const hasRelatedOrder = () => Boolean(props.orderId || props.stay?.orders.some(order => order.roles.includes('related')))
const formatDateTime = (value: string) => new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' })

function currentDurationSeconds() {
  const startedAt = props.stay?.startedAt || props.startedAt
  const active = props.stay?.isActive ?? props.isActive
  if (active && startedAt) return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  return props.stay?.durationSeconds ?? props.durationSeconds ?? 0
}

function stayDetails() {
  const stay = props.stay
  const startedAt = stay?.startedAt || props.startedAt
  const endedAt = stay?.endedAt || props.endedAt
  const active = stay?.isActive ?? props.isActive
  const orders = stay?.orders || []
  const orderRows = orders.map(order => {
    const roles = order.roles.map(role => ({ current_route: 'Pedido de la ruta en curso', previous_route: 'Pedido de la ruta anterior', related: 'Ubicación relacionada' })[role]).join(' · ')
    return `<div style="margin-top:6px"><b>${escapeMapHtml(roles)} #${order.orderId}</b><br>${escapeMapHtml(order.address || 'Dirección no disponible')}${order.deliveredAt ? `<br>Entregado: ${formatDateTime(order.deliveredAt)}` : ''}</div>`
  }).join('')
  return `<div style="max-width:320px;font-size:12px;line-height:1.45"><b>Estadía agrupada</b><br>Inicio: ${startedAt ? formatDateTime(startedAt) : 'sin dato'}<br>Fin: ${active ? 'Activa' : endedAt ? formatDateTime(endedAt) : 'sin dato'}<br>Duración: <b>${formatStayDuration(currentDurationSeconds())}</b><br>Puntos agrupados: ${stay?.pointCount ?? props.pointCount ?? props.locations.filter(point => point.isCorePoint).length}<br>Ubicación aproximada: ${props.centerLatitude?.toFixed(6) ?? '—'}, ${props.centerLongitude?.toFixed(6) ?? '—'}<br>Radio observado: ${Math.round(props.radiusMeters)} m<br>Sucursal: ${escapeMapHtml(props.branchName || 'sin dato')} · ${props.distanceToBranchMeters == null ? 'sin distancia' : `${Math.round(props.distanceToBranchMeters)} m`}<br>Distancia al pedido: ${props.distanceToOrderMeters == null ? 'sin dato' : `${Math.round(props.distanceToOrderMeters)} m`}${orderRows || (props.orderId ? `<div style="margin-top:6px"><b>Pedido relacionado #${props.orderId}</b><br>${escapeMapHtml(props.orderAddress || 'Dirección no disponible')}</div>` : '<br>Sin pedidos relacionados')}</div>`
}

function updateStayCounter() {
  stayMarker?.setLabel({
    text: formatStayDuration(currentDurationSeconds()),
    color: '#111827',
    fontSize: '12px',
    fontWeight: '700',
  })
}

function clearEvidence() {
  markers.forEach(marker => marker.setMap(null))
  markers = []
  routeLine?.setMap(null)
  routeLine = null
  stayCircle?.setMap(null)
  stayCircle = null
  stayMarker?.setMap(null)
  stayMarker = null
}

function renderEvidence() {
  if (!map) return
  clearEvidence()
  const bounds = new google.maps.LatLngBounds()
  const path = props.locations.map(point => ({ lat: point.latitude, lng: point.longitude }))

  if (path.length > 0) {
    path.forEach(position => bounds.extend(position))
    routeLine = new google.maps.Polyline({
      map,
      path,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 4,
    })
    props.locations.forEach((point, index) => {
      if (props.showStayRadius && point.isCorePoint) return
      const position = path[index]!
      markers.push(new google.maps.Marker({
        map,
        position,
        title: `${point.isCorePoint ? 'Punto de evidencia' : 'Margen'} · ${formatDateTime(point.recordedAt)}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#9ca3af',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 5,
        },
      }))
    })
  }

  const center = resolveCenter()
  if (center) {
    bounds.extend(center)
    if (props.showStayRadius !== false) {
      stayCircle = new google.maps.Circle({
        map,
        center,
        radius: Math.max(props.radiusMeters, 5),
        fillColor: '#f59e0b',
        fillOpacity: 0.22,
        strokeColor: '#d97706',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: true,
      })
      stayMarker = new google.maps.Marker({
        map,
        position: center,
        title: 'Ver detalle de la estadía',
        zIndex: 24,
        label: {
          text: formatStayDuration(currentDurationSeconds()),
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
      const openDetails = () => {
        infoWindow?.setContent(stayDetails())
        infoWindow?.open({ map, anchor: stayMarker! })
      }
      stayMarker.addListener('click', openDetails)
      stayCircle.addListener('click', openDetails)
    }
  }

  const contextOrders = props.stay?.orders?.length
    ? props.stay.orders
    : hasOrder() && props.orderId
      ? [{ orderId: props.orderId, deliveredAt: null, address: props.orderAddress || null, latitude: props.orderLatitude!, longitude: props.orderLongitude!, roles: ['related'] as const }]
      : []
  contextOrders.forEach(order => {
    if (order.latitude == null || order.longitude == null) return
    const orderPosition = { lat: order.latitude, lng: order.longitude }
    bounds.extend(orderPosition)
    const role = order.roles.includes('related') ? 'related' : order.roles[0] || 'current_route'
    const styles = role === 'related'
      ? { color: '#059669', label: 'R' }
      : role === 'previous_route'
        ? { color: '#2563eb', label: 'A' }
        : { color: '#7c3aed', label: 'P' }
    const orderMarker = new google.maps.Marker({
      map,
      position: orderPosition,
      title: `Pedido #${order.orderId}`,
      label: { text: styles.label, color: '#ffffff', fontWeight: '700' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: styles.color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 11,
      },
    })
    orderMarker.addListener('click', () => {
      infoWindow?.setContent(`<div style="max-width:260px;font-size:12px"><b>Pedido #${order.orderId}</b><br>${escapeMapHtml(order.address || 'Dirección no disponible')}${order.deliveredAt ? `<br>Entregado: ${formatDateTime(order.deliveredAt)}` : ''}</div>`)
      infoWindow?.open({ map, anchor: orderMarker })
    })
    markers.push(orderMarker)
  })

  if (props.locations.length === 0 && !hasOrder() && center) {
    map.setCenter(center)
    map.setZoom(16)
  } else if (props.locations.length > 0 || hasOrder() || center) {
    map.fitBounds(bounds, 48)
  }
}

function resolveCenter() {
  if (props.centerLatitude != null && props.centerLongitude != null)
    return { lat: props.centerLatitude, lng: props.centerLongitude }
  const first = props.locations[0]
  if (first) return { lat: first.latitude, lng: first.longitude }
  if (props.orderLatitude != null && props.orderLongitude != null)
    return { lat: props.orderLatitude, lng: props.orderLongitude }
  const contextOrder = props.stay?.orders.find(order => order.latitude != null && order.longitude != null)
  if (contextOrder) return { lat: contextOrder.latitude!, lng: contextOrder.longitude! }
  return null
}

async function initialize() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    error.value = 'Google Maps no está configurado. La evidencia numérica continúa disponible.'
    return
  }
  try {
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    setOptions({ key: apiKey, v: 'weekly', ...(mapId ? { mapIds: [mapId] } : {}) })
    const { Map: GoogleMap } = await importLibrary('maps') as google.maps.MapsLibrary
    if (!mapContainer.value) return
    map = new GoogleMap(mapContainer.value, {
      center: resolveCenter() || { lat: 4.711, lng: -74.0721 },
      zoom: 16,
      mapId: mapId || undefined,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    })
    infoWindow = new google.maps.InfoWindow()
    renderEvidence()
  } catch {
    error.value = 'No fue posible cargar el mapa. La evidencia numérica continúa disponible.'
  }
}

watch(() => [props.locations, props.centerLatitude, props.centerLongitude, props.radiusMeters, props.orderLatitude, props.orderLongitude, props.stay],
  () => renderEvidence(), { deep: true })

onMounted(() => {
  void initialize()
  counterTimer = window.setInterval(updateStayCounter, 1_000)
})
onUnmounted(() => {
  if (counterTimer != null) window.clearInterval(counterTimer)
  clearEvidence()
  infoWindow?.close()
  infoWindow = null
  map = null
})
</script>
