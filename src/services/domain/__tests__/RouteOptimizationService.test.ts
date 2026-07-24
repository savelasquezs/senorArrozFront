import { beforeEach, describe, expect, it, vi } from 'vitest'

const mapsMocks = vi.hoisted(() => ({
    importLibrary: vi.fn(),
    computeRoutes: vi.fn(),
}))

vi.mock('@googlemaps/js-api-loader', () => ({
    importLibrary: mapsMocks.importLibrary,
}))

import { RouteOptimizationService } from '@/services/domain/RouteOptimizationService'

describe('RouteOptimizationService.getSimpleRoute', () => {
    beforeEach(() => {
        mapsMocks.computeRoutes.mockReset()
        mapsMocks.importLibrary.mockReset()
        mapsMocks.importLibrary.mockResolvedValue({
            Route: {
                computeRoutes: mapsMocks.computeRoutes,
            },
        })
    })

    it('requests a traffic-aware driving route and maps the selected fields', async () => {
        const viewport = { north: 7, south: 6, east: -75, west: -76 }
        mapsMocks.computeRoutes.mockResolvedValue({
            routes: [{
                distanceMeters: 6425,
                durationMillis: 1_080_000,
                path: [
                    { lat: 6.2442, lng: -75.5812 },
                    { lat: 6.265, lng: -75.57 },
                ],
                viewport,
                warnings: ['Ruta sujeta a cierres viales.'],
            }],
        })

        const result = await RouteOptimizationService.getSimpleRoute(
            { lat: 6.2442, lng: -75.5812 },
            { lat: 6.265, lng: -75.57 }
        )

        expect(mapsMocks.importLibrary).toHaveBeenCalledWith('routes')
        expect(mapsMocks.computeRoutes).toHaveBeenCalledOnce()
        expect(mapsMocks.computeRoutes).toHaveBeenCalledWith(expect.objectContaining({
            origin: { lat: 6.2442, lng: -75.5812 },
            destination: { lat: 6.265, lng: -75.57 },
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
            departureTime: expect.any(Date),
        }))
        expect(result).toEqual({
            distanceMeters: 6425,
            durationMillis: 1_080_000,
            path: [
                { lat: 6.2442, lng: -75.5812 },
                { lat: 6.265, lng: -75.57 },
            ],
            viewport,
            warnings: ['Ruta sujeta a cierres viales.'],
        })
    })

    it('returns null when Google has no complete route metrics', async () => {
        mapsMocks.computeRoutes.mockResolvedValue({ routes: [] })

        await expect(RouteOptimizationService.getSimpleRoute(
            { lat: 6.2442, lng: -75.5812 },
            { lat: 6.265, lng: -75.57 }
        )).resolves.toBeNull()
    })
})
