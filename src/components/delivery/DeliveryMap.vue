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

        <!-- Mapa + panel lateral (pedidos / productos del domiciliario seleccionado) -->
        <div class="relative w-full">
            <div ref="mapContainer" class="w-full rounded-lg border border-gray-200"
                :style="{ height: mapHeight }"></div>

            <aside v-if="selectedDriverId != null"
                class="delivery-map-panel absolute top-2 right-2 bottom-2 z-[1] flex w-[min(360px,calc(100%-1rem))] flex-col rounded-lg border border-gray-200 bg-white shadow-lg">
                <div class="flex shrink-0 items-start justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
                    <div class="min-w-0">
                        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Ruta / pedidos</p>
                        <p class="truncate text-sm font-semibold text-gray-900">{{ panelDriverTitle }}</p>
                    </div>
                    <button type="button"
                        class="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        aria-label="Cerrar panel" @click="closeDriverPanel">
                        <span class="text-lg leading-none">×</span>
                    </button>
                </div>
                <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                    <p v-if="panelOrders.length === 0" class="px-1 py-4 text-center text-sm text-gray-500">
                        No hay pedidos para mostrar con los filtros actuales.
                    </p>
                    <ul v-else class="space-y-2">
                        <li v-for="order in panelOrders" :key="order.id"
                            class="rounded-md border border-gray-100 bg-gray-50/80 px-2 py-2">
                            <button type="button"
                                class="flex w-full items-center justify-between gap-2 text-left text-sm"
                                @click="toggleOrderExpanded(order)">
                                <span class="font-mono font-semibold text-emerald-800">#{{ order.id }}</span>
                                <span class="shrink-0 text-xs text-gray-600">{{ order.statusDisplayName }}</span>
                            </button>
                            <div v-if="expandedOrderId === order.id" class="mt-2 border-t border-gray-200 pt-2">
                                <p v-if="panelLoadingOrderId === order.id" class="text-xs text-gray-500">Cargando productos…</p>
                                <ul v-else-if="linesForOrder(order).length" class="space-y-0.5 text-xs text-gray-700">
                                    <li v-for="(line, idx) in linesForOrder(order)" :key="idx">
                                        {{ line.quantity }}× {{ line.productName }}
                                    </li>
                                </ul>
                                <p v-else class="text-xs text-gray-500">Sin líneas de detalle.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </aside>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, shallowRef } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { OrderDetailItem, OrderLineSummary, OrderListItem } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
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
    /** Ruta activa del domiciliario (API / SignalR); null si no aplica. */
    deliveryRouteId?: number | null
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
/** Raíz DOM del pin (Advanced Marker) para actualizar texto sin recrear el marcador. */
const driverMarkerRoots = new Map<number, HTMLElement>()
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
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `Hace ${diffMin} min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `Hace ${diffH} h`
    const diffD = Math.floor(diffH / 24)
    return `Hace ${diffD} día(s)`
}

function ordersOnTheWayForDriver(driverId: number): OrderListItem[] {
    return props.orders.filter(
        (o) =>
            o.type === 'delivery' &&
            o.deliveryManId === driverId &&
            o.status === 'on_the_way'
    )
}

/** Tooltip nativo estable (sin “hace X s”; la frescura va en los chips superiores). */
function driverMarkerStableTitle(driverId: number, loc: DriverLocation): string {
    const name = loc.name ?? `Domiciliario #${driverId}`
    const onWay = ordersOnTheWayForDriver(driverId)
    const n = onWay.length
    if (n === 0) return `${name} — 0 en ruta`
    const base = `${name} — ${n} en ruta`
    const ids = onWay.map((o) => o.id)
    const idList = ids.map((id) => `#${id}`).join(', ')
    const withIds = `${base} (${idList})`
    if (withIds.length > 80 || ids.length > 5) return `${base} · clic para ver lista`
    return withIds
}

function onTheWayCountForDriver(driverId: number): number {
    return ordersOnTheWayForDriver(driverId).length
}

// ─── Panel lateral (clic en pin) ───────────────────────────────────────────

const selectedDriverId = ref<number | null>(null)
const expandedOrderId = ref<number | null>(null)
const orderDetailLinesCache = shallowRef(new Map<number, OrderDetailItem[]>())
const panelLoadingOrderId = ref<number | null>(null)

const panelDriverTitle = computed(() => {
    const id = selectedDriverId.value
    if (id == null) return ''
    const loc = props.deliverymanLocations?.[id]
    return loc?.name ?? `Domiciliario #${id}`
})

