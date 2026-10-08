import type { DeliveryIncidentDeviceEventEvidence, DeliveryPlaybackStay } from '@/services/MainAPI/deliveryTrackingIncidentsApi'

/** A label is not evidence. Keep old wire types compatible without implying
 * that an API timeout proves loss of Internet or a manual user action. */
export function trackingEventLabel(event: Pick<DeliveryIncidentDeviceEventEvidence, 'eventType' | 'details'>): string {
  const fields = new Map((event.details || '').split(';').map((value): [string, string] => {
    const index = value.indexOf('=')
    return index < 0 ? [value, ''] : [value.slice(0, index), value.slice(index + 1)]
  }))
  const source = fields.get('source')
  if (event.eventType === 'internet_lost') return source === 'android_network' ? 'Sin red activa reportada por Android' : 'Sin comunicación con el servidor'
  if (event.eventType === 'internet_recovered') return source === 'android_network' ? 'Red disponible reportada por Android' : 'Comunicación recuperada'
  if (event.eventType === 'gps_disabled') return fields.get('evidence_version') === '2' && source === 'android_state'
    ? 'Ubicación desactivada reportada por Android' : 'Reporte antiguo de GPS: no verificado'
  if (event.eventType === 'location_permission_revoked') return fields.get('evidence_version') === '2' && source === 'android_state'
    ? 'Permisos de ubicación insuficientes (Android)' : 'Reporte antiguo de permisos: no verificado'
  if (event.eventType === 'app_stopped') {
    if (source === 'android_exit_info' && fields.get('exit_reason') === '10' && Number(fields.get('sdk')) >= 34)
      return 'Detención solicitada por el usuario, reportada por Android'
    return fields.get('cause') === 'technical' ? 'Terminación técnica del proceso' : 'Servicio interrumpido: causa desconocida'
  }
  return ({ gps_enabled: 'Ubicación recuperada', location_permission_recovered: 'Permisos recuperados',
    airplane_mode_enabled: 'Modo avión activado', airplane_mode_disabled: 'Modo avión desactivado',
    wifi_disabled: 'Wi-Fi desactivado (no demuestra pérdida de Internet)', wifi_enabled: 'Wi-Fi activado',
    device_restarted: 'Dispositivo reiniciado', battery_low: 'Batería baja',
    location_service_restarted: 'Servicio reiniciado; motivo no confirmado', automatic_closure: 'Cierre automático',
    total_settlement: 'Cierre por liquidación', tracking_started: 'Seguimiento iniciado', tracking_stopped: 'Seguimiento detenido',
  } as Record<string, string>)[event.eventType] || event.eventType.replace(/_/g, ' ')
}

/** Clock/playback movement can never exceed the duration supported by GPS. */
export function supportedStayDuration(stay: Pick<DeliveryPlaybackStay, 'startedAt' | 'durationSeconds'>, playhead?: number): number {
  const supported = Math.max(0, Number.isFinite(stay.durationSeconds) ? Math.floor(stay.durationSeconds) : 0)
  if (playhead == null) return supported
  const elapsed = Math.floor((playhead - Date.parse(stay.startedAt)) / 1000)
  return Number.isFinite(elapsed) ? Math.max(0, Math.min(supported, elapsed)) : 0
}

export interface TrackingAlertNotification { alertId: number; branchId: number; deliverymanId: number; title: string; message: string }
export function createTrackingAlertDeduplicator() {
  const seen = new Set<string>()
  return (event: TrackingAlertNotification, identity: string): boolean => {
    if (!Number.isSafeInteger(event?.alertId) || event.alertId < 1 || !Number.isSafeInteger(event.branchId)) return false
    const key = `${identity}:${event.branchId}:${event.alertId}`
    if (seen.has(key)) return false
    seen.add(key)
    if (seen.size > 500) seen.delete(seen.values().next().value!)
    return true
  }
}
