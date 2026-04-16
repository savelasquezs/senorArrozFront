import { TZDate } from '@date-fns/tz'
import type { LocalHour } from '@/types/common'
import { formatYmd } from '@/utils/datetime/businessCalendar'
import { DEFAULT_BUSINESS_TIMEZONE } from '@/utils/datetime/constants'

const COLOMBIA_TIMEZONE = DEFAULT_BUSINESS_TIMEZONE
const COLOMBIA_OFFSET = '-05:00'

export class DateTimeService {
	static addHours(time: LocalHour, hours: number): LocalHour {
		return { hours: time.hours + hours, minutes: time.minutes, seconds: time.seconds }
	}
	static localHourToDate(localHour: LocalHour, baseDate?: Date): Date {
		const ref = baseDate ?? new Date()
		const dateStr = formatYmd(ref, COLOMBIA_TIMEZONE)
		const h = String(localHour.hours).padStart(2, '0')
		const m = String(localHour.minutes).padStart(2, '0')
		const s = String(localHour.seconds).padStart(2, '0')
		const isoLocal = `${dateStr}T${h}:${m}:${s}${COLOMBIA_OFFSET}`
		return new Date(isoLocal)
	}

	static dateToLocalHour(date: Date): LocalHour {
		const z = TZDate.tz(COLOMBIA_TIMEZONE, date)
		return {
			hours: z.getHours(),
			minutes: z.getMinutes(),
			seconds: z.getSeconds(),
		}
	}
}
