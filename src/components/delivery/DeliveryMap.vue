<template>
    <div class="w-full">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
            <BaseButton class="w-full sm:w-auto" size="sm" variant="outline" @click="openInGoogleMaps"
                :disabled="orders.length === 0">
                Abrir en Google Maps
            </BaseButton>

            <!-- Indicadores de conductores -->
            <template v-if="deliverymanLocations && totalDriverCount > 0">
                <div v-for="(loc, driverId) in deliverymanLocations" :key="driverId"
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                    :class="Date.now() - loc.updatedAt.getTime() < 30_000
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'">
                    <span class="w-2 h-2 rounded-full"
                        :class="Date.now() - loc.updatedAt.getTime() < 30_000
                            ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'"></span>
                    <span class="font-semibold">{{ loc.name ?? `#${driverId}` }}</span>
                    <span>· {{ lastUpdatedLabelFor(loc) }}</span>
                </div>
            </template>
        </div>

        <!-- Mapa con posición relativa para superponer elementos -->
        <div class="relative w-full">
            <div ref="mapContainer" class="w-full rounded-lg border border-gray-200"
                :style="{ height: mapHeight }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { OrderListItem } from '@/types/order'
import { RouteOptimizationService } from '@/services/domain/RouteOptimizationService'
import type { GeoLocation } from '@/composables/useGeolocation'

// =========================
// 🔹 Props y eventos
// =========================
export interface DriverLocation {
    lat: number
    lng: number
    updatedAt: Date
    name?: string
}

interface Props {
    orders: OrderListItem[]
    /** Mapa de ubicaciones GPS: clave = deliverymanId */
    deliverymanLocations?: Record<number, DriverLocation>
}
const props = defineProps<Props>()
const emit = defineEmits<{ 'route-calculated': [waypointOrder: number[]] }>()

