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
            <BaseInput v-model.number="selectedLocation.lat" label="Latitud" type="number" step="any" readonly
                class="bg-gray-50" />
            <BaseInput v-model.number="selectedLocation.lng" label="Longitud" type="number" step="any" readonly
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
let placesService: any = null
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
        if (!apiKey) {
            reject(new Error('Google Maps API key not configured'))
            return
        }

        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
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

        map = new googleMaps.Map(mapContainer.value, {
            center: defaultLocation,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            mapId: 'DEMO_MAP_ID' // Map ID for Advanced Markers
        })

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
        // Initialize geocoder and places service
        geocoder = new googleMaps.Geocoder()
        placesService = new googleMaps.places.PlacesService(map)

        // Import Advanced Marker library
        const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary("marker")

        // Initialize marker
        marker = new AdvancedMarkerElement({
            position: defaultLocation,
            map: map,
            title: 'Ubicación seleccionada'
        })

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

        isMapLoaded.value = true
        console.log('Map initialized successfully')

    } catch (err) {
        if (!isDestroyed.value) {
            console.error('Error initializing map:', err)
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
    if (!placesService || !searchQuery.value.trim() || isDestroyed.value) return

    try {
        const request = {
            query: searchQuery.value,
            fields: ['formatted_address', 'geometry']
        }

        placesService.textSearch(request, (results: any, status: any) => {
            if (!isDestroyed.value) {
                if (status === 'OK' && results) {
                    searchResults.value = results.map((result: any) => ({
                        formatted_address: result.formatted_address || '',
                        geometry: result.geometry
                    }))
                    console.log('Search results:', searchResults.value)
                } else {
                    searchResults.value = []
                    if (status !== 'ZERO_RESULTS') {
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
        console.log('Loading Google Maps...')
        await loadGoogleMaps()
        console.log('Google Maps loaded, waiting for full initialization...')

        // Wait a bit more to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 500))

        console.log('Initializing map...')
        await initializeMap()
        console.log('GoogleMapsSelector mounted successfully')
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
    placesService = null

    // Reset reactive state
    isMapLoaded.value = false
    searchResults.value = []
    selectedLocation.value = null
    isLocationConfirmed.value = false
    error.value = ''
    console.log('GoogleMapsSelector cleanup completed')
})
</script>