const panelOrders = computed((): OrderListItem[] => {
    const id = selectedDriverId.value
    if (id == null || !props.deliverymanLocations) return []
    const loc = props.deliverymanLocations[id]
    const forDriver = props.orders.filter(
        (o) => o.type === 'delivery' && o.deliveryManId === id
    )
    if (loc?.deliveryRouteId != null && loc.deliveryRouteId !== undefined) {
        const rid = loc.deliveryRouteId
        return forDriver.filter((o) => o.deliveryRouteId === rid).sort((a, b) => b.id - a.id)
    }
    return forDriver.filter((o) => o.status === 'on_the_way').sort((a, b) => b.id - a.id)
})

function closeDriverPanel() {
    selectedDriverId.value = null
    expandedOrderId.value = null
}

function linesForOrder(order: OrderListItem): OrderLineSummary[] {
    const sl = order.summaryLines
    if (sl?.length) return sl
    const details = orderDetailLinesCache.value.get(order.id)
    if (!details?.length) return []
    return details.map((d) => ({ productName: d.productName, quantity: d.quantity }))
}

async function toggleOrderExpanded(order: OrderListItem) {
    if (expandedOrderId.value === order.id) {
        expandedOrderId.value = null
        return
    }
    expandedOrderId.value = order.id
    if (order.summaryLines?.length) return
    if (orderDetailLinesCache.value.has(order.id)) return
    panelLoadingOrderId.value = order.id
    try {
        const d = await orderApi.fetchDetail(order.id)
        const next = new Map(orderDetailLinesCache.value)
        next.set(order.id, d.orderDetails)
        orderDetailLinesCache.value = next
    } catch {
        const next = new Map(orderDetailLinesCache.value)
        next.set(order.id, [])
        orderDetailLinesCache.value = next
    } finally {
        panelLoadingOrderId.value = null
    }
}

// =========================
// 🔹 Marcadores de conductores (múltiples)
// =========================
let prevDriverLocationCount = 0

