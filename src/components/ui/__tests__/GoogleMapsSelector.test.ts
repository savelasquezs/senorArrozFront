import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, beforeEach, vi } from 'vitest'

const routeMock = vi.hoisted(() => vi.fn())
const googleMocks = vi.hoisted(() => {
    const camera = {
        fitBounds: vi.fn(),
        setCenter: vi.fn(),
        setZoom: vi.fn(),
    }
    const fetchAutocompleteSuggestions = vi.fn()
    const polylines: Array<{ options: any; setMap: ReturnType<typeof vi.fn> }> = []

    class MapMock {
        fitBounds = camera.fitBounds
        setCenter = camera.setCenter
        setZoom = camera.setZoom

        addListener() {
            return { remove: vi.fn() }
        }

        getCenter() {
            return { lat: () => 6.2442, lng: () => -75.5812 }
        }
    }

    class PolylineMock {
        options: any
        setMap = vi.fn()

        constructor(options: any) {
            this.options = options
            polylines.push(this)
        }
    }

    class AdvancedMarkerMock {
        map: unknown
        position: unknown

        constructor(options: any) {
            this.map = options.map
            this.position = options.position
        }

        addListener() {
            return { remove: vi.fn() }
        }
    }

    class PinElementMock extends HTMLElement {}

    return {
        camera,
        fetchAutocompleteSuggestions,
        polylines,
        MapMock,
        PolylineMock,
        AdvancedMarkerMock,
        PinElementMock,
    }
})

vi.mock('@googlemaps/js-api-loader', () => ({
    setOptions: vi.fn(),
    importLibrary: vi.fn(async (library: string) => {
        if (library === 'maps') {
            return { Map: googleMocks.MapMock, Polyline: googleMocks.PolylineMock }
        }
        if (library === 'marker') {
            return {
                AdvancedMarkerElement: googleMocks.AdvancedMarkerMock,
                PinElement: googleMocks.PinElementMock,
            }
        }
        if (library === 'geocoding') {
            return { Geocoder: class {} }
        }
        if (library === 'places') {
            return {
                AutocompleteSessionToken: class {},
                AutocompleteSuggestion: {
                    fetchAutocompleteSuggestions: googleMocks.fetchAutocompleteSuggestions,
                },
            }
        }
        return {}
    }),
}))

vi.mock('@/services/domain/RouteOptimizationService', () => ({
    RouteOptimizationService: {
        getSimpleRoute: routeMock,
    },
}))

import GoogleMapsSelector from '@/components/ui/GoogleMapsSelector.vue'

const BaseInputStub = {
    props: ['modelValue', 'label'],
    emits: ['update:modelValue', 'input', 'blur'],
    template: `
        <label>
            {{ label }}
            <input
                :data-label="label"
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value); $emit('input', $event)"
                @blur="$emit('blur')"
            />
            <slot name="icon" />
        </label>
    `,
}

const mountSelector = (props: Record<string, unknown>) => mount(GoogleMapsSelector, {
    props,
    global: {
        stubs: {
            BaseInput: BaseInputStub,
            BaseButton: {
                props: ['disabled'],
                emits: ['click'],
                template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
            },
            BaseDialog: {
                props: ['modelValue'],
                template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
            },
        },
    },
})

const routeResult = (
    distanceMeters: number,
    durationMillis: number,
    warning = ''
) => ({
    distanceMeters,
    durationMillis,
    path: [
        { lat: 6.2442, lng: -75.5812 },
        { lat: 6.265, lng: -75.57 },
    ],
    viewport: { id: `viewport-${distanceMeters}` },
    warnings: warning ? [warning] : [],
})

