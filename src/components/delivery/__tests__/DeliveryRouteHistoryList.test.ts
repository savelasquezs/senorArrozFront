import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DeliveryRouteHistoryList from '@/components/delivery/DeliveryRouteHistoryList.vue'
import type { DeliveryPerformanceRoute, DeliveryRouteDetail } from '@/types/deliveryPerformance'
import { formatElapsedDuration } from '@/helpers/orderDurations'
vi.mock('@/services/MainAPI/dashboardApi', () => ({ dashboardApi: { getDeliveryRouteStops: vi.fn() } }))
vi.mock('../DeliveryRouteHistoryMap.vue', () => ({ default: { props: ['detail'], template: '<div class="route-map">Mapa {{ detail.routeId }}</div>' } }))
const route = (id: number): DeliveryPerformanceRoute => ({ id, deliverymanId: 1, deliverymanName: `D${id}`, branchName: 'Sucursal', departedAtUtc: null, completedAtUtc: null,
  deliveredCount: 1, durationMinutes: null, metaMinutes: 20, metSla: null, gpsDistanceKm: null, plannedDistanceKm: 3, gpsCoveragePercent: 0 })
const detail = (id: number): DeliveryRouteDetail => ({ routeId: id, branchLatitude: null, branchLongitude: null, departedAtUtc: null, completedAtUtc: null, gpsCoveragePercent: 0, segments: [], stops: [] })

