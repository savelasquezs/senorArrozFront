import type { DeliveryRouteDetail, DeliveryRouteStatus } from '@/types/deliveryPerformance'
import { elapsedSeconds, formatElapsedDuration } from '@/helpers/orderDurations'

export function deliveryStopTiming(stop: DeliveryRouteDetail['stops'][number]) {
  const start = stop.onTheWayAtUtc ?? null
  return { start, duration: formatElapsedDuration(start, stop.deliveredAtUtc),
    reference: 'En camino → entrega del pedido' }
}

export function deliveryRouteTiming(detail: DeliveryRouteDetail) {
  const hasDeparture = detail.departedAtUtc != null && Number.isFinite(Date.parse(detail.departedAtUtc))
  const onTheWayTimes = detail.stops.filter(stop => elapsedSeconds(stop.onTheWayAtUtc, stop.deliveredAtUtc) !== null
    && elapsedSeconds(stop.onTheWayAtUtc, detail.completedAtUtc) !== null).map(stop => stop.onTheWayAtUtc!)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
  const start = hasDeparture ? detail.departedAtUtc : detail.startedAtUtc ?? onTheWayTimes[0] ?? null
  const pending = detail.status === 'returnPending' || detail.status === 'inProgress'
  return { start, duration: pending ? deliveryRouteStatusLabel(detail.status) : detail.returnIsInconsistent ? 'No disponible' : formatElapsedDuration(start, detail.completedAtUtc),
    description: pending ? 'Sin regreso registrado. Esta ruta no aporta duración completa ni SLA a los promedios.'
      : detail.returnIsInconsistent ? 'Regreso inconsistente: cierre fuera de la jornada. Excluido de los promedios de tiempo.' : 'Desde la salida hasta el regreso' }
}

export function deliveryRouteStatusLabel(status?: DeliveryRouteStatus, metSla?: boolean | null) {
  return status === 'returnPending' ? 'Regreso pendiente' : status === 'inProgress' ? 'En curso'
    : metSla === true ? 'A tiempo' : metSla === false ? 'Con retraso' : 'Sin SLA'
}

export function hasRouteCoordinates(latitude: number | null, longitude: number | null): boolean {
  return latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

const timestamp = (value: string | null) => value ? Date.parse(value) : NaN

export function deliveryRouteHistory(detail: DeliveryRouteDetail) {
  const hasGps = detail.segments.some(segment => segment.length > 1)
  const stops = hasGps ? detail.stops : [...detail.stops].sort((a, b) => {
    const aTime = timestamp(a.deliveredAtUtc)
    const bTime = timestamp(b.deliveredAtUtc)
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime || a.stopSequence - b.stopSequence
    if (Number.isFinite(aTime)) return -1
    if (Number.isFinite(bTime)) return 1
    return a.stopSequence - b.stopSequence
  }).map((stop, index) => ({ ...stop, stopSequence: index + 1 }))
  const estimatedPath: Array<{ latitude: number; longitude: number }> = []
  const itinerary: string[] = []
  if (!hasGps) {
    const timedStops = stops.filter(stop => Number.isFinite(timestamp(stop.deliveredAtUtc)) && hasRouteCoordinates(stop.latitude, stop.longitude))
    const branch = { latitude: detail.branchLatitude!, longitude: detail.branchLongitude! }
    const hasBranch = hasRouteCoordinates(detail.branchLatitude, detail.branchLongitude)
    if (timedStops.length) {
      if (hasBranch && (detail.departedAtUtc == null || timestamp(detail.departedAtUtc) <= timestamp(timedStops[0]!.deliveredAtUtc))) {
        estimatedPath.push(branch)
        itinerary.push('Sucursal')
      }
      timedStops.forEach(stop => {
        estimatedPath.push({ latitude: stop.latitude!, longitude: stop.longitude! })
        itinerary.push(String(stop.stopSequence))
      })
      if (!detail.returnIsInconsistent && hasBranch && timestamp(detail.completedAtUtc) >= timestamp(timedStops[timedStops.length - 1]!.deliveredAtUtc)) {
        estimatedPath.push(branch)
        itinerary.push('Sucursal')
      }
    }
  }
  const source = hasGps ? 'gps' : estimatedPath.length > 1 ? 'estimated' : 'destinations'
  const label = source === 'gps' ? 'Recorrido GPS' : source === 'estimated' ? 'Recorrido estimado por entregas' : 'Destinos registrados'
  const caption = source === 'gps'
    ? `Cobertura GPS ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(detail.gpsCoveragePercent)} %. Los tramos sin evidencia quedan separados.`
    : source === 'estimated'
      ? 'Línea punteada según la hora de entrega. Une destinos con ubicación y hora válidas; no confirma las calles recorridas ni calcula kilómetros.'
      : 'Sin GPS ni datos suficientes para estimar el recorrido. Se muestran los destinos disponibles.'
  return { source, label, caption: detail.returnIsInconsistent ? `${caption} Regreso no confirmado: cierre fuera de la jornada.` : caption, stops, itinerary: source === 'estimated' ? itinerary.join(' → ') : '', estimatedPath: source === 'estimated' ? estimatedPath : [] }
}
