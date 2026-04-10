<!-- src/components/ui/GoogleMapsSelector.vue -->
<template>
    <div class="space-y-4">
        <!-- Address Search Input -->
        <div class="relative">
            <BaseInput v-model="searchQuery" label="Buscar dirección" placeholder="Escribe una dirección para buscar..."
                :error="error" @input="handleSearch" @keydown.enter.prevent="searchAddress" @blur="handleAddressBlur">
                <template #icon>
                    <MagnifyingGlassIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <!-- Search Results -->
            <div v-if="searchQuery.length > 3"
                class="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div v-if="searchResults.length > 0" v-for="(result, index) in searchResults" :key="index"
                    @click="selectAddress(result)"
                    class="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100">
                    <div class="text-sm font-medium text-gray-900">{{ result.formatted_address }}</div>
                </div>
                <div @click="enableManualMode"
                    class="px-4 py-2 hover:bg-emerald-50 cursor-pointer border-t-2 border-emerald-200 bg-emerald-25">
                    <div class="flex items-center text-sm font-medium text-emerald-700">
                        <MapPinIcon class="w-4 h-4 mr-2" />
                        Ubicar manualmente en el mapa
                    </div>
                </div>
            </div>
        </div>

        <!-- Opcional: coordenadas desde enlace de Maps (la búsqueda por dirección arriba sigue siendo la vía principal) -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <BaseInput
                v-model="mapsLinkPaste"
                label="Pegar enlace de Google Maps"
                placeholder="https://www.google.com/maps/..."
                class="flex-1 min-w-0"
                @keydown.enter.prevent="applyMapsLink"
                @update:model-value="mapsLinkError = ''"
            />
            <BaseButton type="button" variant="outline" class="shrink-0 w-full sm:w-auto" :disabled="!mapsLinkPaste.trim()"
                @click="applyMapsLink">
                Usar coordenadas del enlace
            </BaseButton>
        </div>
        <p v-if="mapsLinkError" class="text-xs text-red-600 -mt-2">{{ mapsLinkError }}</p>

        <!-- Map Container -->
        <div class="relative">
            <div ref="mapContainer" class="w-full h-64 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                <div class="flex items-center justify-center h-full text-gray-500">
                    <div class="text-center">
                        <MapIcon class="w-8 h-8 mx-auto mb-2" />
                        <p class="text-sm">Cargando mapa...</p>
                        <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
                    </div>
                </div>
            </div>

            <!-- Manual Mode Indicator -->
            <div v-if="isManualMode" class="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div class="pointer-events-none">
                    <MapPinIcon class="w-8 h-8 text-red-500 drop-shadow-lg" />
                </div>
            </div>

            <!-- Manual Mode Instructions -->
            <div v-if="isManualMode"
                class="absolute top-2 left-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-10">
                <div class="flex items-start space-x-2">
                    <InformationCircleIcon class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div class="flex-1 text-sm text-gray-700">
                        <p class="font-medium">Modo de selección manual</p>
                        <p class="text-xs text-gray-600 mt-1">Mueve el mapa para posicionar el marcador en la ubicación
                            deseada
                        </p>
                    </div>
                    <button @click="cancelManualMode" class="text-gray-400 hover:text-gray-600">
                        <XMarkIcon class="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Selected Coordinates Display -->
        <div v-if="selectedLocation || manualLocation" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput :model-value="(selectedLocation?.lat || manualLocation?.lat)?.toFixed(6) ?? ''" label="Latitud"
                type="text" readonly class="bg-gray-50" />
            <BaseInput :model-value="(selectedLocation?.lng || manualLocation?.lng)?.toFixed(6) ?? ''" label="Longitud"
                type="text" readonly class="bg-gray-50" />
        </div>

        <!-- Confirmation Buttons -->
        <div v-if="selectedLocation || isManualMode" class="flex justify-center space-x-3">
            <BaseButton v-if="!isManualMode && selectedLocation" @click="confirmLocation" variant="primary"
                :disabled="isLocationConfirmed" class="flex items-center space-x-2">
                <CheckIcon class="w-4 h-4" />
                <span>{{ isLocationConfirmed ? 'Ubicación Confirmada' : 'Confirmar Ubicación' }}</span>
            </BaseButton>

            <BaseButton v-if="isManualMode && manualLocation" @click="confirmManualLocation" variant="primary"
                class="flex items-center space-x-2">
                <CheckIcon class="w-4 h-4" />
                <span>Confirmar Ubicación Manual</span>
            </BaseButton>

            <BaseButton v-if="isManualMode" @click="cancelManualMode" variant="outline"
                class="flex items-center space-x-2">
                <XMarkIcon class="w-4 h-4" />
                <span>Cancelar</span>
            </BaseButton>
        </div>

        <!-- Address Confirmation Modal -->
        <BaseDialog v-model="showAddressModal" title="Confirmar Dirección">
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p class="text-sm text-blue-800">
                        <span class="font-medium">Dirección sugerida:</span><br>
                        {{ suggestedAddress }}
                    </p>
                </div>

                <BaseInput v-model="editableAddress" label="Dirección Final"
                    placeholder="Edita la dirección si lo deseas..."
                    help-text="Las coordenadas no cambiarán al editar la dirección" />

                <div v-if="manualLocation" class="grid grid-cols-2 gap-4">
                    <BaseInput :model-value="manualLocation.lat.toFixed(6)" label="Latitud" readonly
                        class="bg-gray-50" />
                    <BaseInput :model-value="manualLocation.lng.toFixed(6)" label="Longitud" readonly
                        class="bg-gray-50" />
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end space-x-3">
                    <BaseButton @click="cancelAddressModal" variant="outline">
                        Volver al Mapa
                    </BaseButton>
                    <BaseButton @click="confirmAddressAndLocation" variant="primary">
                        Confirmar
                    </BaseButton>
                </div>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { parseGoogleMapsUrl } from '@/utils/parseGoogleMapsUrl'
