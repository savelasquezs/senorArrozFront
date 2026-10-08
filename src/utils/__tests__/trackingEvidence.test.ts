import { describe, expect, it } from 'vitest'
import { createTrackingAlertDeduplicator, supportedStayDuration, trackingEventLabel } from '../trackingEvidence'

describe('tracking evidence', () => {
  it('does not extend a stay with the browser clock or a late playhead', () => {
    const stay = { startedAt: '2026-10-08T15:00:00Z', durationSeconds: 600 }
    expect(supportedStayDuration(stay, Date.parse('2026-10-08T16:00:00Z'))).toBe(600)
    expect(supportedStayDuration(stay, Date.parse('2026-10-08T15:05:00Z'))).toBe(300)
    expect(supportedStayDuration(stay, Date.parse('2026-10-08T14:55:00Z'))).toBe(0)
    expect(supportedStayDuration(stay)).toBe(600)
  })
  it('does not label transport timeouts as Internet loss', () => {
    expect(trackingEventLabel({ eventType: 'internet_lost', details: 'source=api_transport' })).toBe('Sin comunicación con el servidor')
    expect(trackingEventLabel({ eventType: 'internet_lost', details: null })).toBe('Sin comunicación con el servidor')
    expect(trackingEventLabel({ eventType: 'internet_lost', details: 'source=android_network' })).toContain('Sin red activa')
  })
  it('does not accuse a manual stop based on ambiguous Android exit reasons', () => {
    const event = { eventType: 'app_stopped', details: 'source=android_exit_info;exit_reason=10;sdk=33' }
    expect(trackingEventLabel(event)).toContain('desconocida')
    expect(trackingEventLabel({ ...event, details: 'source=android_exit_info;exit_reason=10;sdk=34' })).toContain('solicitada por el usuario')
    expect(trackingEventLabel({ ...event, details: 'source=android_exit_info;exit_reason=11;sdk=35' })).toContain('desconocida')
  })
  it('marks old GPS reports unverified', () => {
    expect(trackingEventLabel({ eventType: 'gps_disabled', details: 'readFailed=true' })).toContain('no verificado')
  })
  it('deduplicates reconnect notifications without crossing accounts or branches', () => {
    const accept = createTrackingAlertDeduplicator()
    const event = { alertId: 1, branchId: 2, deliverymanId: 3, title: '', message: '' }
    expect(accept(event, 'admin-a')).toBe(true)
    expect(accept(event, 'admin-a')).toBe(false)
    expect(accept(event, 'admin-b')).toBe(true)
    expect(accept({ ...event, branchId: 4 }, 'admin-a')).toBe(true)
  })
})
