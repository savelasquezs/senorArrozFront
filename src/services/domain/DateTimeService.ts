import { TZDate } from '@date-fns/tz'
import type { LocalHour } from '@/types/common'
import { defaultBusinessCalendar } from '@/utils/datetime'

const COLOMBIA_OFFSET = '-05:00'

export class DateTimeService {
	static addHours(time: LocalHour, hours: number): LocalHour {
		return { hours: time.hours + hours, minutes: time.minutes, seconds: time.seconds }
	}
	static localHourToDate(localHour: LocalHour, baseDate?: Date): Date {
		const ref = baseDate ?? new Date()
		const dateStr = defaultBusinessCalendar.formatYmd(ref)
		const h = String(localHour.hours).padStart(2, '0')
		const m = String(localHour.minutes).padStart(2, '0')
		const s = String(localHour.seconds).padStart(2, '0')
		const isoLocal = `${dateStr}T${h}:${m}:${s}${COLOMBIA_OFFSET}`
		return new Date(isoLocal)
	}

	static dateToLocalHour(date: Date): LocalHour {
		const z = TZDate.tz(defaultBusinessCalendar.timeZone, date)
		return {
			hours: z.getHours(),
			minutes: z.getMinutes(),
			seconds: z.getSeconds(),
		}
	}
}