import BaseInput from './BaseInput.vue'
import BaseButton from './BaseButton.vue'
import BaseDialog from './BaseDialog.vue'
import {
    MagnifyingGlassIcon,
    MapIcon,
    CheckIcon,
    MapPinIcon,
    InformationCircleIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

interface Location {
    lat: number
    lng: number
}

interface SearchResult {
    formatted_address: string
    geometry: {
        location: {
            lat: () => number
            lng: () => number
        }
    }
}

interface Props {
    modelValue?: Location | null
    error?: string
    initialAddress?: string
}

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits<{
    'update:modelValue': [location: Location | null]
    'location-confirmed': [location: Location]
    'address-updated': [address: string]
}>()

// Reactive state
const mapContainer = ref<HTMLElement>()
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const selectedLocation = ref<Location | null>(null)
const error = ref('')
const isLocationConfirmed = ref(false)
const isMapLoaded = ref(false)
const isDestroyed = ref(false)

// Manual mode state
const isManualMode = ref(false)
const manualLocation = ref<Location | null>(null)
const showAddressModal = ref(false)
const suggestedAddress = ref('')
const editableAddress = ref('')

const mapsLinkPaste = ref('')
const mapsLinkError = ref('')

// Google Maps instances
let map: any = null
let marker: any = null
let geocoder: any = null
let searchTimeout: any = null
let sessionToken: any = null
let placesLib: { AutocompleteSessionToken: any; AutocompleteSuggestion: any } | null = null

// Initialize map using @googlemaps/js-api-loader (mismo loader que DeliveryMap.vue)
const initializeMap = async () => {
    if (!mapContainer.value || isDestroyed.value) return

    try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        const mapIdRaw = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
        const mapId = mapIdRaw && typeof mapIdRaw === 'string' && mapIdRaw.trim() !== '' ? mapIdRaw.trim() : undefined

        setOptions({
            key: apiKey,
            ...(mapId && { mapIds: [mapId] }),
        })

        // Cargar todas las librerías necesarias en paralelo (incluyendo places)
        const [{ Map }, { Geocoder }, { AdvancedMarkerElement }, { AutocompleteSessionToken, AutocompleteSuggestion }] =
            await Promise.all([
                importLibrary('maps') as Promise<google.maps.MapsLibrary>,
                importLibrary('geocoding') as Promise<google.maps.GeocodingLibrary>,
                importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
                importLibrary('places') as Promise<google.maps.PlacesLibrary>,
            ])

        if (isDestroyed.value || !mapContainer.value?.parentNode) return

        // Guardar referencias de places para uso en searchAddress
        placesLib = { AutocompleteSessionToken, AutocompleteSuggestion }

        const defaultLocation = { lat: 6.2442, lng: -75.5812 }

        map = new Map(mapContainer.value, {
            center: defaultLocation,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            ...(mapId && { mapId }),
        })

        geocoder = new Geocoder()
        sessionToken = new AutocompleteSessionToken()

        map.addListener('click', (event: any) => {
            if (event.latLng && !isDestroyed.value && mapContainer.value?.parentNode) {
                updateLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() })
            }
        })

        map.addListener('center_changed', () => {
            if (isManualMode.value && !isDestroyed.value && mapContainer.value?.parentNode) {
                const center = map.getCenter()
                manualLocation.value = { lat: center.lat(), lng: center.lng() }
            }
        })

        // Intentar AdvancedMarkerElement, fallback a Marker clásico
        try {
            marker = new AdvancedMarkerElement({ position: defaultLocation, map, title: 'Ubicación seleccionada' })
            marker.addListener('dragend', () => {
                if (marker && !isDestroyed.value && mapContainer.value?.parentNode) {
                    const pos = marker.position
                    updateLocation({
                        lat: typeof pos === 'object' ? (pos as any).lat : pos.lat(),
                        lng: typeof pos === 'object' ? (pos as any).lng : pos.lng(),
                    })
                }
            })
        } catch {
            marker = new google.maps.Marker({ position: defaultLocation, map, title: 'Ubicación seleccionada', draggable: true })
            marker.addListener('dragend', () => {
                if (marker && !isDestroyed.value && mapContainer.value?.parentNode) {
                    updateLocation({ lat: marker.getPosition().lat(), lng: marker.getPosition().lng() })
                }
            })
        }

        isMapLoaded.value = true
        syncFromModelValue()

    } catch (err) {
        if (!isDestroyed.value) error.value = 'Error al cargar el mapa'
    }
}

