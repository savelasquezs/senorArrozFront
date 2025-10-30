import type { Location } from '@/composables/useGeolocation'

export class RouteOptimizationService {
    private static directionsService: any = null

    static initialize(_: any) {
        if (!RouteOptimizationService.directionsService && (window as any).google?.maps) {
            RouteOptimizationService.directionsService = new (window as any).google.maps.DirectionsService()
        }
    }

    static async optimizeRoute(
        origin: Location,
        waypoints: Array<Location & { orderId: number }>,
        destination?: Location
    ): Promise<{
        route: any
        optimizedOrder: number[]
        totalDistance: number
        totalDuration: number
    } | null> {
        if (!RouteOptimizationService.directionsService) return null

        const finalDestination = destination || waypoints[waypoints.length - 1]
        const waypointsList = waypoints.slice(0, waypoints.length - (destination ? 1 : 0)).map((w) => ({
            location: { lat: w.lat, lng: w.lng },
            stopover: true
        }))

        return new Promise((resolve) => {
            RouteOptimizationService.directionsService.route(
                {
                    origin: { lat: origin.lat, lng: origin.lng },
                    destination: finalDestination ? { lat: finalDestination.lat, lng: finalDestination.lng } : { lat: origin.lat, lng: origin.lng },
                    waypoints: waypointsList.length > 0 ? waypointsList : undefined,
                    optimizeWaypoints: true,
                    travelMode: (window as any).google.maps.TravelMode.DRIVING,
                    avoidTolls: false
                },
                (result: any, status: any) => {
                    if (status === 'OK' && result) {
                        const route = result.routes[0]
                        const optimizedOrder = route.waypoint_order || []
                        let totalDistance = 0
                        let totalDuration = 0
                        route.legs.forEach((leg: any) => {
                            totalDistance += leg.distance.value
                            totalDuration += leg.duration.value
                        })
                        resolve({
                            route,
                            optimizedOrder,
                            totalDistance: totalDistance / 1000,
                            totalDuration: totalDuration / 60
                        })
                    } else {
                        resolve(null)
                    }
                }
            )
        })
    }

    static async getSimpleRoute(origin: Location, destination: Location): Promise<any> {
        if (!RouteOptimizationService.directionsService) return null
        return new Promise((resolve) => {
            RouteOptimizationService.directionsService.route(
                {
                    origin: { lat: origin.lat, lng: origin.lng },
                    destination: { lat: destination.lat, lng: destination.lng },
                    travelMode: (window as any).google.maps.TravelMode.DRIVING
                },
                (result: any, status: any) => {
                    if (status === 'OK' && result) resolve(result.routes[0])
                    else resolve(null)
                }
            )
        })
    }
}


