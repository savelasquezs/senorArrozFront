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
                class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
import { ref, onMounted, onUnmounted } from 'vue'
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

// Google Maps instances
let map: any = null
let marker: any = null
let geocoder: any = null
let searchTimeout: any = null
let sessionToken: any = null

// Load Google Maps script
const loadGoogleMaps = () => {
    return new Promise((resolve, reject) => {
        if (isDestroyed.value) {
            reject(new Error('Component destroyed'))
            return
        }

        if ((window as any).google && (window as any).google.maps) {
            resolve(true)
            return
        }

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID

        if (!apiKey) {
            reject(new Error('Google Maps API key not configured'))
            return
        }

        // Build script URL with Map ID if available
        let scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
        if (mapId && typeof mapId === 'string' && mapId.trim() !== '') {
            scriptUrl += `&map_ids=${encodeURIComponent(mapId.trim())}`
        }

        const script = document.createElement('script')
        script.src = scriptUrl
        script.async = true
        script.defer = true

        script.onload = () => {
            if (!isDestroyed.value) {
                resolve(true)
            } else {
                reject(new Error('Component destroyed during script load'))
            }
        }
        script.onerror = () => {
            if (!isDestroyed.value) {
                reject(new Error('Failed to load Google Maps'))
            }
        }

        if (!isDestroyed.value) {
            document.head.appendChild(script)
        } else {
            reject(new Error('Component destroyed before script append'))
        }
    })
}