// =========================
// 🔹 Refs y variables
// =========================
const mapContainer = ref<HTMLDivElement | null>(null)
let map: google.maps.Map | null = null
let markers: (google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[] = []
const driverMarkers = new Map<number, google.maps.marker.AdvancedMarkerElement | google.maps.Marker>()
let routePolyline: google.maps.Polyline | null = null
const extraCoordsByOrderId = new Map<number, GeoLocation>()

const mapHeight = computed(() => '70vh')
const geocoder = ref<google.maps.Geocoder | null>(null)

// ─── Driver location display ──────────────────────────────────────────────────

const nowSeconds = ref(Math.floor(Date.now() / 1000))
let _clockInterval: ReturnType<typeof setInterval> | null = null

const totalDriverCount = computed(() =>
    props.deliverymanLocations ? Object.keys(props.deliverymanLocations).length : 0
)

function lastUpdatedLabelFor(loc: DriverLocation): string {
    void nowSeconds.value
    const diffSec = Math.floor((Date.now() - loc.updatedAt.getTime()) / 1000)
    if (diffSec < 5) return 'Ahora mismo'
    if (diffSec < 60) return `Hace ${diffSec}s`
    return `Hace ${Math.floor(diffSec / 60)}min`
}

// =========================
// 🔹 Marcadores de conductores (múltiples)
// =========================
watch(
    () => props.deliverymanLocations,
    (locs) => {
        if (!map) return
        updateDriverMarkers(locs)
    },
    { deep: true }
)

function updateDriverMarkers(locs: Record<number, DriverLocation> | undefined) {
    if (!map) return
    const AdvancedMarkerElement = (window as any)._AdvancedMarkerElement
    const currentIds = new Set(Object.keys(locs ?? {}).map(Number))

    // Eliminar marcadores de conductores que ya no están en la lista
    for (const [id, marker] of driverMarkers) {
        if (!currentIds.has(id)) {
            if (typeof (marker as any).setMap === 'function') (marker as any).setMap(null)
            else (marker as any).map = null
            driverMarkers.delete(id)
        }
    }

    if (!locs) return

    for (const [idStr, loc] of Object.entries(locs)) {
        const id = Number(idStr)
        const position = { lat: loc.lat, lng: loc.lng }
        const label = loc.name ?? `Domiciliario #${id}`
        const isConnected = Date.now() - loc.updatedAt.getTime() < 30_000
        const fill = isConnected ? '#7c3aed' : '#9ca3af'

        const existing = driverMarkers.get(id)
        if (existing) {
            if (typeof (existing as any).position !== 'undefined') (existing as any).position = position
            else if (typeof (existing as any).setPosition === 'function') (existing as any).setPosition(position)
            continue
        }

        let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker
        if (AdvancedMarkerElement) {
            const icon = document.createElement('div')
            icon.style.cssText = `width:36px;height:36px;background:${fill};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);font-size:18px;`
            icon.textContent = '🛵'
            marker = new AdvancedMarkerElement({ position, map, title: label, content: icon })
        } else {
            marker = new google.maps.Marker({
                position, map, title: label,
                icon: { url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png', scaledSize: new google.maps.Size(40, 40) },
            })
        }
        driverMarkers.set(id, marker)
    }
}

// =========================
// 🔹 Inicialización
// =========================
onMounted(async () => {
    // Iniciar reloj para "última actualización"
    _clockInterval = setInterval(() => {
        nowSeconds.value = Math.floor(Date.now() / 1000)
    }, 1000)
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID

    setOptions({
        key: apiKey,
        ...(mapId && { mapIds: [mapId] }), // Include Map ID if available
    })

    // Importar módulos modernos
    const [
        { Map },
        ,
        { AdvancedMarkerElement },
        { Geocoder }
    ] = await Promise.all([
        importLibrary('maps'),
        importLibrary('geometry'),
        importLibrary('marker'),
        importLibrary('geocoding'),
    ])

    // Crear mapa
    if (!mapId) {
        console.warn('⚠️ Falta VITE_GOOGLE_MAPS_MAP_ID. Los Advanced Markers no funcionarán.')
    }

    map = new Map(mapContainer.value as HTMLElement, {
        center: { lat: 6.2442, lng: -75.5812 },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        ...(mapId && { mapId }), // Only include mapId if it's defined
    })

        ; (window as any)._AdvancedMarkerElement = AdvancedMarkerElement
    geocoder.value = new Geocoder()
    RouteOptimizationService.initialize(map)
    loadMarkers()

    // Si ya hay ubicaciones al montar, colocar marcadores
    if (props.deliverymanLocations && Object.keys(props.deliverymanLocations).length > 0) {
        updateDriverMarkers(props.deliverymanLocations)
    }
})

onUnmounted(() => {
    if (_clockInterval) clearInterval(_clockInterval)
    for (const marker of driverMarkers.values()) {
        if (typeof (marker as any).setMap === 'function') (marker as any).setMap(null)
        else (marker as any).map = null
    }
    driverMarkers.clear()
})

// =========================
// 🔹 Observadores
// =========================
watch(() => props.orders, () => loadMarkers(), { deep: true })

// =========================
// 🔹 Funciones de mapa
// =========================
const getOrderCoords = (order: OrderListItem): GeoLocation | null => {
    if (typeof (order as any).latitude === 'number' && typeof (order as any).longitude === 'number') {
        return { lat: (order as any).latitude, lng: (order as any).longitude }
    }
    return extraCoordsByOrderId.get(order.id) ?? null
}

const clearMarkers = () => {
    markers.forEach((m: any) => {
        if (typeof m.setMap === 'function') m.setMap(null)
        else m.map = null
    })
    markers = []
}

const fitToMarkers = () => {
    if (!map) return
    const bounds = new google.maps.LatLngBounds()
    markers.forEach((m: any) => {
        const pos = m.getPosition?.() || m.position
        if (pos) bounds.extend(pos)
    })
    // No considerar marcador de usuario (geolocalización deshabilitada)
    if (!bounds.isEmpty()) map.fitBounds(bounds)
}

const loadMarkers = () => {
    if (!map) return
    clearMarkers()

    props.orders
        .filter((o) => o.type === 'delivery')
        .forEach((order) => {
            const coords = getOrderCoords(order)
            if (coords) addOrderMarker(order, coords)
        })

    // Ajustar vista si hay marcadores
    if (markers.length > 0) fitToMarkers()
}

const addOrderMarker = (order: OrderListItem, coords: GeoLocation) => {
    if (!map) return

    const AdvancedMarkerElement = (window as any)._AdvancedMarkerElement
    const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`

    const infoWindow = new google.maps.InfoWindow({
        content: `
        <div class="p-2">
          <strong>Pedido #${order.id}</strong><br>
          ${order.addressDescription || ''}
          <div class="mt-2">
            <a href="${navigateUrl}" target="_blank" rel="noopener" class="text-emerald-600 underline">
              Navegar
            </a>
          </div>
        </div>`,
    })

    let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker
    if (AdvancedMarkerElement && map.getMapTypeId()) {
        marker = new AdvancedMarkerElement({
            position: coords,
            map,
            title: `Pedido #${order.id}`,
        })
        marker.addListener('click', () => infoWindow.open({ map, anchor: marker }))
    } else {
        marker = new google.maps.Marker({
            position: coords,
            map,
            title: `Pedido #${order.id}`,
        })
        marker.addListener('click', () => infoWindow.open(map, marker))
    }

    markers.push(marker)
}

