<template>
    <div class="w-full">
        <div class="flex items-center gap-2 mb-2">
            <BaseButton size="sm" variant="outline" @click="handleEnableLocation">
                Usar mi ubicación
            </BaseButton>
            <BaseButton size="sm" variant="secondary" @click="calculateRoute" :disabled="orders.length === 0">
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
const loadMarkers = () => {
    markers.forEach((m) => m.map = null)
    markers = []

    const AdvancedMarkerElement = (window as any)._AdvancedMarkerElement
    const ClassicMarker = (window as any).google?.maps?.Marker

    props.orders.forEach((order) => {
        const lat = (order as any).latitude
        const lng = (order as any).longitude
        if (!lat || !lng) return

        const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        const infoWindow = new (window as any).google.maps.InfoWindow({
            content: `<div class="p-2"><strong>Pedido #${order.id}</strong><br>${order.addressDescription || ''}<div class="mt-2"><a href="${navigateUrl}" target="_blank" rel="noopener" class="text-emerald-600 underline">Navegar</a></div></div>`,
        })

        if (AdvancedMarkerElement) {
            const marker = new AdvancedMarkerElement({
                position: { lat, lng },
                map,
                title: `Pedido #${order.id}`,
            })
            marker.addListener('click', () => infoWindow.open({ map, anchor: marker }))
            markers.push(marker)
        } else if (ClassicMarker) {
            const marker = new ClassicMarker({
                position: { lat, lng },
                map,
                title: `Pedido #${order.id}`,
            })
            marker.addListener('click', () => infoWindow.open(map, marker))
            markers.push(marker)
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
const calculateRoute = async () => {
    if (!location.value || props.orders.length === 0) return
    const waypoints = props.orders
        .map((o) => ({ lat: (o as any).latitude, lng: (o as any).longitude, orderId: o.id }))
        .filter((p) => p.lat && p.lng)

    const result = await RouteOptimizationService.optimizeRoute(location.value, waypoints)
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
</script>