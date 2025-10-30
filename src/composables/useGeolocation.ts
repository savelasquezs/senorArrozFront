import { ref, onUnmounted } from 'vue'

export interface Location {
    lat: number
    lng: number
}

export function useGeolocation() {
    const location = ref<Location | null>(null)
    const error = ref<string | null>(null)
    const isTracking = ref(false)
    const permissionState = ref<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')

    let watchId: number | null = null

    const checkPermission = async () => {
        if (!(navigator as any).permissions) {
            permissionState.value = 'unknown'
            return
        }

        try {
            const result = await (navigator as any).permissions.query({ name: 'geolocation' as PermissionName })
            permissionState.value = result.state as any
                ; (result as any).onchange = () => {
                    permissionState.value = result.state as any
                }
        } catch {
            permissionState.value = 'unknown'
        }
    }

    const requestLocation = async (): Promise<Location | null> => {
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

    const isLocationEnabled = () => {
        return localStorage.getItem('delivery:geolocation_enabled') === 'true'
    }

    onUnmounted(() => {
        stopTracking()
    })

    return {
        location,
        error,
        isTracking,
        permissionState,
        checkPermission,
        requestLocation,
        startTracking,
        stopTracking,
        isLocationEnabled
    }
}