// Update location and emit changes
const updateLocation = (location: Location) => {
    if (isDestroyed.value || !mapContainer.value || !mapContainer.value.parentNode) return

    selectedLocation.value = location
    isLocationConfirmed.value = false

    if (map && marker && isMapLoaded.value && !isDestroyed.value && mapContainer.value && mapContainer.value.parentNode) {
        try {
            map.setCenter(location)
            marker.position = location
        } catch (err) {
            // Ignore errors updating map location
        }
    }

    if (!isDestroyed.value) {
        emit('update:modelValue', location)
    }
}

function syncFromModelValue() {
    const loc = props.modelValue
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return
    if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return
    updateLocation(loc)
}

const applyMapsLink = () => {
    mapsLinkError.value = ''
    const result = parseGoogleMapsUrl(mapsLinkPaste.value)
    if (!result.ok) {
        mapsLinkError.value = result.message
        return
    }
    updateLocation(result.coords)
    if (map && isMapLoaded.value && !isDestroyed.value) {
        try {
            map.setZoom(17)
        } catch {
            /* ignore */
        }
    }
}

// Search address
const handleSearch = () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(() => {
        if (searchQuery.value.length > 3) {
            searchAddress()
        } else {
            searchResults.value = []
        }
    }, 300)
}

const searchAddress = async () => {
    if (!searchQuery.value.trim() || isDestroyed.value) return

    try {
        // placesLib se carga en initializeMap; si aún no está listo, ignorar
        if (!placesLib) return

        const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLib

        if (!sessionToken) sessionToken = new AutocompleteSessionToken()

        const request: any = {
            input: searchQuery.value,
            includedRegionCodes: ['co'],
            sessionToken,
        }

        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

        if (!isDestroyed.value && suggestions?.length > 0) {
            const promises = suggestions.slice(0, 5).map(async (suggestion: any) => {
                try {
                    if (!suggestion.placePrediction) return null
                    const place = suggestion.placePrediction.toPlace()
                    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
                    if (!place.formattedAddress || !place.location) return null
                    return {
                        formatted_address: place.formattedAddress,
                        geometry: {
                            location: {
                                lat: () => place.location.lat(),
                                lng: () => place.location.lng(),
                            },
                        },
                    }
                } catch {
                    return null
                }
            })

            const results = await Promise.all(promises)
            searchResults.value = results.filter(Boolean) as SearchResult[]
            sessionToken = new AutocompleteSessionToken()
        } else {
            searchResults.value = []
        }
    } catch (err) {
        console.error('Error in searchAddress:', err)
        if (!isDestroyed.value) searchResults.value = []
    }
}

