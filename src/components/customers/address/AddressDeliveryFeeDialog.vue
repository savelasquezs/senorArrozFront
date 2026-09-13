<template>
    <div class="space-y-3">
        <div class="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
            <div ref="mapContainer" class="h-56 w-full" />

            <div
                v-if="routeLabel"
                class="absolute bottom-2 left-2 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur"
            >
                {{ routeLabel }}
            </div>

            <div v-if="isLoadingRoute" class="absolute inset-0 grid place-items-center bg-white/45 backdrop-blur-[1px]">
                <span class="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
        </div>

        <div class="flex items-end gap-2">
            <BaseInput
                v-model="deliveryFee"
                label="Domicilio"
                type="number"
                :min="0"
                :step="500"
                class="min-w-0 flex-1"
            />
            <BaseButton
                type="button"
                variant="primary"
                class="shrink-0"
                :loading="isSaving"
                :disabled="!canSave"
                @click="save"
            >
                Guardar
            </BaseButton>
        </div>

        <div v-if="otherServices.length" class="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
            <span
                v-for="service in otherServices"
                :key="service.branchId"
                class="rounded-full bg-gray-100 px-2 py-1"
            >
                {{ service.branchName }} · {{ formatCurrency(service.deliveryFee) }}
            </span>
        </div>

        <p v-if="errorMessage" class="text-xs text-red-600">{{ errorMessage }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { branchApi } from '@/services/MainAPI/branchApi'
import {
    addressBranchApi,
    type AddressBranchService,
} from '@/services/MainAPI/addressBranchApi'
import { RouteOptimizationService } from '@/services/domain/RouteOptimizationService'
import type { CustomerAddress } from '@/types/customer'

interface Props {
    address: CustomerAddress
    branchId: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
    saved: [service: AddressBranchService]
}>()

const mapContainer = ref<HTMLElement | null>(null)
const deliveryFee = ref<number | string>(0)
const services = ref<AddressBranchService[]>([])
const distanceMeters = ref<number | null>(null)
const durationMillis = ref<number | null>(null)
const isLoadingRoute = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

let map: google.maps.Map | null = null
let routePolyline: google.maps.Polyline | null = null
let branchMarker: google.maps.marker.AdvancedMarkerElement | null = null
let addressMarker: google.maps.marker.AdvancedMarkerElement | null = null
let destroyed = false

const currentService = computed(() => services.value.find(service => service.branchId === props.branchId) ?? null)
const otherServices = computed(() => services.value.filter(service => service.branchId !== props.branchId))
const hasAddressCoordinates = computed(() => {
    const lat = Number(props.address.latitude)
    const lng = Number(props.address.longitude)
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
})

const canSave = computed(() =>
    hasAddressCoordinates.value
    && Number.isFinite(Number(deliveryFee.value))
    && Number(deliveryFee.value) >= 0
    && !isLoadingRoute.value,
)

const routeLabel = computed(() => {
    if (distanceMeters.value == null || durationMillis.value == null) return ''
    const km = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(distanceMeters.value / 1000)
    const minutes = Math.max(1, Math.round(durationMillis.value / 60_000))
    return `${km} km · ${minutes} min`
})

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
}).format(amount)

const estimateDeliveryFee = (meters: number) =>
    meters <= 2000
        ? 3000
        : 3000 + Math.ceil((meters - 2000) / 1000) * 1000

const resolveBranch = async () => {
    const response = await branchApi.getBranchById(props.branchId)
    const branch = response.data
    const lat = Number(branch.latitude)
    const lng = Number(branch.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        throw new Error('La sede no tiene ubicación configurada')
    }
    return { name: branch.name, lat, lng }
}

const initializeMap = async () => {
    if (!mapContainer.value || !hasAddressCoordinates.value) {
        errorMessage.value = 'Esta dirección no tiene ubicación en el mapa'
        return
    }

    isLoadingRoute.value = true
    errorMessage.value = ''

    try {
        const [branch] = await Promise.all([
            resolveBranch(),
            addressBranchApi.getServices(props.address.customerId, props.address.id).then(response => {
                services.value = response.data ?? []
            }),
        ])
        if (destroyed) return

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        const mapIdRaw = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
        const mapId = typeof mapIdRaw === 'string' && mapIdRaw.trim() ? mapIdRaw.trim() : undefined
        setOptions({ key: apiKey, ...(mapId && { mapIds: [mapId] }) })

        const [{ Map, Polyline }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
            importLibrary('maps') as Promise<google.maps.MapsLibrary>,
            importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
        ])
        if (destroyed || !mapContainer.value) return

        const destination = {
            lat: Number(props.address.latitude),
            lng: Number(props.address.longitude),
        }

        map = new Map(mapContainer.value, {
            center: destination,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            ...(mapId && { mapId }),
        })

        const branchPin = new PinElement({ background: '#059669', borderColor: '#047857', glyphColor: '#ffffff', glyph: 'S' })
        branchMarker = new AdvancedMarkerElement({ position: branch, map, title: branch.name, content: branchPin })
        addressMarker = new AdvancedMarkerElement({ position: destination, map, title: props.address.address })

        const route = await RouteOptimizationService.getSimpleRoute(branch, destination)
        if (destroyed) return
        if (!route) throw new Error('No fue posible calcular el recorrido')

        distanceMeters.value = route.distanceMeters
        durationMillis.value = route.durationMillis
        deliveryFee.value = estimateDeliveryFee(route.distanceMeters)

        if (route.path.length) {
            routePolyline = new Polyline({
                path: route.path,
                geodesic: false,
                strokeColor: '#10b981',
                strokeOpacity: 0.95,
                strokeWeight: 5,
                map,
            })
        }

        if (route.viewport) {
            map.fitBounds(route.viewport, { top: 28, right: 28, bottom: 28, left: 28 })
        } else {
            const bounds = new google.maps.LatLngBounds()
            bounds.extend(branch)
            bounds.extend(destination)
            map.fitBounds(bounds, 28)
        }
    } catch (error: any) {
        errorMessage.value = error?.message || 'No fue posible calcular el domicilio'
        if (currentService.value) deliveryFee.value = currentService.value.deliveryFee
    } finally {
        isLoadingRoute.value = false
    }
}

const save = async () => {
    if (!canSave.value) return
    isSaving.value = true
    errorMessage.value = ''
    try {
        const response = await addressBranchApi.upsert(props.address.customerId, props.address.id, {
            deliveryFee: Number(deliveryFee.value),
            latitude: Number(props.address.latitude),
            longitude: Number(props.address.longitude),
        })
        emit('saved', response.data)
    } catch (error: any) {
        errorMessage.value = error?.message || 'No se pudo guardar el domicilio'
    } finally {
        isSaving.value = false
    }
}

onMounted(async () => {
    await nextTick()
    await initializeMap()
})

onBeforeUnmount(() => {
    destroyed = true
    routePolyline?.setMap(null)
    if (branchMarker) branchMarker.map = null
    if (addressMarker) addressMarker.map = null
    map = null
})
</script>
