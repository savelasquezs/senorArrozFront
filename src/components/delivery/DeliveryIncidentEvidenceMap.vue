<template>
  <div>
    <div v-if="error" class="flex h-72 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-6 text-center text-sm text-amber-800">
      {{ error }}
    </div>
    <div v-else ref="mapContainer" class="h-[420px] w-full rounded-xl border border-gray-200" />
    <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
      <span class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-blue-600" /> Punto de evidencia</span>
      <span class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-gray-400" /> Margen</span>
      <span v-if="hasOrder()" class="flex items-center gap-1"><i class="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Destino del pedido</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { DeliveryIncidentLocationEvidence } from '@/services/MainAPI/deliveryTrackingIncidentsApi'

const props = defineProps<{
  locations: DeliveryIncidentLocationEvidence[]
  centerLatitude: number | null
  centerLongitude: number | null
  radiusMeters: number
  showStayRadius?: boolean
  orderLatitude?: number | null
  orderLongitude?: number | null
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const error = ref('')
let map: google.maps.Map | null = null
let markers: google.maps.Marker[] = []
let routeLine: google.maps.Polyline | null = null
let stayCircle: google.maps.Circle | null = null

const hasOrder = () => props.orderLatitude != null && props.orderLongitude != null

function clearEvidence() {
  markers.forEach(marker => marker.setMap(null))
  markers = []
  routeLine?.setMap(null)
  routeLine = null
  stayCircle?.setMap(null)
  stayCircle = null
}

function renderEvidence() {
  if (!map) return
  clearEvidence()
  const bounds = new google.maps.LatLngBounds()
  const path = props.locations.map(point => ({ lat: point.latitude, lng: point.longitude }))

  if (path.length > 0) {
    routeLine = new google.maps.Polyline({
      map,
      path,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      strokeWeight: 4,
    })
    props.locations.forEach((point, index) => {
      const position = path[index]!
      bounds.extend(position)
      markers.push(new google.maps.Marker({
        map,
        position,
        title: `${point.isCorePoint ? 'Punto de evidencia' : 'Margen'} · ${new Date(point.recordedAt).toLocaleString('es-CO')}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: point.isCorePoint ? '#2563eb' : '#9ca3af',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: point.isCorePoint ? 6 : 5,
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
        fillOpacity: 0.12,
        strokeColor: '#d97706',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      })
    }
  }

  if (hasOrder()) {
    const orderPosition = { lat: props.orderLatitude!, lng: props.orderLongitude! }
    bounds.extend(orderPosition)
    markers.push(new google.maps.Marker({
      map,
      position: orderPosition,
      title: 'Destino del pedido',
      label: { text: 'P', color: '#ffffff', fontWeight: '700' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#059669',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 11,
      },
    }))
  }

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
  if (hasOrder()) return { lat: props.orderLatitude!, lng: props.orderLongitude! }
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
    renderEvidence()
  } catch {
    error.value = 'No fue posible cargar el mapa. La evidencia numérica continúa disponible.'
  }
}

watch(() => [props.locations, props.centerLatitude, props.centerLongitude, props.radiusMeters, props.orderLatitude, props.orderLongitude],
  () => renderEvidence(), { deep: true })

onMounted(initialize)
onUnmounted(() => {
  clearEvidence()
  map = null
})
</script>
