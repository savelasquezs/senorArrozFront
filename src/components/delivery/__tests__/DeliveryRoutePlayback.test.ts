import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeliveryPlaybackResponse } from '@/services/MainAPI/deliveryTrackingIncidentsApi'

const markerInstances = vi.hoisted(() => [] as MarkerMock[])

class MarkerMock {
  title = ''
  setMap = vi.fn()
  setPosition = vi.fn()
  setLabel = vi.fn()
  addListener = vi.fn(() => ({ remove: vi.fn() }))

  constructor(options: { title?: string }) {
    this.title = options.title || ''
    markerInstances.push(this)
  }
}

class PolylineMock {
  setMap = vi.fn()
  setOptions = vi.fn()
}

class MapMock {
  addListener = vi.fn(() => ({ remove: vi.fn() }))
  panTo = vi.fn()
  fitBounds = vi.fn()
  setZoom = vi.fn()
  getBounds = vi.fn(() => ({ contains: () => true }))
}

class BoundsMock {
  extend = vi.fn()
  getCenter = vi.fn(() => ({ lat: 6.25, lng: -75.58 }))
}

vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(async () => ({ Map: MapMock })),
}))

import DeliveryRoutePlayback from '@/components/delivery/DeliveryRoutePlayback.vue'

const data: DeliveryPlaybackResponse = {
  from: '2026-07-26T17:00:00Z',
  to: '2026-07-26T17:01:00Z',
  serverTimezone: 'America/Bogota',
  deliverymen: [{
    deliverymanId: 1,
    deliverymanName: 'Gloria',
    branchId: 1,
    branchName: 'Centro',
    events: [],
    points: [
      {
        id: 1, deliverymanId: 1, latitude: 6.25, longitude: -75.58,
        recordedAt: '2026-07-26T17:00:00Z', syncedAt: '2026-07-26T17:00:01Z',
        accuracyMeters: 5, headingDegrees: null, batteryLevelPercent: 80,
        internetAvailable: true, gpsEnabled: true, trackingMode: 'active_delivery',
        deliveryRouteId: 2, workSessionId: 3,
      },
      {
        id: 2, deliverymanId: 1, latitude: 6.251, longitude: -75.581,
        recordedAt: '2026-07-26T17:00:30Z', syncedAt: '2026-07-26T17:00:31Z',
        accuracyMeters: 5, headingDegrees: null, batteryLevelPercent: 79,
        internetAvailable: true, gpsEnabled: true, trackingMode: 'active_delivery',
        deliveryRouteId: 2, workSessionId: 3,
      },
    ],
  }],
}

describe('DeliveryRoutePlayback overlays', () => {
  beforeEach(() => {
    markerInstances.length = 0
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key')
    vi.stubGlobal('google', {
      maps: {
        Map: MapMock,
        Marker: MarkerMock,
        Polyline: PolylineMock,
        LatLngBounds: BoundsMock,
        InfoWindow: class {
          setContent = vi.fn()
          open = vi.fn()
          close = vi.fn()
        },
        SymbolPath: { CIRCLE: 0 },
        event: { addListenerOnce: vi.fn((_target, _event, callback) => callback()) },
      },
    })
  })

  it('conserva los puntos existentes y mueve el marcador activo al avanzar', async () => {
    const wrapper = mount(DeliveryRoutePlayback, {
      props: { data, evidencePointIds: [2] },
    })
    await flushPromises()
    await nextTick()

    const firstPoint = markerInstances.find(marker => marker.title.includes('punto GPS'))
    const activeMarker = markerInstances.find(marker => marker.title === 'Gloria')
    expect(firstPoint).toBeDefined()
    expect(activeMarker).toBeDefined()

    await wrapper.get('input[type="range"]').setValue('1000')
    await nextTick()

    expect(firstPoint!.setMap).not.toHaveBeenCalledWith(null)
    expect(activeMarker!.setPosition).toHaveBeenCalled()
    expect(markerInstances.some(marker => marker.title === 'Punto del incidente')).toBe(true)
  })
})