describe('route history details', () => {
  it('shows En camino timestamps and durations when the route has no observed departure', async () => {
    const data: DeliveryRouteDetail = { ...detail(1), completedAtUtc: '2026-10-04T17:45:19.408Z', stops: [
      { orderId: 7900, stopSequence: 1, addressSnapshotText: null, customerName: null, addressText: null, latitude: null, longitude: null,
        onTheWayAtUtc: '2026-10-04T17:14:50.8750758Z', deliveredAtUtc: '2026-10-04T17:30:46.031087Z' },
      { orderId: 7901, stopSequence: 2, addressSnapshotText: null, customerName: null, addressText: null, latitude: null, longitude: null,
        onTheWayAtUtc: '2026-10-04T17:14:51.0582923Z', deliveredAtUtc: '2026-10-04T17:35:57.7809386Z' },
    ] }
    const wrapper = mount(DeliveryRouteHistoryList, { props: { routes: [route(1)], branchId: null, loadDetail: vi.fn().mockResolvedValue(data) },
      global: { stubs: { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' } } } })
    await wrapper.get('[aria-label="Ver recorrido de D1, ruta 1"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Tiempo total de la ruta30 min 28 s')
    expect(dialog.text()).toContain('Salida: 4 de octubre de 2026, 12:14')
    expect(dialog.text()).not.toContain('referencia')
    const orders = dialog.findAll('li button')
    expect(orders[0]!.text()).toContain('Tiempo de entrega: 15 min 55 s')
    expect(orders[1]!.text()).toContain('Tiempo de entrega: 21 min 6 s')
    expect(orders[0]!.text()).toContain('En camino → entrega del pedido')
    expect(orders[0]!.text()).toContain('En camino: 4 de octubre de 2026, 12:14')
    wrapper.unmount()
  })

  it('measures each delivery from its own En camino even when the route has an observed departure', async () => {
    const data: DeliveryRouteDetail = { ...detail(1), departedAtUtc: '2026-10-22T17:00:00Z', completedAtUtc: '2026-10-22T17:40:00Z',
      stops: [5, 20, null].map((minutes, index) => ({ orderId: index + 1, stopSequence: index + 1, addressSnapshotText: null,
        customerName: null, addressText: 'Dirección', latitude: 6.24, longitude: -75.58,
        onTheWayAtUtc: index === 0 ? '2026-10-22T16:57:00Z' : '2026-10-22T16:50:00Z',
        deliveredAtUtc: minutes === null ? null : `2026-10-22T17:${String(minutes).padStart(2, '0')}:00Z` })) }
    const wrapper = mount(DeliveryRouteHistoryList, { props: { routes: [route(1)], branchId: null, loadDetail: vi.fn().mockResolvedValue(data) },
      global: { stubs: { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' } } } })
    await wrapper.get('[aria-label="Ver recorrido de D1, ruta 1"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Tiempo total de la ruta40 min 0 s')
    expect(dialog.text()).toContain('Desde la salida hasta el regreso')
    const orders = dialog.findAll('li button')
    expect(orders[0]!.text()).toContain('Tiempo de entrega: 8 min 0 s')
    expect(orders[1]!.text()).toContain('Tiempo de entrega: 30 min 0 s')
    expect(orders[2]!.text()).toContain('Tiempo de entrega: No disponible')
    expect(orders[0]!.text()).toContain('En camino → entrega del pedido')
    expect(dialog.text()).not.toContain('Salida de la ruta → entrega del pedido')
    expect(orders[0]!.text()).not.toContain('40 min')
    wrapper.unmount()
  })

  it('preserves seconds across Colombia midnight and does not substitute missing or inverted times', () => {
    const start = '2026-10-20T19:21:25.697-05:00'
    expect(formatElapsedDuration(start, '2026-10-21T00:31:31.0929371Z')).toBe('10 min 5 s')
    expect(formatElapsedDuration(start, '2026-10-21T00:35:56.882Z')).toBe('14 min 31 s')
    expect(formatElapsedDuration(start, start)).toBe('0 min 0 s')
    expect(formatElapsedDuration(null, start)).toBe('No disponible')
    expect(formatElapsedDuration(start, null)).toBe('No disponible')
    expect(formatElapsedDuration('invalid', start)).toBe('No disponible')
    expect(formatElapsedDuration(start, '2026-10-21T00:20:00Z')).toBe('No disponible')
  })

  it('identifies estimates and numbers the order list by actual delivery time', async () => {
    const data = { ...detail(1), departedAtUtc: '2026-10-22T17:00:00Z', completedAtUtc: '2026-10-22T17:40:00Z',
      stops: [20, 5].map((minutes, index) => ({ orderId: index + 10, stopSequence: index + 1, addressSnapshotText: null,
        customerName: null, addressText: 'Dirección', latitude: 6.24, longitude: -75.58, deliveredAtUtc: `2026-10-22T17:${minutes.toString().padStart(2, '0')}:00Z` })) }
    const wrapper = mount(DeliveryRouteHistoryList, { props: { routes: [route(1)], branchId: null, loadDetail: vi.fn().mockResolvedValue(data) },
      global: { stubs: { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' } } } })
    await wrapper.get('[aria-label="Ver recorrido de D1, ruta 1"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('Recorrido estimado por entregas')
    const orders = dialog.findAll('li button')
    expect(orders[0]!.text()).toContain('1 · Pedido #11')
    expect(orders[1]!.text()).toContain('2 · Pedido #10')
    wrapper.unmount()
  })

  it('loads on demand and does not allow an old route response to replace the selected route', async () => {
    let resolveFirst!: (value: DeliveryRouteDetail) => void
    let resolveSecond!: (value: DeliveryRouteDetail) => void
    const load = vi.fn().mockImplementationOnce(() => new Promise<DeliveryRouteDetail>(resolve => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise<DeliveryRouteDetail>(resolve => { resolveSecond = resolve }))
    const wrapper = mount(DeliveryRouteHistoryList, { props: { routes: [route(1), route(2)], branchId: null, loadDetail: load }, global: { stubs: { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' } } } })
    expect(load).not.toHaveBeenCalled()
    const buttons = wrapper.findAll('ul button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    resolveSecond(detail(2))
    await flushPromises()
    resolveFirst(detail(1))
    await flushPromises()
    expect(wrapper.text()).toContain('Mapa 2')
    expect(wrapper.text()).not.toContain('Mapa 1')
    await wrapper.setProps({ routes: [route(3)] })
    expect(wrapper.find('.route-map').exists()).toBe(false)
    wrapper.unmount()
  })
})
