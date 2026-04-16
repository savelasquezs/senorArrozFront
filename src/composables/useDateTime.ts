import { DEFAULT_BUSINESS_TIMEZONE } from '@/utils/datetime/constants'
import {
	addZonedCalendarMonths,
	addZonedDays,
	endOfZonedDayAsDate,
	endOfZonedMonthContaining,
	formatYmd,
	nowInBusinessZone,
	startOfZonedDayAsDate,
	startOfZonedMonthContaining,
	todayYmd,
	zonedCalendarParts,
	zonedDayFromPickerLocalDate,
	type BusinessTimeZone,
} from '@/utils/datetime/businessCalendar'

/**
 * Acceso unificado al calendario de negocio. `timeZone` fijo hoy; en el futuro puede leerse de la sucursal en Pinia.
 */
export function useDateTime(timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE) {
	return {
		timeZone,
		formatYmd: (instant: Date | number | string) => formatYmd(instant, timeZone),
		todayYmd: (nowMs?: number) => todayYmd(nowMs ?? Date.now(), timeZone),
		startOfZonedDayAsDate: (instant: Date | number) => startOfZonedDayAsDate(instant, timeZone),
		endOfZonedDayAsDate: (instant: Date | number) => endOfZonedDayAsDate(instant, timeZone),
		zonedDayFromPickerLocalDate: (pickerDate: Date) => zonedDayFromPickerLocalDate(pickerDate, timeZone),
		zonedCalendarParts: (instant: Date | number) => zonedCalendarParts(instant, timeZone),
		nowInBusinessZone: (nowMs?: number) => nowInBusinessZone(nowMs ?? Date.now(), timeZone),
		startOfZonedMonthContaining: (instant: Date | number) =>
			startOfZonedMonthContaining(instant, timeZone),
		endOfZonedMonthContaining: (instant: Date | number) =>
			endOfZonedMonthContaining(instant, timeZone),
		addZonedDays: (instant: Date | number, amount: number) => addZonedDays(instant, amount, timeZone),
		addZonedCalendarMonths: (instant: Date | number, amount: number) =>
			addZonedCalendarMonths(instant, amount, timeZone),
	}
}
