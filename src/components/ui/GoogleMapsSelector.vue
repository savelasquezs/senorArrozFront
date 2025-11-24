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
            <div v-if="searchResults.length > 0"
                class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div v-for="(result, index) in searchResults" :key="index" @click="selectAddress(result)"
                    class="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0">
                    <div class="text-sm font-medium text-gray-900">{{ result.formatted_address }}</div>
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
        </div>

        <!-- Selected Coordinates Display -->
        <div v-if="selectedLocation" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput :model-value="selectedLocation.lat.toFixed(6)" label="Latitud" type="text" readonly
                class="bg-gray-50" />
            <BaseInput :model-value="selectedLocation.lng.toFixed(6)" label="Longitud" type="text" readonly
                class="bg-gray-50" />
        </div>

        <!-- Confirmation Button -->
        <div v-if="selectedLocation" class="flex justify-center">
            <BaseButton @click="confirmLocation" variant="primary" :disabled="isLocationConfirmed"
                class="flex items-center space-x-2">
                <CheckIcon class="w-4 h-4" />
                <span>{{ isLocationConfirmed ? 'Ubicación Confirmada' : 'Confirmar Ubicación' }}</span>
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BaseInput from './BaseInput.vue'
import BaseButton from './BaseButton.vue'
import {
    MagnifyingGlassIcon,
    MapIcon,
    CheckIcon
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

// Google Maps instances
let map: any = null
let marker: any = null
let geocoder: any = null
let searchTimeout: any = null

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

        // Debug logs
        console.log('🔍 [GoogleMapsSelector] Loading Google Maps script:', {
            apiKey: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET',
            mapId: mapId || 'NOT SET',
            hasApiKey: !!apiKey,
            hasMapId: !!mapId
        })

        if (!apiKey) {
            reject(new Error('Google Maps API key not configured'))
            return
        }

        // Build script URL with Map ID if available
        let scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
        if (mapId && typeof mapId === 'string' && mapId.trim() !== '') {
            scriptUrl += `&map_ids=${encodeURIComponent(mapId.trim())}`
            console.log('✅ [GoogleMapsSelector] Including Map ID in script URL:', mapId.trim())
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

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

        // Debug logs before creating map
        // Get Map ID from environment variable
        const mapIdRaw = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
        const mapId = mapIdRaw && typeof mapIdRaw === 'string' && mapIdRaw.trim() !== '' ? mapIdRaw.trim() : undefined

        console.log('🔍 [GoogleMapsSelector] Initializing map with config:', {
            apiKey: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET',
            mapIdRaw: mapIdRaw || 'NOT SET',
            mapIdProcessed: mapId || 'NOT SET',
            mapIdType: typeof mapIdRaw,
            mapIdLength: mapId?.length || 0,
            hasApiKey: !!apiKey,
            hasMapId: !!mapId,
            willUseMapId: !!mapId
        })

        const mapConfig: any = {
            center: defaultLocation,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            ...(mapId && { mapId }) // Include Map ID if available
        }

        map = new googleMaps.Map(mapContainer.value, mapConfig)

        // Add error listener to prevent map from being destroyed
        if ((window as any).google?.maps?.event) {
            (window as any).google.maps.event.addListenerOnce(map, 'error', (error: any) => {
                console.error('❌ [GoogleMapsSelector] Map error detected:', error)
                // No destruir el mapa, solo loguear el error
                // El mapa seguirá funcionando sin el Map ID si es necesario
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

            console.log('✅ [GoogleMapsSelector] Advanced Marker created successfully')

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
            console.warn('⚠️ [GoogleMapsSelector] Advanced Marker failed, using traditional marker:', markerError)

            // Fallback a marcador tradicional
            try {
                marker = new googleMaps.Marker({
                    position: defaultLocation,
                    map: map,
                    title: 'Ubicación seleccionada',
                    draggable: true
                })

                console.log('✅ [GoogleMapsSelector] Traditional marker created as fallback')

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
                console.error('❌ [GoogleMapsSelector] Failed to create traditional marker:', fallbackError)
                // Continuar sin marcador, el mapa seguirá funcionando
            }
        }

        isMapLoaded.value = true
        console.log('✅ [GoogleMapsSelector] Map initialized successfully')

    } catch (err) {
        if (!isDestroyed.value) {
            console.error('❌ [GoogleMapsSelector] Error initializing map:', err)
            console.error('❌ [GoogleMapsSelector] Error details:', {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            })
            error.value = 'Error al cargar el mapa'
        }
    }
}

// Update location and emit changes
const updateLocation = (location: Location) => {
    if (isDestroyed.value || !mapContainer.value || !mapContainer.value.parentNode) return

    selectedLocation.value = location
    isLocationConfirmed.value = false // Reset confirmation when location changes

    if (map && marker && isMapLoaded.value && !isDestroyed.value && mapContainer.value && mapContainer.value.parentNode) {
        try {
            map.setCenter(location)
            marker.position = location
        } catch (err) {
            console.warn('Error updating map location:', err)
        }
    }

    if (!isDestroyed.value) {
        emit('update:modelValue', location)
        console.log('Location updated:', location)
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
        // Use AutocompleteService for text search
        const googleMaps = (window as any).google?.maps
        if (!googleMaps || !googleMaps.places) {
            throw new Error('Google Maps Places API not available')
        }

        const autocompleteService = new googleMaps.places.AutocompleteService()

        const request = {
            input: searchQuery.value,
            types: ['address'],
            componentRestrictions: { country: 'co' } // Restrict to Colombia
        }

        autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
            if (!isDestroyed.value) {
                if (status === googleMaps.places.PlacesServiceStatus.OK && predictions) {
                    // Get place details for each prediction
                    const placesService = new googleMaps.places.PlacesService(map)

                    const promises = predictions.slice(0, 5).map((prediction: any) => {
                        return new Promise((resolve) => {
                            placesService.getDetails({
                                placeId: prediction.place_id,
                                fields: ['formatted_address', 'geometry']
                            }, (place: any, placeStatus: any) => {
                                if (placeStatus === googleMaps.places.PlacesServiceStatus.OK && place) {
                                    resolve({
                                        formatted_address: place.formatted_address || prediction.description,
                                        geometry: place.geometry
                                    })
                                } else {
                                    resolve(null)
                                }
                            })
                        })
                    })

                    Promise.all(promises).then((results: any[]) => {
                        if (!isDestroyed.value) {
                            searchResults.value = results.filter(result => result !== null)
                            console.log('Search results:', searchResults.value)
                        }
                    })
                } else {
                    searchResults.value = []
                    if (status !== googleMaps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        console.warn('Search failed:', status)
                    }
                }
            }
        })
    } catch (err) {
        if (!isDestroyed.value) {
            console.error('Error searching address:', err)
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
    console.log('Address selected:', result.formatted_address)
}

// Basic methods
const confirmLocation = () => {
    if (selectedLocation.value) {
        isLocationConfirmed.value = true
        emit('location-confirmed', selectedLocation.value)
        console.log('Location confirmed:', selectedLocation.value)
    }
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
            console.error('Error loading Google Maps:', err)
            if (err.message === 'Google Maps API key not configured') {
                error.value = 'API key de Google Maps no configurada'
            } else {
                error.value = 'Error al cargar Google Maps'
            }
        }
    }
})

onUnmounted(() => {
    console.log('GoogleMapsSelector unmounting...')
    isDestroyed.value = true

    // Clear timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout)
        searchTimeout = null
    }

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
    console.log('GoogleMapsSelector cleanup completed')
})
</script>
