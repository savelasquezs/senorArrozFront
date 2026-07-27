import { computed, onUnmounted, ref } from 'vue'
import { TZDate } from '@date-fns/tz'
import type {
  DeliveryPlaybackDeliveryman,
  DeliveryPlaybackEvent,
  DeliveryPlaybackPoint,
  DeliveryTrackingIncidentDetail,
} from '@/services/MainAPI/deliveryTrackingIncidentsApi'

const COLOMBIA_TIMEZONE = 'America/Bogota'
const RECOVERY_EVENTS = new Set([
  'gps_enabled',
  'location_permission_recovered',
  'location_service_restarted',
  'internet_recovered',
  'tracking_started',
])
const INVALID_LOCATION_EVENTS = new Set([
  'gps_disabled',
  'location_permission_revoked',
  'tracking_stopped',
  'app_stopped',
])

export interface PlaybackStay {
  start: number
  end: number
  latitude: number
  longitude: number
}

export function colombiaDateTimeLocalToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) throw new Error('Fecha y hora inválida.')
  const local = TZDate.tz(
    COLOMBIA_TIMEZONE,
    Number(match[1]), Number(match[2]) - 1, Number(match[3]),
    Number(match[4]), Number(match[5]), Number(match[6] || 0),
  )
  return new Date(local.getTime()).toISOString()
}

export function isoToColombiaDateTimeLocal(value: string | number): string {
  const date = TZDate.tz(COLOMBIA_TIMEZONE, typeof value === 'number' ? value : new Date(value).getTime())
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isRecoveredPoint(point: DeliveryPlaybackPoint, incident: DeliveryTrackingIncidentDetail) {
  if (incident.incidentType !== 'location_disabled') return true
  return point.gpsEnabled === true
}

export function calculateIncidentPlaybackRange(
  incident: DeliveryTrackingIncidentDetail,
  events: DeliveryPlaybackEvent[] = [],
  points: DeliveryPlaybackPoint[] = [],
  now = Date.now(),
) {
  const startedAt = new Date(incident.startedAt).getTime()
  let referenceEnd = new Date(incident.endedAt).getTime()
  let recoveryMissing = false
  if (incident.incidentType === 'location_disabled') {
    const eventRecovery = events
      .filter(event => RECOVERY_EVENTS.has(event.eventType) && new Date(event.recordedAt).getTime() >= startedAt)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())[0]
    const pointRecovery = points
      .filter(point => isRecoveredPoint(point, incident) && new Date(point.recordedAt).getTime() >= startedAt)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())[0]
    if (eventRecovery) referenceEnd = new Date(eventRecovery.recordedAt).getTime()
    else if (pointRecovery) referenceEnd = new Date(pointRecovery.recordedAt).getTime()
    else if (!incident.evidenceComplete) {
      referenceEnd = Math.min(now, startedAt + 24 * 60 * 60 * 1000)
      recoveryMissing = true
    }
  }
  return {
    from: startedAt - 5 * 60 * 1000,
    to: Math.min(referenceEnd + 5 * 60 * 1000, startedAt + 24 * 60 * 60 * 1000),
    recoveryAt: recoveryMissing ? null : referenceEnd,
    recoveryMissing,
  }
}

export function haversineMeters(a: DeliveryPlaybackPoint, b: DeliveryPlaybackPoint) {
  const radius = 6_371_000
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLon = (b.longitude - a.longitude) * rad
  const lat1 = a.latitude * rad
  const lat2 = b.latitude * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function detectStays(points: DeliveryPlaybackPoint[], radius = 30, minimumMs = 60_000): PlaybackStay[] {
  const result: PlaybackStay[] = []
  let start = 0
  for (let index = 1; index <= points.length; index++) {
    const first = points[start]
    const point = points[index]
    const tolerance = point && first
      ? radius + Math.min(50, Math.max(first.accuracyMeters || 0, point.accuracyMeters || 0))
      : radius
    if (point && first && haversineMeters(first, point) <= tolerance) continue
    const last = points[index - 1]
    if (first && last && new Date(last.recordedAt).getTime() - new Date(first.recordedAt).getTime() >= minimumMs) {
      result.push({ start: new Date(first.recordedAt).getTime(), end: new Date(last.recordedAt).getTime(), latitude: first.latitude, longitude: first.longitude })
    }
    start = index
  }
  return result
}

export function gapThreshold(points: DeliveryPlaybackPoint[]) {
  const intervals = points.slice(1).map((point, index) =>
    new Date(point.recordedAt).getTime() - new Date(points[index]!.recordedAt).getTime())
    .filter(value => value > 0).sort((a, b) => a - b)
  const median = intervals.length ? intervals[Math.floor(intervals.length / 2)]! : 0
  return Math.max(5 * 60_000, median * 3)
}

export function hasTechnicalGap(
  previous: DeliveryPlaybackPoint,
  point: DeliveryPlaybackPoint,
  events: DeliveryPlaybackEvent[],
  threshold: number,
) {
  const from = new Date(previous.recordedAt).getTime()
  const to = new Date(point.recordedAt).getTime()
  return to - from > threshold || events.some(event => {
    const time = new Date(event.recordedAt).getTime()
    return time >= from && time <= to && INVALID_LOCATION_EVENTS.has(event.eventType)
  })
}

export function useDeliveryRoutePlayback(start: () => number, end: () => number) {
  const isPlaying = ref(false)
  const currentTimestamp = ref(start())
  const playbackRate = ref(10)
  const followEnabled = ref(true)
  let frame: number | null = null
  let lastFrame = 0

  const duration = computed(() => Math.max(0, end() - start()))
  const progress = computed(() => duration.value ? (currentTimestamp.value - start()) / duration.value : 0)
  const stopFrame = () => {
    if (frame != null) cancelAnimationFrame(frame)
    frame = null
  }
  const pause = () => {
    isPlaying.value = false
    stopFrame()
  }
  const tick = (time: number) => {
    if (!isPlaying.value) return
    if (!lastFrame) lastFrame = time
    currentTimestamp.value = Math.min(end(), currentTimestamp.value + (time - lastFrame) * playbackRate.value)
    lastFrame = time
    if (currentTimestamp.value >= end()) pause()
    else frame = requestAnimationFrame(tick)
  }
  const play = () => {
    if (currentTimestamp.value >= end()) currentTimestamp.value = start()
    if (isPlaying.value) return
    isPlaying.value = true
    lastFrame = 0
    frame = requestAnimationFrame(tick)
  }
  const seekTo = (timestamp: number) => {
    currentTimestamp.value = Math.max(start(), Math.min(end(), timestamp))
  }
  const seekBy = (milliseconds: number) => seekTo(currentTimestamp.value + milliseconds)
  const restart = () => { pause(); seekTo(start()) }
  const goToEnd = () => { pause(); seekTo(end()) }
  const togglePlayback = () => isPlaying.value ? pause() : play()
  const setPlaybackRate = (rate: number) => { playbackRate.value = rate }
  const reset = () => { pause(); currentTimestamp.value = start(); followEnabled.value = true }
  onUnmounted(pause)

  return {
    isPlaying, currentTimestamp, playbackRate, followEnabled, duration, progress,
    play, pause, togglePlayback, seekTo, seekBy,
    stepForward: () => seekBy(10_000),
    stepBackward: () => seekBy(-10_000),
    restart, goToEnd, setPlaybackRate, reset,
  }
}
