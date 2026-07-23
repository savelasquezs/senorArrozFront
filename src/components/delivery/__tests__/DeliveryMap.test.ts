import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cameraSpies = vi.hoisted(() => ({
    fitBounds: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
}))
const optimizeRouteMock = vi.hoisted(() => vi.fn())

class GoogleMapMock {
    fitBounds = cameraSpies.fitBounds
    setCenter = cameraSpies.setCenter
    setZoom = cameraSpies.setZoom

    getMapTypeId() {
        return 'roadmap'
    }
}

class AdvancedMarkerMock {
    map: unknown
    position: unknown
    title?: string

    constructor(options: { map: unknown; position: unknown; title?: string }) {
        this.map = options.map
        this.position = options.position
        this.title = options.title
    }

    addListener() {
        return { remove: vi.fn() }
    }
}

vi.mock('@googlemaps/js-api-loader', () => ({
    setOptions: vi.fn(),
    importLibrary: vi.fn(async (library: string) => {
        if (library === 'maps') return { Map: GoogleMapMock }
        if (library === 'marker') return { AdvancedMarkerElement: AdvancedMarkerMock }
        if (library === 'geocoding') return { Geocoder: class {} }
        return {}
    }),
}))

vi.mock('@/services/domain/RouteOptimizationService', () => ({
    RouteOptimizationService: {
        initialize: vi.fn(),
        optimizeRoute: optimizeRouteMock,
    },
}))

import DeliveryMap from '@/components/delivery/DeliveryMap.vue'

const order = (id: number, lat: number, lng: number) => ({
    id,
    type: 'delivery',
    status: 'on_the_way',
    latitude: lat,
    longitude: lng,
    addressDescription: `Dirección ${id}`,
})

describe('DeliveryMap', () => {
    beforeEach(() => {
        cameraSpies.fitBounds.mockClear()
        cameraSpies.setCenter.mockClear()
        cameraSpies.setZoom.mockClear()
        optimizeRouteMock.mockReset()

        vi.stubGlobal('google', {
            maps: {
                InfoWindow: class {
                    open() {}
                },
                Marker: AdvancedMarkerMock,
                LatLngBounds: class {
                    extend() {}
                    isEmpty() {
                        return false
                    }
                },
                Polyline: class {
                    setMap() {}
                },
                Size: class {},
                event: {
                    addListener: vi.fn(),
                    clearInstanceListeners: vi.fn(),
                },
            },
        })
    })

    it('conserva la cámara cuando se actualizan los pedidos', async () => {
        const wrapper = mount(DeliveryMap, {
            props: {
                orders: [order(1, 6.24, -75.58)] as any,
                deliverymanLocations: {},
            },
            global: {
                stubs: {
                    BaseButton: {
                        template: '<button><slot /></button>',
                    },
                },
            },
        })
        await flushPromises()

        await wrapper.setProps({
            orders: [
                order(1, 6.24, -75.58),
                order(2, 6.26, -75.56),
            ] as any,
        })
        await nextTick()

        expect(cameraSpies.fitBounds).not.toHaveBeenCalled()
        expect(cameraSpies.setCenter).not.toHaveBeenCalled()
        expect(cameraSpies.setZoom).not.toHaveBeenCalled()

        wrapper.unmount()
    })

    it('conserva la cámara cuando se recalcula la ruta de los pedidos', async () => {
        optimizeRouteMock.mockResolvedValue({
            route: {
                overview_path: [
                    { lat: 6.24, lng: -75.58 },
                    { lat: 6.26, lng: -75.56 },
                ],
            },
            optimizedOrder: [2],
        })

        const wrapper = mount(DeliveryMap, {
            props: {
                orders: [
                    order(1, 6.24, -75.58),
                    order(2, 6.26, -75.56),
                ] as any,
                deliverymanLocations: {},
            },
            global: {
                stubs: {
                    BaseButton: {
                        template: '<button><slot /></button>',
                    },
                },
            },
        })
        await flushPromises()

        await (wrapper.vm as any).recalculateRoute()

        expect(cameraSpies.fitBounds).not.toHaveBeenCalled()
        expect(cameraSpies.setCenter).not.toHaveBeenCalled()
        expect(cameraSpies.setZoom).not.toHaveBeenCalled()

        wrapper.unmount()
    })
})