// Handle address blur - search for the address when user leaves the field
const handleAddressBlur = () => {
    if (searchQuery.value.trim() && !isDestroyed.value) {
        searchAddress()
    }
}

// Select address from search results
const selectAddress = (result: SearchResult) => {
    if (isDestroyed.value) return

    const location = {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng()
    }

    updateLocation(location)
    searchResults.value = []
    searchQuery.value = result.formatted_address
    emit('address-updated', result.formatted_address)
}

// Basic methods
const confirmLocation = () => {
    if (selectedLocation.value) {
        isLocationConfirmed.value = true
        emit('location-confirmed', selectedLocation.value)
    }
}

// Manual mode functions
const enableManualMode = () => {
    isManualMode.value = true
    searchResults.value = []
    searchQuery.value = ''

    if (map) {
        const center = map.getCenter()
        manualLocation.value = {
            lat: center.lat(),
            lng: center.lng()
        }
    }
}

const cancelManualMode = () => {
    isManualMode.value = false
    manualLocation.value = null
}

const confirmManualLocation = async () => {
    if (!manualLocation.value || !geocoder) return

    try {
        // Reverse geocoding
        const result = await geocoder.geocode({
            location: manualLocation.value
        })

        if (result.results && result.results.length > 0) {
            suggestedAddress.value = result.results[0].formatted_address
            editableAddress.value = result.results[0].formatted_address
            showAddressModal.value = true
        }
    } catch (err) {
        error.value = 'Error al obtener la dirección'
    }
}

const confirmAddressAndLocation = () => {
    if (manualLocation.value) {
        selectedLocation.value = manualLocation.value
        searchQuery.value = editableAddress.value
        isLocationConfirmed.value = true

        emit('update:modelValue', manualLocation.value)
        emit('location-confirmed', manualLocation.value)
        emit('address-updated', editableAddress.value)

        // Reset manual mode
        isManualMode.value = false
        showAddressModal.value = false
        manualLocation.value = null
    }
}

const cancelAddressModal = () => {
    showAddressModal.value = false
    // Keep manual mode active
}

watch(
    () => props.modelValue,
    (loc) => {
        if (!isMapLoaded.value || isDestroyed.value || !map) return
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return
        if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return
        const sel = selectedLocation.value
        if (
            sel &&
            Math.abs(sel.lat - loc.lat) < 1e-8 &&
            Math.abs(sel.lng - loc.lng) < 1e-8
        ) {
            return
        }
        updateLocation(loc)
    }
)

// Lifecycle
onMounted(async () => {
    try {
        await initializeMap()
        searchQuery.value = props.initialAddress || ''
        if (searchQuery.value) searchAddress()
    } catch (err: any) {
        if (!isDestroyed.value) error.value = 'Error al cargar Google Maps'
    }
})

onUnmounted(() => {
    isDestroyed.value = true

    // Clear timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout)
        searchTimeout = null
    }

    // Clear session token
    sessionToken = null

    // Clean up Google Maps instances
    if (marker) {
        try {
            marker.map = null
        } catch (err) {
            // Ignore errors during cleanup
        }
        marker = null
    }

    if (map) {
        try {
            // Clear all listeners
            const googleMaps = (window as any).google?.maps
            if (googleMaps) {
                googleMaps.event.clearInstanceListeners(map)
            }
        } catch (err) {
            // Ignore errors during cleanup
        }
        map = null
    }

    geocoder = null
    placesLib = null

    // Reset reactive state
    isMapLoaded.value = false
    searchResults.value = []
    selectedLocation.value = null
    isLocationConfirmed.value = false
    error.value = ''
})
</script>