function fitMapToDriverLocations(locs: Record<number, DriverLocation>) {
    if (!map) return
    const entries = Object.entries(locs)
    if (entries.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    for (const [, loc] of entries) {
        bounds.extend({ lat: loc.lat, lng: loc.lng })
    }
    if (entries.length === 1) {
        const loc = entries[0][1]
        map.setCenter({ lat: loc.lat, lng: loc.lng })
        map.setZoom(14)
        return
    }
    map.fitBounds(bounds, { top: 56, right: 56, bottom: 56, left: 56 })
}

watch(
    () => props.deliverymanLocations,
    (locs) => {
        if (!map) return
        const sid = selectedDriverId.value
        if (sid != null && (!locs || !locs[sid])) closeDriverPanel()
        const n = locs ? Object.keys(locs).length : 0
        updateDriverMarkers(locs)
        if (props.orders.length === 0 && n > 0 && prevDriverLocationCount === 0) {
            fitMapToDriverLocations(locs!)
        }
        prevDriverLocationCount = n
    },
    { deep: true }
)

watch(
    () => props.orders,
    () => {
        if (!map) return
        updateDriverMarkers(props.deliverymanLocations)
    },
    { deep: true }
)

function syncDriverPinDom(root: HTMLElement, driverId: number, loc: DriverLocation) {
    const title = driverMarkerStableTitle(driverId, loc)
    root.title = title
    const isConnected = Date.now() - loc.updatedAt.getTime() < 30_000
    const fill = isConnected ? '#7c3aed' : '#9ca3af'
    const icon = root.querySelector('.dm-marker-icon') as HTMLElement | null
    if (icon) icon.style.background = fill
    const label = root.querySelector('.dm-marker-label') as HTMLElement | null
    if (label) {
        const displayName = (loc.name ?? `#${driverId}`).trim()
        label.textContent = displayName.length > 18 ? displayName.slice(0, 17) + '…' : displayName
        label.title = loc.name ?? `Domiciliario #${driverId}`
    }
    const badge = root.querySelector('.dm-marker-badge') as HTMLElement | null
    const n = onTheWayCountForDriver(driverId)
    if (badge) {
        if (n > 0) {
            badge.textContent = String(n)
            badge.style.display = 'block'
        } else {
            badge.style.display = 'none'
        }
    }
}

function createDriverPinRoot(driverId: number, loc: DriverLocation): HTMLElement {
    const title = driverMarkerStableTitle(driverId, loc)
    const isConnected = Date.now() - loc.updatedAt.getTime() < 30_000
    const fill = isConnected ? '#7c3aed' : '#9ca3af'

    const root = document.createElement('div')
    root.className = 'dm-marker-root'
    root.title = title
    root.style.cssText =
        'display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;'

    const wrap = document.createElement('div')
    wrap.style.cssText = 'position:relative;'

    const icon = document.createElement('div')
    icon.className = 'dm-marker-icon'
    icon.style.cssText = `width:36px;height:36px;background:${fill};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);font-size:18px;line-height:1;`
    icon.textContent = '🏍️'

    const badge = document.createElement('div')
    badge.className = 'dm-marker-badge'
    badge.style.cssText =
        'position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;font-size:10px;font-weight:700;line-height:18px;text-align:center;color:#fff;background:#059669;border-radius:9999px;border:2px solid #fff;display:none;box-shadow:0 1px 3px rgba(0,0,0,.25);'

    const label = document.createElement('div')
    label.className = 'dm-marker-label'
    const displayName = (loc.name ?? `#${driverId}`).trim()
    label.textContent = displayName.length > 18 ? displayName.slice(0, 17) + '…' : displayName
    label.title = loc.name ?? `Domiciliario #${driverId}`
    label.style.cssText =
        'margin-top:2px;max-width:112px;padding:1px 6px;font-size:10px;font-weight:600;line-height:1.2;color:#111827;background:rgba(255,255,255,.95);border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'

    wrap.appendChild(icon)
    wrap.appendChild(badge)
    root.appendChild(wrap)
    root.appendChild(label)

    const n = onTheWayCountForDriver(driverId)
    if (n > 0) {
        badge.textContent = String(n)
        badge.style.display = 'block'
    }

    root.addEventListener('click', (e) => {
        e.stopPropagation()
        selectedDriverId.value = driverId
    })

    return root
}

function updateDriverMarkers(locs: Record<number, DriverLocation> | undefined) {
    if (!map) return
    const AdvancedMarkerElement = (window as any)._AdvancedMarkerElement
    const currentIds = new Set(Object.keys(locs ?? {}).map(Number))

    for (const [id, marker] of driverMarkers) {
        if (!currentIds.has(id)) {
            google.maps.event.clearInstanceListeners(marker as any)
            if (typeof (marker as any).setMap === 'function') (marker as any).setMap(null)
            else (marker as any).map = null
            driverMarkers.delete(id)
            driverMarkerRoots.delete(id)
        }
    }

    if (!locs) return

    for (const [idStr, loc] of Object.entries(locs)) {
        const id = Number(idStr)
        const position = { lat: loc.lat, lng: loc.lng }
        const stableTitle = driverMarkerStableTitle(id, loc)

        const existing = driverMarkers.get(id)
        if (existing) {
            if (typeof (existing as any).position !== 'undefined') (existing as any).position = position
            else if (typeof (existing as any).setPosition === 'function') (existing as any).setPosition(position)
            const m = existing as any
            if (m.title !== undefined) m.title = stableTitle
            const root = driverMarkerRoots.get(id)
            if (root) syncDriverPinDom(root, id, loc)
            else {
                const el = m.content ?? m.element
                if (el instanceof HTMLElement) {
                    if (el.querySelector('.dm-marker-icon')) syncDriverPinDom(el, id, loc)
                    else {
                        el.title = stableTitle
                    }
                }
            }
            continue
        }

        let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker
        if (AdvancedMarkerElement) {
            const root = createDriverPinRoot(id, loc)
            driverMarkerRoots.set(id, root)
            marker = new AdvancedMarkerElement({
                position,
                map,
                title: stableTitle,
                content: root,
            })
            google.maps.event.addListener(marker as any, 'click', () => {
                selectedDriverId.value = id
            })
        } else {
            marker = new google.maps.Marker({
                position,
                map,
                title: stableTitle,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
                    scaledSize: new google.maps.Size(40, 40),
                },
            })
            google.maps.event.addListener(marker, 'click', () => {
                selectedDriverId.value = id
            })
        }
        driverMarkers.set(id, marker)
    }
}

// =========================
// 🔹 Inicialización
// =========================
onMounted(async () => {
    // Reloj solo para chips "hace X s" (no actualiza title de pins cada segundo).
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

    // Si ya hay ubicaciones al montar, colocar marcadores y encuadrar (vista solo domiciliarios)
    if (props.deliverymanLocations && Object.keys(props.deliverymanLocations).length > 0) {
        prevDriverLocationCount = 0
        updateDriverMarkers(props.deliverymanLocations)
        if (props.orders.length === 0) {
            fitMapToDriverLocations(props.deliverymanLocations)
            prevDriverLocationCount = Object.keys(props.deliverymanLocations).length
        }
    }
})

onUnmounted(() => {
    if (_clockInterval) clearInterval(_clockInterval)
    for (const marker of driverMarkers.values()) {
        google.maps.event.clearInstanceListeners(marker as any)
        if (typeof (marker as any).setMap === 'function') (marker as any).setMap(null)
        else (marker as any).map = null
    }
    driverMarkers.clear()
    driverMarkerRoots.clear()
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