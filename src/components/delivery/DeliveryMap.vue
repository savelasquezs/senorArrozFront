<template>
    <div class="w-full">
        <div class="flex items-center gap-2 mb-2">
            <BaseButton size="sm" variant="outline" @click="handleEnableLocation">
                Usar mi ubicación
            </BaseButton>
            <BaseButton size="sm" variant="secondary" @click="recalculateRoute()" :disabled="orders.length === 0">
                Calcular ruta
            </BaseButton>
        </div>
        <div ref="mapContainer" class="w-full rounded-lg border border-gray-200" :style="{ height: mapHeight }"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { OrderListItem } from '@/types/order'
import { useGeolocation } from '@/composables/useGeolocation'
import { RouteOptimizationService } from '@/services/domain/RouteOptimizationService'
import type { GeoLocation } from '@/composables/useGeolocation'

// =========================
// 🔹 Props y eventos
// =========================
interface Props {
    orders: OrderListItem[]
}
const props = defineProps<Props>()
const emit = defineEmits<{ 'route-calculated': [waypointOrder: number[]] }>()

// =========================
// 🔹 Refs y variables
// =========================
const mapContainer = ref<HTMLDivElement | null>(null)
let map: google.maps.Map | null = null
let markers: (google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[] = []
let userMarker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null = null
let routePolyline: google.maps.Polyline | null = null
const extraCoordsByOrderId = new Map<number, GeoLocation>()

const mapHeight = computed(() => '70vh')
const { location, requestLocation, startTracking, isLocationEnabled } = useGeolocation()
const geocoder = ref<google.maps.Geocoder | null>(null)

// =========================
// 🔹 Inicialización
// =========================
onMounted(async () => {
    setOptions({
        key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
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
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    if (!mapId) {
        console.warn('⚠️ Falta VITE_GOOGLE_MAPS_MAP_ID. Los Advanced Markers no funcionarán.')
    }

    map = new Map(mapContainer.value as HTMLElement, {
        center: { lat: 6.2442, lng: -75.5812 },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapId,
    })

        ; (window as any)._AdvancedMarkerElement = AdvancedMarkerElement
    geocoder.value = new Geocoder()
    RouteOptimizationService.initialize(map)
    loadMarkers()

    if (isLocationEnabled()) {
        await handleEnableLocation()
    }
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
    if ((userMarker as any)?.getPosition) bounds.extend((userMarker as any).getPosition())
    else if ((userMarker as any)?.position) bounds.extend((userMarker as any).position)
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

// =========================
// 🔹 Marcador del usuario
// =========================
const addUserMarker = () => {
    if (!map || !location.value) return

    if (userMarker) (userMarker as any).map = null
    const AdvancedMarkerElement = (window as any)._AdvancedMarkerElement

    if (AdvancedMarkerElement && map.getMapTypeId()) {
        userMarker = new AdvancedMarkerElement({
            position: location.value,
            map,
            title: 'Mi ubicación',
        })
    } else {
        userMarker = new google.maps.Marker({
            position: location.value,
            map,
            title: 'Mi ubicación',
        })
    }
}

// =========================
// 🔹 Ubicación y ruta
// =========================
const handleEnableLocation = async () => {
    const loc = await requestLocation()
    if (loc && map) {
        map.setCenter(loc)
        addUserMarker()
        startTracking()
    }
}

const recalculateRoute = async (orderedIds?: number[]) => {
    if (!map || props.orders.length === 0) return

    const sourceOrders = orderedIds?.length
        ? orderedIds.map((id) => props.orders.find((o) => o.id === id)).filter(Boolean) as OrderListItem[]
        : props.orders

    const coordsList = sourceOrders
        .map((o) => ({ orderId: o.id, coords: getOrderCoords(o) }))
        .filter((x) => x.coords) as Array<{ orderId: number; coords: GeoLocation }>

    if (coordsList.length === 0) return

    const origin = location.value ?? coordsList[0].coords
    const waypoints = (location.value ? coordsList : coordsList.slice(1)).map((x) => ({
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
</script>