describe('GoogleMapsSelector route preview', () => {
    beforeEach(() => {
        routeMock.mockReset()
        googleMocks.camera.fitBounds.mockReset()
        googleMocks.camera.setCenter.mockReset()
        googleMocks.camera.setZoom.mockReset()
        googleMocks.fetchAutocompleteSuggestions.mockReset()
        googleMocks.fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
        googleMocks.polylines.splice(0)

        vi.stubGlobal('google', {
            maps: {
                Marker: googleMocks.AdvancedMarkerMock,
                SymbolPath: { CIRCLE: 'CIRCLE' },
                event: {
                    clearInstanceListeners: vi.fn(),
                },
            },
        })
    })

    it('shows distance, traffic duration, warnings and the route for initial coordinates', async () => {
        routeMock.mockResolvedValue(routeResult(6425, 1_080_000, 'Ruta sujeta a cierres viales.'))

        const wrapper = mountSelector({
            modelValue: { lat: 6.265, lng: -75.57 },
            routeOrigin: { label: 'Castilla', lat: 6.2442, lng: -75.5812 },
        })
        await flushPromises()

        expect(routeMock).toHaveBeenCalledWith(
            { lat: 6.2442, lng: -75.5812 },
            { lat: 6.265, lng: -75.57 }
        )
        expect(wrapper.get('[data-testid="route-summary"]').text()).toContain(
            'Desde Castilla: 6,4 km · aprox. 18 min con tráfico actual'
        )
        expect(wrapper.text()).toContain('Ruta sujeta a cierres viales.')
        expect(googleMocks.polylines).toHaveLength(1)
        expect(googleMocks.polylines[0].options).toEqual(expect.objectContaining({
            strokeColor: '#10b981',
            strokeWeight: 5,
        }))
        expect(googleMocks.camera.fitBounds).toHaveBeenCalled()
    })

    it('calculates the route when coordinates are pasted from a Google Maps link', async () => {
        routeMock.mockResolvedValue(routeResult(850, 540_000))
        const wrapper = mountSelector({
            routeOrigin: { label: 'Castilla', lat: 6.2442, lng: -75.5812 },
        })
        await flushPromises()

        await wrapper.get('input[data-label="Pegar enlace de Google Maps"]')
            .setValue('https://www.google.com/maps/@6.300000,-75.600000,17z')
        const useLinkButton = wrapper.findAll('button')
            .find((button) => button.text().includes('Usar coordenadas del enlace'))
        expect(useLinkButton).toBeTruthy()
        await useLinkButton!.trigger('click')
        await flushPromises()

        expect(routeMock).toHaveBeenCalledWith(
            { lat: 6.2442, lng: -75.5812 },
            { lat: 6.3, lng: -75.6 }
        )
        expect(wrapper.get('[data-testid="route-summary"]').text()).toContain('850 m')
        expect(wrapper.text()).toContain('9 min')
    })

    it('calculates the route after selecting an autocomplete suggestion', async () => {
        const place = {
            formattedAddress: 'Cra 68 # 98-137, Castilla, Medellín, Colombia',
            location: { lat: () => 6.287, lng: () => -75.585 },
            fetchFields: vi.fn().mockResolvedValue(undefined),
        }
        googleMocks.fetchAutocompleteSuggestions.mockResolvedValue({
            suggestions: [{
                placePrediction: {
                    toPlace: () => place,
                },
            }],
        })
        routeMock.mockResolvedValue(routeResult(3150, 720_000))

        const wrapper = mountSelector({
            routeOrigin: { label: 'Castilla', lat: 6.2442, lng: -75.5812 },
        })
        await flushPromises()

        const searchInput = wrapper.get('input[data-label="Buscar dirección"]')
        await searchInput.setValue('Cra 68 # 98-137')
        await searchInput.trigger('blur')
        await flushPromises()

        const result = wrapper.findAll('div')
            .find((item) => item.text() === place.formattedAddress)
        expect(result).toBeTruthy()
        await result!.trigger('click')
        await flushPromises()

        expect(routeMock).toHaveBeenCalledWith(
            { lat: 6.2442, lng: -75.5812 },
            { lat: 6.287, lng: -75.585 }
        )
        expect(wrapper.get('[data-testid="route-summary"]').text()).toContain('3,2 km')
        expect(wrapper.text()).toContain('12 min')
    })

    it('ignores a slower response for a destination that is no longer selected', async () => {
        let resolveFirst!: (value: any) => void
        let resolveSecond!: (value: any) => void
        routeMock
            .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
            .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))

        const wrapper = mountSelector({
            modelValue: { lat: 6.25, lng: -75.58 },
            routeOrigin: { label: 'Castilla', lat: 6.2442, lng: -75.5812 },
        })
        await flushPromises()

        await wrapper.setProps({ modelValue: { lat: 6.3, lng: -75.6 } })
        await flushPromises()

        resolveSecond(routeResult(2000, 600_000))
        await flushPromises()
        resolveFirst(routeResult(9000, 3_600_000))
        await flushPromises()

        expect(wrapper.get('[data-testid="route-summary"]').text()).toContain('2,0 km')
        expect(wrapper.get('[data-testid="route-summary"]').text()).not.toContain('9,0 km')
        expect(googleMocks.polylines).toHaveLength(1)
    })

    it('keeps the selected coordinates usable when the branch has no coordinates', async () => {
        const wrapper = mountSelector({
            modelValue: { lat: 6.265, lng: -75.57 },
            routeOrigin: null,
        })
        await flushPromises()

        expect(routeMock).not.toHaveBeenCalled()
        expect(wrapper.get('[data-testid="route-summary"]').text()).toContain(
            'La sucursal no tiene coordenadas válidas'
        )
        expect((wrapper.get('input[data-label="Latitud"]').element as HTMLInputElement).value)
            .toBe('6.265000')
        expect((wrapper.get('input[data-label="Longitud"]').element as HTMLInputElement).value)
            .toBe('-75.570000')
    })
})
