import { flushPromises, shallowMount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DeliveryMap from '../DeliveryMap.vue'
import type { DeliveryMapOrder } from '@/types/deliveryman'

const map = vi.hoisted(() => ({ init: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(), fitBounds: vi.fn() }))

vi.mock('@googlemaps/js-api-loader', () => ({
    setOptions: vi.fn(),
    importLibrary: async (name: 'maps' | 'geocoding' | 'marker' | 'geometry') => ({
        maps: { Map: class {
            constructor(_container: HTMLElement, options: unknown) { map.init(options) }
            setCenter = map.setCenter
            setZoom = map.setZoom
            fitBounds = map.fitBounds
        } },
        geocoding: { Geocoder: class {} },
        marker: {}, geometry: {},
    })[name],
}))

const destination = { lat: 6.2, lng: -75.5 }
const driver = { lat: 6.26, lng: -75.54, updatedAt: new Date('2026-11-23'), deliveryRouteId: 9 }
const row = { id: 20, type: 'delivery', status: 'on_the_way', deliveryManId: 8, deliveryRouteId: 9,
    latitude: destination.lat, longitude: destination.lng } as DeliveryMapOrder
let wrapper: VueWrapper | undefined

describe('order tracking map', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubEnv('VITE_GOOGLE_MAPS_MAP_ID', '')
        vi.stubGlobal('google', { maps: {
            Marker: class { addListener() {} setMap() {} },
            Size: class {}, InfoWindow: class { close() {} },
            LatLngBounds: class {
                points: { lat: number; lng: number }[] = []
                extend(point: { lat: number; lng: number }) { this.points.push(point) }
            },
            event: { addListener: vi.fn(), clearInstanceListeners: vi.fn() },
        } })
    })
    afterEach(() => { wrapper?.unmount(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

    it('opens in dark mode and widens the camera when the driver arrives', async () => {
        wrapper = shallowMount(DeliveryMap, { props: { orders: [row], focusOrderId: 20, trackFocusedOrder: true,
            whatsappTheme: 'dark' } })
        await flushPromises()
        expect(map.init).toHaveBeenCalledWith(expect.objectContaining({ colorScheme: 'DARK' }))
        expect(map.setCenter).toHaveBeenCalledWith(destination)

        await wrapper.setProps({ deliverymanLocations: { 8: driver } }); await flushPromises()
        expect(map.fitBounds).toHaveBeenCalledWith(expect.objectContaining({ points: [destination, { lat: driver.lat, lng: driver.lng }] }),
            expect.any(Object))
        await wrapper.setProps({ deliverymanLocations: { 8: { ...driver, lat: 6.27 } } }); await flushPromises()
        expect(map.fitBounds).toHaveBeenCalledTimes(1)
    })

    it('centers on the driver and reports a missing destination', async () => {
        wrapper = shallowMount(DeliveryMap, { props: { orders: [{ ...row, latitude: null, longitude: null }], focusOrderId: 20,
            trackFocusedOrder: true, whatsappTheme: 'light', deliverymanLocations: { 8: driver } } })
        await flushPromises()

        expect(map.init).toHaveBeenCalledWith(expect.objectContaining({ colorScheme: 'LIGHT' }))
        expect(map.setCenter).toHaveBeenCalledWith({ lat: driver.lat, lng: driver.lng })
        expect(wrapper.emitted('focus-unavailable')).toEqual([['El pedido #20 no tiene una ubicación que pueda mostrarse.']])
    })
})
