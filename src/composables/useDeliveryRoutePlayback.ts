import { computed, onUnmounted, ref } from 'vue'
import { TZDate } from '@date-fns/tz'
import type {
  DeliveryPlaybackDeliveryman,
  DeliveryPlaybackEvent,
  DeliveryPlaybackPoint,
  DeliveryPlaybackStay,
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
  let referenceEnd = incident.endedAt ? new Date(incident.endedAt).getTime() : now
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
    to: Math.min(incident.isActive ? now : referenceEnd + 5 * 60 * 1000, startedAt + 24 * 60 * 60 * 1000),
    recoveryAt: recoveryMissing ? null : referenceEnd,
    recoveryMissing,
  }
}

export function formatStayDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60
  const minuteText = String(minutes).padStart(2, '0')
  const secondText = String(seconds).padStart(2, '0')
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${minuteText}:${secondText}`
    : `${minuteText}:${secondText}`
}

export function escapeMapHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function isPointInsideStay(point: DeliveryPlaybackPoint, stay: DeliveryPlaybackStay) {
  if (point.workSessionId !== stay.workSessionId) return false
  const pointTime = new Date(point.recordedAt).getTime()
  const endTime = stay.endedAt ? new Date(stay.endedAt).getTime() : Number.POSITIVE_INFINITY
  return pointTime >= new Date(stay.startedAt).getTime()
    && pointTime <= endTime
    && point.id >= stay.firstLocationId
    && (stay.isActive || point.id <= stay.lastLocationId)
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
