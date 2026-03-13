import type { LocalHour } from '@/types/common'

const COLOMBIA_TIMEZONE = 'America/Bogota'
const COLOMBIA_OFFSET = '-05:00'

export class DateTimeService {
    static addHours(time: LocalHour, hours: number): LocalHour {
        return { hours: time.hours + hours, minutes: time.minutes, seconds: time.seconds }
    }
    static localHourToDate(localHour: LocalHour, baseDate?: Date): Date {
        const ref = baseDate ?? new Date()
        const dateStr = ref.toLocaleDateString('en-CA', { timeZone: COLOMBIA_TIMEZONE }) // YYYY-MM-DD
        const h = String(localHour.hours).padStart(2, '0')
        const m = String(localHour.minutes).padStart(2, '0')
        const s = String(localHour.seconds).padStart(2, '0')
        const isoLocal = `${dateStr}T${h}:${m}:${s}${COLOMBIA_OFFSET}`
        return new Date(isoLocal)
    }

    static dateToLocalHour(date: Date): LocalHour {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: COLOMBIA_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })
        const parts = formatter.formatToParts(date)
        const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10)
        return { hours: get('hour'), minutes: get('minute'), seconds: get('second') }
    }
}