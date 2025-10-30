// useGeolocation.ts
import { ref, onUnmounted } from 'vue'

export interface GeoLocation {
    lat: number
    lng: number
}

export function useGeolocation() {
    const location = ref<GeoLocation | null>(null)
    const error = ref<string | null>(null)
    const isTracking = ref(false)
    const permissionState = ref<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')

    let watchId: number | null = null

    const requestLocation = async (): Promise<GeoLocation | null> => {
        if (!navigator.geolocation) {
            error.value = 'Geolocalización no disponible'
            return null
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                    location.value = loc
                    error.value = null
                    localStorage.setItem('delivery:geolocation_enabled', 'true')
                    resolve(loc)
                },
                (err) => {
                    error.value = err.message
                    permissionState.value = 'denied'
                    resolve(null)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            )
        })
    }

    const startTracking = () => {
        if (watchId !== null || !navigator.geolocation) return
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                location.value = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }
                error.value = null
            },
            (err) => {
                error.value = err.message
                isTracking.value = false
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        )
        isTracking.value = true
    }

    const stopTracking = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId)
            watchId = null
        }
        isTracking.value = false
    }

    const isLocationEnabled = () =>
        localStorage.getItem('delivery:geolocation_enabled') === 'true'

    onUnmounted(stopTracking)

    return {
        location,
        error,
        isTracking,
        permissionState,
        requestLocation,
        startTracking,
        stopTracking,
        isLocationEnabled,
    }
}