// Initialize map
const initializeMap = async () => {
    if (!mapContainer.value || isDestroyed.value) return

    try {
        // Check if DOM element still exists
        if (!mapContainer.value || !mapContainer.value.parentNode) {
            return
        }

        // Wait a bit to ensure Google Maps is fully loaded
        await new Promise(resolve => setTimeout(resolve, 100))

        // Default location (Medellín, Colombia)
        const defaultLocation = { lat: 6.2442, lng: -75.5812 }

        const googleMaps = (window as any).google?.maps
        if (!googleMaps || !googleMaps.Map) {
            throw new Error('Google Maps not available or not fully loaded')
        }

        const mapIdRaw = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
        const mapId = mapIdRaw && typeof mapIdRaw === 'string' && mapIdRaw.trim() !== '' ? mapIdRaw.trim() : undefined

        const mapConfig: any = {
            center: defaultLocation,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            ...(mapId && { mapId })
        }

        map = new googleMaps.Map(mapContainer.value, mapConfig)

        // Add error listener to prevent map from being destroyed
        if ((window as any).google?.maps?.event) {
            (window as any).google.maps.event.addListenerOnce(map, 'error', () => {
                // Map will continue working without Map ID if necessary
            })
        }

        // Check if component was destroyed during initialization
        if (isDestroyed.value || !mapContainer.value || !mapContainer.value.parentNode) {
            if (map) {
                const googleMaps = (window as any).google?.maps
                if (googleMaps) {
                    googleMaps.event.clearInstanceListeners(map)
                }
                map = null
            }
            return
        }

        // Initialize geocoder
        geocoder = new googleMaps.Geocoder()

        // Initialize session token for autocomplete
        if (googleMaps.places && googleMaps.places.AutocompleteSessionToken) {
            sessionToken = new googleMaps.places.AutocompleteSessionToken()
        }

        // Add click listener to map
        map.addListener('click', (event: any) => {
            if (event.latLng && !isDestroyed.value && mapContainer.value && mapContainer.value.parentNode) {
                const location = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                }
                updateLocation(location)
            }
        })

        // Add center_changed listener for manual mode
        map.addListener('center_changed', () => {
            if (isManualMode.value && !isDestroyed.value && mapContainer.value && mapContainer.value.parentNode) {
                const center = map.getCenter()
                manualLocation.value = {
                    lat: center.lat(),
                    lng: center.lng()
                }
            }
        })

        // Try to use Advanced Markers, fallback to traditional markers if it fails
        try {
            // Import Advanced Marker library
            const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary("marker")

            // Initialize Advanced Marker
            marker = new AdvancedMarkerElement({
                position: defaultLocation,
                map: map,
                title: 'Ubicación seleccionada'
            })

            // Add marker drag listener (AdvancedMarkerElement uses different event)
            marker.addListener('dragend', () => {
                if (marker && !isDestroyed.value && mapContainer.value && mapContainer.value.parentNode) {
                    const position = marker.position
                    const location = {
                        lat: typeof position === 'object' ? position.lat : position.lat(),
                        lng: typeof position === 'object' ? position.lng : position.lng()
                    }
                    updateLocation(location)
                }
            })
        } catch (markerError) {
            // Fallback a marcador tradicional
            try {
                marker = new googleMaps.Marker({
                    position: defaultLocation,
                    map: map,
                    title: 'Ubicación seleccionada',
                    draggable: true
                })

                // Add marker drag listener (traditional marker)
                marker.addListener('dragend', () => {
                    if (marker && !isDestroyed.value && mapContainer.value && mapContainer.value.parentNode) {
                        const location = {
                            lat: marker.getPosition().lat(),
                            lng: marker.getPosition().lng()
                        }
                        updateLocation(location)
                    }
                })
            } catch (fallbackError) {
                // Continue without marker, map will still work
            }
        }

        isMapLoaded.value = true

    } catch (err) {
        if (!isDestroyed.value) {
            error.value = 'Error al cargar el mapa'
        }
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
        const googleMaps = (window as any).google?.maps
        if (!googleMaps || !googleMaps.places) {
            throw new Error('Google Maps Places API not available')
        }

        // Importar la librería de lugares si no está disponible
        if (!googleMaps.places.AutocompleteSuggestion) {
            const { AutocompleteSuggestion } = await googleMaps.importLibrary("places")
            googleMaps.places.AutocompleteSuggestion = AutocompleteSuggestion
        }

        // Crear un nuevo session token si no existe
        if (!sessionToken && googleMaps.places.AutocompleteSessionToken) {
            sessionToken = new googleMaps.places.AutocompleteSessionToken()
        }

        const request: any = {
            input: searchQuery.value,
            includedRegionCodes: ['co']
        }

        // Agregar session token si está disponible
        if (sessionToken) {
            request.sessionToken = sessionToken
        }

        const { suggestions } = await googleMaps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

        if (!isDestroyed.value && suggestions && suggestions.length > 0) {
            // Obtener detalles para cada sugerencia
            const promises = suggestions.slice(0, 5).map(async (suggestion: any) => {
                try {
                    // Verificar que sea una predicción de lugar (no de consulta)
                    if (!suggestion.placePrediction) {
                        return null
                    }

                    const placePrediction = suggestion.placePrediction

                    // Convertir a Place object
                    const place = placePrediction.toPlace()

                    // Obtener campos necesarios
                    await place.fetchFields({
                        fields: ['displayName', 'formattedAddress', 'location']
                    })

                    // Verificar que tengamos los datos necesarios
                    if (!place.formattedAddress || !place.location) {
                        return null
                    }

                    return {
                        formatted_address: place.formattedAddress,
                        geometry: {
                            location: {
                                lat: () => place.location.lat(),
                                lng: () => place.location.lng()
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Error fetching place details:', error)
                    return null
                }
            })

            const results = await Promise.all(promises)
            searchResults.value = results.filter(result => result !== null)

            // Renovar session token después de obtener resultados
            if (googleMaps.places.AutocompleteSessionToken) {
                sessionToken = new googleMaps.places.AutocompleteSessionToken()
            }
        } else {
            searchResults.value = []
        }
    } catch (err) {
        console.error('Error in searchAddress:', err)
        if (!isDestroyed.value) {
            searchResults.value = []
        }
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

// Lifecycle
onMounted(async () => {
    try {
        await loadGoogleMaps()

        // Wait a bit more to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 500))

        await initializeMap()
        searchQuery.value = props.initialAddress || ''
        searchAddress()
    } catch (err: any) {
        if (!isDestroyed.value) {
            if (err.message === 'Google Maps API key not configured') {
                error.value = 'API key de Google Maps no configurada'
            } else {
                error.value = 'Error al cargar Google Maps'
            }
        }
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

    // Reset reactive state
    isMapLoaded.value = false
    searchResults.value = []
    selectedLocation.value = null
    isLocationConfirmed.value = false
    error.value = ''
})
</script>
