import type { GeoLocation } from '@/composables/useGeolocation'
import { importLibrary } from '@googlemaps/js-api-loader'

export interface SimpleRouteResult {
    distanceMeters: number
    durationMillis: number
    path: GeoLocation[]
    viewport: google.maps.LatLngBounds | null
    warnings: string[]
}

export class RouteOptimizationService {
    private static directionsService: any = null

    static initialize(_: any) {
        if (!RouteOptimizationService.directionsService && (window as any).google?.maps) {
            RouteOptimizationService.directionsService = new (window as any).google.maps.DirectionsService()
        }
    }

    static async optimizeRoute(
        origin: GeoLocation,
        waypoints: Array<GeoLocation & { orderId: number }>,
        destination?: GeoLocation
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

    static async getSimpleRoute(
        origin: GeoLocation,
        destination: GeoLocation
    ): Promise<SimpleRouteResult | null> {
        const { Route } = await importLibrary('routes') as google.maps.RoutesLibrary
        const response = await Route.computeRoutes({
            origin,
            destination,
            travelMode: 'DRIVING',
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            trafficModel: 'bestguess',
            language: 'es-CO',
            region: 'co',
            polylineQuality: 'OVERVIEW',
            fields: [
                'distanceMeters',
                'durationMillis',
                'path',
                'viewport',
                'warnings',
            ],
        })

        const route = response.routes?.[0]
        if (
            !route ||
            typeof route.distanceMeters !== 'number' ||
            typeof route.durationMillis !== 'number' ||
            !Number.isFinite(route.distanceMeters) ||
            !Number.isFinite(route.durationMillis)
        ) {
            return null
        }

        return {
            distanceMeters: route.distanceMeters,
            durationMillis: route.durationMillis,
            path: (route.path ?? []).map((point) => ({ lat: point.lat, lng: point.lng })),
            viewport: route.viewport ?? null,
            warnings: route.warnings ?? [],
        }
    }
}


