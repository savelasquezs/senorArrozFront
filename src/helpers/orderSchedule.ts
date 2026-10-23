import { TZDate } from '@date-fns/tz'
import { defaultBusinessCalendar } from '@/utils/datetime'

export function orderScheduleDate(day: string, time: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null
    const [year, month, date] = day.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)
    const result = new Date(new TZDate(year!, month! - 1, date!, hours!, minutes!, 0, 0, defaultBusinessCalendar.timeZone).getTime())
    return defaultBusinessCalendar.formatYmd(result) === day && defaultBusinessCalendar.formatTime(result) === time ? result : null
}

export function suggestedOrderDelivery(prepareAt: Date): Date | null {
    const delivery = new Date(prepareAt.getTime() + 60 * 60 * 1000)
    return defaultBusinessCalendar.formatYmd(delivery) === defaultBusinessCalendar.formatYmd(prepareAt) ? delivery : null
}

export function orderScheduleError(prepareAt: Date | null, reservedFor: Date | null): string {
    if (!prepareAt || !reservedFor) return 'Indica la hora de preparación y de entrega.'
    if (defaultBusinessCalendar.formatYmd(prepareAt) !== defaultBusinessCalendar.formatYmd(reservedFor)) return 'La preparación y la entrega deben ser el mismo día.'
    if (reservedFor.getTime() - prepareAt.getTime() < 40 * 60 * 1000) return 'Deja al menos 40 minutos entre preparación y entrega.'
    return ''
}
