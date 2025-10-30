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

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'route-calculated': [waypointOrder: number[]] }>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: any = null
let markers: any[] = []
let userMarker: any = null
let routePolyline: any = null
// Coordenadas buscadas en runtime por geocodificación (no persistentes)
const extraCoordsByOrderId = new Map<number, { lat: number, lng: number }>()

const mapHeight = computed(() => '70vh')
const { location, requestLocation, startTracking, isLocationEnabled } = useGeolocation()

// =========================
// 🔹 Inicializar el mapa
// =========================
onMounted(async () => {
    setOptions({
        key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    })

    // Importar librerías modernas
    const [{ Map }, , , { AdvancedMarkerElement }] = await Promise.all([
        importLibrary('maps'),
        importLibrary('routes'),
        importLibrary('geometry'),
        importLibrary('marker'),
    ])

    // Crear mapa
    map = new Map(mapContainer.value as HTMLElement, {
        center: { lat: 6.2442, lng: -75.5812 }, // Medellín
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
    })

        // Guardar clase de marcador avanzada globalmente
        ; (window as any)._AdvancedMarkerElement = AdvancedMarkerElement

    loadMarkers()

    if (isLocationEnabled()) {
        await handleEnableLocation()
    }
})

// =========================
// 🔹 Recargar pedidos
// =========================
watch(() => props.orders, () => loadMarkers(), { deep: true })

// =========================
// 🔹 Cargar marcadores
// =========================
const getOrderCoords = (order: any): { lat: number, lng: number } | null => {
    if (typeof order?.latitude === 'number' && typeof order?.longitude === 'number') {
        return { lat: order.latitude, lng: order.longitude }
    }
    const extra = extraCoordsByOrderId.get(order?.id)
    return extra ?? null
}

const geocoder = ref<any>(null)
const ensureGeocoder = () => {
    if (!geocoder.value) geocoder.value = new (window as any).google.maps.Geocoder()
}

const geocodeOrder = (order: any) => {
    if (!order?.addressDescription) return
    ensureGeocoder()
    geocoder.value.geocode({ address: order.addressDescription }, (results: any, status: any) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location
            const coords = { lat: loc.lat(), lng: loc.lng() }
            extraCoordsByOrderId.set(order.id, coords)
            addOrderMarker(order, coords)
            recalculateRoute()
        } else {
            console.warn('Geocode falló:', status)
        }
    })
}

const addOrderMarker = (order: any, coords: { lat: number, lng: number }) => {
    const AdvancedMarkerElement = (window as any)._AdvancedMarkerElement
    const ClassicMarker = (window as any).google?.maps?.Marker
    const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
    const infoWindow = new (window as any).google.maps.InfoWindow({
        content: `<div class="p-2"><strong>Pedido #${order.id}</strong><br>${order.addressDescription || ''}<div class="mt-2"><a href="${navigateUrl}" target="_blank" rel="noopener" class="text-emerald-600 underline">Navegar</a></div></div>`,
    })
    if (AdvancedMarkerElement) {
        const marker = new AdvancedMarkerElement({ position: coords, map, title: `Pedido #${order.id}` })
        marker.addListener('click', () => infoWindow.open({ map, anchor: marker }))
        markers.push(marker)
    } else if (ClassicMarker) {
        const marker = new ClassicMarker({ position: coords, map, title: `Pedido #${order.id}` })
        marker.addListener('click', () => infoWindow.open(map, marker))
        markers.push(marker)
    }
}

const loadMarkers = () => {
    markers.forEach((m) => m.map = null)
    markers = []
    props.orders
        .filter((o: any) => o?.type === 'delivery')
        .forEach((order: any) => {
            const coords = getOrderCoords(order)
            if (coords) {
                addOrderMarker(order, coords)
            }
        })
}

// =========================
// 🔹 Marcador del usuario
// =========================
const addUserMarker = () => {
    if (!location.value) return
    if (userMarker) userMarker.map = null

    const AdvancedMarkerElement = (window as any)._AdvancedMarkerElement
    const ClassicMarker = (window as any).google?.maps?.Marker
    if (AdvancedMarkerElement) {
        userMarker = new AdvancedMarkerElement({
            position: location.value,
            map,
            title: 'Mi ubicación',
        })
    } else if (ClassicMarker) {
        userMarker = new ClassicMarker({
            position: location.value,
            map,
            title: 'Mi ubicación',
        })
    }
}

// =========================
// 🔹 Habilitar ubicación
// =========================
const handleEnableLocation = async () => {
    const loc = await requestLocation()
    if (loc) {
        map.setCenter(loc)
        addUserMarker()
        startTracking()
    }
}

// =========================
// 🔹 Calcular ruta
// =========================
const recalculateRoute = async (orderedIds?: number[]) => {
    if (props.orders.length === 0) return
    const sourceOrders = orderedIds && orderedIds.length > 0
        ? orderedIds.map(id => props.orders.find(o => o.id === id)).filter(Boolean) as any[]
        : props.orders
    const coordsList = sourceOrders
        .map((o: any) => ({ orderId: o.id, coords: getOrderCoords(o) }))
        .filter(x => x.coords) as Array<{ orderId: number, coords: { lat: number, lng: number } }>

    if (coordsList.length === 0) return

    const origin = location.value ?? coordsList[0].coords
    const waypoints = (location.value ? coordsList : coordsList.slice(1))
        .map(x => ({ lat: x.coords.lat, lng: x.coords.lng, orderId: x.orderId }))

    const result = await RouteOptimizationService.optimizeRoute(origin, waypoints)
    if (!result) return

    if (routePolyline) routePolyline.setMap(null)
    routePolyline = new (window as any).google.maps.Polyline({
        path: result.route.overview_path,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 1,
        strokeWeight: 4,
    })
    routePolyline.setMap(map)
    emit('route-calculated', result.optimizedOrder)
}

// Permitir geocodificar por id desde el padre (lista)
const geocodeOrderById = (orderId: number) => {
    const order = props.orders.find(o => o.id === orderId)
    if (order) geocodeOrder(order)
}

defineExpose({ recalculateRoute, geocodeOrderById })
</script>