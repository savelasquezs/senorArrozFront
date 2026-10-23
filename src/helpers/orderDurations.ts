import { getStatusTimeFromRecord } from '@/composables/useFormatting'

export function orderDurations(statusTimes: Record<string, string>, prepareAt?: string | Date | null) {
    const ready = getStatusTimeFromRecord(statusTimes, 'ready')
    const delivered = getStatusTimeFromRecord(statusTimes, 'delivered')
    const completedAt = timestamp(ready) ?? timestamp(delivered)
    const scheduledAt = timestamp(prepareAt)
    const start = scheduledAt !== null && (completedAt === null || scheduledAt <= completedAt)
        ? prepareAt : getStatusTimeFromRecord(statusTimes, 'taken')
    return {
        preparation: elapsedMinutes(start, ready),
        delivery: elapsedMinutes(getStatusTimeFromRecord(statusTimes, 'on_the_way'), delivered),
        total: elapsedMinutes(start, delivered),
    }
}

function elapsedMinutes(start?: string | Date | null, end?: string | Date | null): number | null {
    const seconds = elapsedSeconds(start, end)
    return seconds !== null ? Math.floor(seconds / 60) : null
}

export function elapsedSeconds(start?: string | Date | null, end?: string | Date | null): number | null {
    const from = timestamp(start), to = timestamp(end)
    return from !== null && to !== null && to >= from ? Math.floor((to - from) / 1000) : null
}

export function formatElapsedDuration(start?: string | Date | null, end?: string | Date | null): string {
    const seconds = elapsedSeconds(start, end)
    return seconds === null ? 'No disponible' : `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

function timestamp(value?: string | Date | null): number | null {
    if (!value) return null
    const time = typeof value === 'string' ? Date.parse(value) : value.getTime()
    return Number.isFinite(time) ? time : null
}