const geocodeOrder = async (order: OrderListItem): Promise<void> => {
    if (!order.addressDescription || !geocoder.value) return

    try {
        const { results } = await geocoder.value.geocode({ address: order.addressDescription })
        if (results.length > 0 && results[0].geometry?.location) {
            const loc = results[0].geometry.location
            const coords = { lat: loc.lat(), lng: loc.lng() }
            extraCoordsByOrderId.set(order.id, coords)
            addOrderMarker(order, coords)
            await recalculateRoute()
        }
    } catch (error) {
        console.warn('Error al geocodificar dirección:', error)
    }
}

// Geolocalización eliminada

const recalculateRoute = async (orderedIds?: number[]) => {
    if (!map || props.orders.length === 0) return

    const sourceOrders = orderedIds?.length
        ? orderedIds.map((id) => props.orders.find((o) => o.id === id)).filter(Boolean) as OrderListItem[]
        : props.orders

    const coordsList = sourceOrders
        .map((o) => ({ orderId: o.id, coords: getOrderCoords(o) }))
        .filter((x) => x.coords) as Array<{ orderId: number; coords: GeoLocation }>

    if (coordsList.length === 0) return

    const origin = coordsList[0].coords
    const waypoints = coordsList.slice(1).map((x) => ({
        lat: x.coords.lat,
        lng: x.coords.lng,
        orderId: x.orderId,
    }))

    const result = await RouteOptimizationService.optimizeRoute(origin, waypoints)
    if (!result) return

    if (routePolyline) routePolyline.setMap(null)
    routePolyline = new google.maps.Polyline({
        path: result.route.overview_path,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 1,
        strokeWeight: 4,
    })
    routePolyline.setMap(map)
    // Ajustar vista a la ruta
    try {
        const bounds = new google.maps.LatLngBounds()
        result.route.overview_path.forEach((p: any) => bounds.extend(p))
        if (!bounds.isEmpty()) map.fitBounds(bounds)
    } catch { }
    emit('route-calculated', result.optimizedOrder)
}

// =========================
// 🔹 Exponer funciones públicas
// =========================
const geocodeOrderById = (orderId: number) => {
    const order = props.orders.find((o) => o.id === orderId)
    if (order) geocodeOrder(order)
}

defineExpose({ recalculateRoute, geocodeOrderById })

// =========================
// 🔹 Abrir ruta en Google Maps
// =========================
const openInGoogleMaps = () => {
    // Obtener coords válidas en el orden actual
    const coordsList = props.orders
        .filter((o) => o.type === 'delivery')
        .map((o) => getOrderCoords(o))
        .filter(Boolean) as GeoLocation[]

    if (coordsList.length === 0) return

    // Origen vacío (usa ubicación actual del dispositivo en Google Maps)
    const destination = coordsList[coordsList.length - 1]
    const rawWaypoints = coordsList.slice(0, Math.max(coordsList.length - 1, 0))

    // Límite de Google: máximo 25 puntos totales (sin origin => destino + waypoints <= 25)
    const maxWaypoints = 24
    const waypoints = rawWaypoints.slice(0, maxWaypoints)

    const fmt = (p: GeoLocation) => `${p.lat},${p.lng}`
    const base = 'https://www.google.com/maps/dir/?api=1&travelmode=driving'
    const params = [
        `destination=${encodeURIComponent(fmt(destination))}`,
    ]
    if (waypoints.length > 0) {
        const wp = waypoints.map(fmt).join('|')
        params.push(`waypoints=${encodeURIComponent(wp)}`)
    }
    const url = `${base}&${params.join('&')}`
    window.open(url, '_blank')
}
</script>