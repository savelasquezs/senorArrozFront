import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cameraSpies = vi.hoisted(() => ({
    fitBounds: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
}))
const optimizeRouteMock = vi.hoisted(() => vi.fn())
const infoWindowSpies = vi.hoisted(() => ({
    open: vi.fn(),
    close: vi.fn(),
}))
const geocodeMock = vi.hoisted(() => vi.fn())
const advancedMarkerInstances = vi.hoisted(() => [] as AdvancedMarkerMock[])

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
    content?: HTMLElement
    label?: unknown

    constructor(options: { map: unknown; position: unknown; title?: string; content?: HTMLElement; label?: unknown }) {
        this.map = options.map
        this.position = options.position
        this.title = options.title
        this.content = options.content
        this.label = options.label
        advancedMarkerInstances.push(this)
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
        if (library === 'geocoding') {
            return {
                Geocoder: class {
                    geocode = geocodeMock
                },
            }
        }
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
    addressAdditionalInfo: `Apto ${id}`,
    customerName: `Cliente ${id}`,
    guestName: null,
    deliveryManId: 7,
    statusDisplayName: 'En camino',
})

describe('DeliveryMap', () => {
    beforeEach(() => {
        cameraSpies.fitBounds.mockClear()
        cameraSpies.setCenter.mockClear()
        cameraSpies.setZoom.mockClear()
        optimizeRouteMock.mockReset()
        infoWindowSpies.open.mockReset()
        infoWindowSpies.close.mockReset()
        geocodeMock.mockReset()
        advancedMarkerInstances.length = 0
        vi.stubEnv('VITE_GOOGLE_MAPS_MAP_ID', 'test-map')
        vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

        vi.stubGlobal('google', {
            maps: {
                InfoWindow: class {
                    open = infoWindowSpies.open
                    close = infoWindowSpies.close
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

    it('muestra cliente en el marcador y enfoca una sola vez el pedido solicitado', async () => {
        const wrapper = mount(DeliveryMap, {
            props: {
                orders: [order(567, 6.24, -75.58)] as any,
                deliverymanLocations: {},
                focusOrderId: 567,
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

        const orderMarker = advancedMarkerInstances.find((marker) =>
            marker.content?.classList.contains('order-marker-root'))
        expect(orderMarker?.title).toBe('Pedido #567 — Cliente 567')
        expect(orderMarker?.content?.querySelector('.order-marker-label')?.textContent)
            .toBe('#567 · Cliente 567')
        expect(cameraSpies.setCenter).toHaveBeenCalledWith({ lat: 6.24, lng: -75.58 })
        expect(cameraSpies.setZoom).toHaveBeenCalledWith(17)
        expect(infoWindowSpies.open).toHaveBeenCalled()

        cameraSpies.setCenter.mockClear()
        cameraSpies.setZoom.mockClear()
        await wrapper.setProps({
            orders: [{ ...order(567, 6.24, -75.58), updatedAt: 'later' }] as any,
        })
        await flushPromises()
        expect(cameraSpies.setCenter).not.toHaveBeenCalled()
        expect(cameraSpies.setZoom).not.toHaveBeenCalled()

        wrapper.unmount()
    })

    it('geocodifica la dirección antes de enfocar cuando faltan coordenadas', async () => {
        geocodeMock.mockResolvedValue({
            results: [{
                geometry: {
                    location: {
                        lat: () => 6.25,
                        lng: () => -75.57,
                    },
                },
            }],
        })
        const withoutCoords = {
            ...order(568, 0, 0),
            latitude: null,
            longitude: null,
        }
        const wrapper = mount(DeliveryMap, {
            props: {
                orders: [withoutCoords] as any,
                deliverymanLocations: {},
                focusOrderId: 568,
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

        expect(geocodeMock).toHaveBeenCalledWith({ address: 'Dirección 568' })
        expect(cameraSpies.setCenter).toHaveBeenCalledWith({ lat: 6.25, lng: -75.57 })
        expect(cameraSpies.setZoom).toHaveBeenCalledWith(17)

        wrapper.unmount()
    })

    it('muestra cliente y dirección en el panel y copia el mensaje del pedido', async () => {
        const wrapper = mount(DeliveryMap, {
            props: {
                orders: [order(569, 6.24, -75.58)] as any,
                deliverymanLocations: {
                    7: {
                        lat: 6.23,
                        lng: -75.59,
                        updatedAt: new Date(),
                        name: 'Abelardo',
                    },
                },
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

        const driverMarker = advancedMarkerInstances.find((marker) =>
            marker.content?.classList.contains('dm-marker-root'))
        driverMarker?.content?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await nextTick()

        expect(wrapper.text()).toContain('#569')
        expect(wrapper.text()).toContain('Cliente 569')
        expect(wrapper.text()).toContain('Dirección 569, Apto 569')
        expect(wrapper.text()).not.toContain('Cargando productos')

        await wrapper.get('[aria-label="Copiar mensaje sobre el pedido 569"]').trigger('click')
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            'Abelardo, me están preguntando por el pedido número 569, que va para la dirección Dirección 569, Apto 569, ¿cuánto demora en llegar?',
        )

        wrapper.unmount()
    })
})
