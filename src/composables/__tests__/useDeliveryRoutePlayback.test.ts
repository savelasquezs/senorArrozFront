import { describe, expect, it } from 'vitest'
import {
  calculateIncidentPlaybackRange,
  colombiaDateTimeLocalToIso,
  formatStayDuration,
  gapThreshold,
  hasTechnicalGap,
} from '@/composables/useDeliveryRoutePlayback'
import type { DeliveryPlaybackPoint, DeliveryTrackingIncidentDetail } from '@/services/MainAPI/deliveryTrackingIncidentsApi'

const point = (id: number, minute: number, latitude = 6.25, accuracy = 5): DeliveryPlaybackPoint => ({
  id, deliverymanId: 1, latitude, longitude: -75.58,
  recordedAt: `2026-07-26T17:${String(minute).padStart(2, '0')}:00Z`,
  syncedAt: `2026-07-26T17:${String(minute + 1).padStart(2, '0')}:00Z`,
  accuracyMeters: accuracy, headingDegrees: null, batteryLevelPercent: 70,
  internetAvailable: true, gpsEnabled: true, trackingMode: 'active_delivery',
  deliveryRouteId: 2, workSessionId: 3,
})

const incident = (complete = true): DeliveryTrackingIncidentDetail => ({
  id: 1, incidentType: 'location_disabled', branchId: 1, branchName: 'Centro',
  deliverymanId: 1, deliverymanName: 'Juan', workSessionId: 3, deliveryRouteId: 2,
  orderId: null, automaticClassification: null, classificationReason: null,
  finalClassification: null, reviewStatus: 'pending',
  startedAt: '2026-07-26T17:10:00Z', endedAt: '2026-07-26T17:20:00Z',
  isActive: false, pointCount: 0, durationSeconds: 600, centerLatitude: null, centerLongitude: null, radiusMeters: 0,
  averageAccuracyMeters: 0, distanceToBranchMeters: null, distanceToOrderMeters: null,
  orderAddress: null, orderLatitude: null, orderLongitude: null, orderStatus: null,
  adminNotes: null, deliverymanExplanation: null, reviewedByUserId: null,
  reviewedByUserName: null, reviewedAt: null, evidenceComplete: complete,
  locations: [], deviceEvents: [],
})

describe('delivery route playback utilities', () => {
  it('convierte datetime-local de Colombia a UTC sin doble conversión', () => {
    expect(colombiaDateTimeLocalToIso('2026-07-26T12:00')).toBe('2026-07-26T17:00:00.000Z')
  })

  it('usa la primera recuperación posterior al incidente', () => {
    const range = calculateIncidentPlaybackRange(incident(), [{
      id: 1, deliverymanId: 1, eventType: 'gps_enabled', recordedAt: '2026-07-26T17:17:00Z',
      syncedAt: '2026-07-26T17:18:00Z', batteryLevelPercent: null, internetAvailable: true,
      gpsEnabled: true, locationPermissionGranted: true, details: null, workSessionId: 3,
    }])
    expect(new Date(range.to).toISOString()).toBe('2026-07-26T17:22:00.000Z')
  })

  it('marca recuperación faltante y limita a 24 horas', () => {
    const range = calculateIncidentPlaybackRange(incident(false), [], [], new Date('2026-07-28T00:00:00Z').getTime())
    expect(range.recoveryMissing).toBe(true)
    expect(range.to - new Date(incident(false).startedAt).getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('formatea duraciones menores y mayores a una hora', () => {
    expect(formatStayDuration(65)).toBe('01:05')
    expect(formatStayDuration(3665)).toBe('01:01:05')
  })

  it('detecta huecos temporales y técnicos', () => {
    const first = point(1, 0)
    const second = point(2, 10)
    expect(gapThreshold([first, second])).toBe(1_800_000)
    expect(hasTechnicalGap(first, second, [{ id: 1, deliverymanId: 1, eventType: 'gps_disabled', recordedAt: '2026-07-26T17:05:00Z', syncedAt: '2026-07-26T17:05:01Z', batteryLevelPercent: null, internetAvailable: true, gpsEnabled: false, locationPermissionGranted: true, details: null, workSessionId: 3 }], gapThreshold([first, second]))).toBe(true)
  })
})
