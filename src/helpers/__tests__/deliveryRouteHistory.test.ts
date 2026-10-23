import { describe, expect, it } from 'vitest'
import { deliveryRouteHistory, deliveryRouteTiming, deliveryStopTiming } from '@/helpers/deliveryRouteHistory'
import type { DeliveryRouteDetail } from '@/types/deliveryPerformance'

const stop = (orderId: number, deliveredAtUtc: string | null, latitude: number | null = 6.25): DeliveryRouteDetail['stops'][number] => ({
  orderId, stopSequence: orderId, deliveredAtUtc, latitude, longitude: -75.58,
  addressSnapshotText: null, addressText: null, customerName: null,
})
const route = (overrides: Partial<DeliveryRouteDetail> = {}): DeliveryRouteDetail => ({
  routeId: 1, branchLatitude: 6.24, branchLongitude: -75.59,
  departedAtUtc: '2026-10-21T00:00:00Z', completedAtUtc: '2026-10-21T00:40:00Z',
  gpsCoveragePercent: 0, segments: [], stops: [], ...overrides,
})

describe('delivery route reconstruction', () => {
  it('keeps order times but rejects inconsistent route duration and does not draw an unconfirmed return', () => {
    const detail = route({ returnIsInconsistent: true, completedAtUtc: '2026-10-22T17:00:00Z', stops: [
      { ...stop(1, '2026-10-21T00:10:00Z'), onTheWayAtUtc: '2026-10-21T00:00:00Z' },
    ] })
    expect(deliveryRouteTiming(detail).duration).toBe('No disponible')
    expect(deliveryRouteTiming(detail).description).toContain('Excluido de los promedios')
    expect(deliveryStopTiming(detail.stops[0]!).duration).toBe('10 min 0 s')
    expect(deliveryRouteHistory(detail).itinerary).toBe('Sucursal → 1')
    expect(deliveryRouteHistory(detail).caption).toContain('Regreso no confirmado')
  })

  it('uses each orders own En camino time and accepts assignment as real route departure', () => {
    const detail = route({ departedAtUtc: null, stops: [
      { ...stop(1, '2026-10-04T17:30:46.031087Z'), onTheWayAtUtc: '2026-10-04T17:14:50.8750758Z' },
      { ...stop(2, '2026-10-04T17:35:57.7809386Z'), onTheWayAtUtc: '2026-10-04T17:14:51.0582923Z' },
    ], completedAtUtc: '2026-10-04T17:45:19.408Z' })
    expect(deliveryStopTiming(detail.stops[0]!).duration).toBe('15 min 55 s')
    expect(deliveryStopTiming(detail.stops[1]!).duration).toBe('21 min 6 s')
    expect(deliveryStopTiming(detail.stops[1]!).reference).toBe('En camino → entrega del pedido')
    expect(deliveryRouteTiming(detail)).toMatchObject({ start: detail.stops[0]!.onTheWayAtUtc, duration: '30 min 28 s', description: 'Desde la salida hasta el regreso' })
    expect(detail.departedAtUtc).toBeNull()
  })

  it('keeps order time independent of observed route departure and rejects absent or inverted order timestamps', () => {
    const detail = route({ stops: [{ ...stop(1, '2026-10-21T00:10:00Z'), onTheWayAtUtc: '2026-10-20T23:55:00Z' }] })
    expect(deliveryStopTiming(detail.stops[0]!).duration).toBe('15 min 0 s')
    expect(deliveryStopTiming(detail.stops[0]!).reference).toBe('En camino → entrega del pedido')
    expect(deliveryRouteTiming(detail)).toMatchObject({ duration: '40 min 0 s' })
    detail.stops[0]!.onTheWayAtUtc = '2026-10-21T00:20:00Z'
    expect(deliveryStopTiming(detail.stops[0]!).duration).toBe('No disponible')
    expect(deliveryRouteTiming(detail).start).toBe(detail.departedAtUtc)
    detail.stops[0]!.onTheWayAtUtc = null
    expect(deliveryStopTiming(detail.stops[0]!).duration).toBe('No disponible')
    detail.stops[0]!.onTheWayAtUtc = detail.stops[0]!.deliveredAtUtc
    expect(deliveryStopTiming(detail.stops[0]!).duration).toBe('0 min 0 s')
    delete detail.stops[0]!.onTheWayAtUtc
    expect(deliveryStopTiming(detail.stops[0]!).duration).toBe('No disponible')
  })

  it('starts at the branch when departure was not recorded and visits the first delivered order first', () => {
    const detail = route({ departedAtUtc: null, stops: [stop(2, '2026-10-21T00:20:00Z', 6.26), stop(1, '2026-10-21T00:10:00Z')] })
    const view = deliveryRouteHistory(detail)
    expect(view.estimatedPath.map(point => point.latitude)).toEqual([6.24, 6.25, 6.26, 6.24])
    expect(view.itinerary).toBe('Sucursal → 1 → 2 → Sucursal')
    expect(view.caption).not.toContain('Salida desde la sucursal inferida')
    expect(detail.departedAtUtc).toBeNull()
  })

  it('orders deliveries by timestamp across timezone offsets without mutating the original order', () => {
    const detail = route({ stops: [stop(1, '2026-10-20T19:20:00-05:00', 6.26), stop(2, '2026-10-21T00:10:00Z')] })
    const view = deliveryRouteHistory(detail)
    expect(view.source).toBe('estimated')
    expect(view.stops.map(s => [s.orderId, s.stopSequence])).toEqual([[2, 1], [1, 2]])
    expect(view.estimatedPath.map(p => p.latitude)).toEqual([6.24, 6.25, 6.26, 6.24])
    expect(detail.stops.map(s => [s.orderId, s.stopSequence])).toEqual([[1, 1], [2, 2]])
  })

  it('keeps stops with missing times or invalid coordinates visible but outside the estimated path', () => {
    const view = deliveryRouteHistory(route({ stops: [stop(1, null), stop(2, 'invalid'),
      stop(3, '2026-10-21T00:05:00Z', 100), stop(4, '2026-10-21T00:10:00Z'), stop(5, '2026-10-21T00:15:00Z', null)] }))
    expect(view.stops).toHaveLength(5)
    expect(view.stops.map(s => s.orderId)).toEqual([3, 4, 5, 1, 2])
    expect(view.estimatedPath.map(p => p.latitude)).toEqual([6.24, 6.25, 6.24])
    expect(view.caption).toContain('no confirma las calles recorridas ni calcula kilómetros')
  })

  it('preserves recorded GPS and persisted numbering even when coverage has gaps', () => {
    const detail = route({ gpsCoveragePercent: 10, stops: [stop(5, '2026-10-21T00:20:00Z'), stop(2, '2026-10-21T00:10:00Z')],
      segments: [[{ latitude: 6.24, longitude: -75.59, recordedAt: '2026-10-21T00:00:00Z' },
        { latitude: 6.25, longitude: -75.58, recordedAt: '2026-10-21T00:01:00Z' }],
        [{ latitude: 6.26, longitude: -75.57, recordedAt: '2026-10-21T00:20:00Z' }]] })
    const view = deliveryRouteHistory(detail)
    expect(view.source).toBe('gps')
    expect(view.stops).toBe(detail.stops)
    expect(view.estimatedPath).toEqual([])
    expect(view.caption).toContain('tramos sin evidencia quedan separados')
  })

  it('requires two usable points and does not infer branch times that contradict delivery times', () => {
    const stops = [stop(1, '2026-10-21T00:10:00Z')]
    expect(deliveryRouteHistory(route({ stops })).estimatedPath).toHaveLength(3)
    expect(deliveryRouteHistory(route({ stops, branchLatitude: null })).source).toBe('destinations')
    expect(deliveryRouteHistory(route({ stops, departedAtUtc: '2026-10-21T00:30:00Z', completedAtUtc: '2026-10-21T00:05:00Z' })).source).toBe('destinations')
    expect(deliveryRouteHistory(route({ stops: [stop(1, '2026-10-21T00:10:00Z', 0), stop(2, '2026-10-21T00:15:00Z')], branchLatitude: null })).estimatedPath.map(p => p.latitude)).toEqual([0, 6.25])
  })
})
