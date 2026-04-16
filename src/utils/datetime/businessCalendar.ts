import { TZDate } from '@date-fns/tz'
import { addDays, addMonths, endOfDay, format, startOfDay } from 'date-fns'
import { DEFAULT_BUSINESS_TIMEZONE } from './constants'

export type BusinessTimeZone = string

function toTZDate(timeZone: BusinessTimeZone, instant: Date | number): TZDate {
	return typeof instant === 'number' ? TZDate.tz(timeZone, instant) : TZDate.tz(timeZone, instant)
}

/** Instante UTC correspondiente a las 00:00:00 del día calendario de `instant` en `timeZone`. */
export function startOfZonedDayAsDate(
	instant: Date | number,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): Date {
	const z = toTZDate(timeZone, instant)
	const s = startOfDay(z)
	return new Date(s.getTime())
}

/** Instante UTC correspondiente al último ms del día calendario de `instant` en `timeZone`. */
export function endOfZonedDayAsDate(
	instant: Date | number,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): Date {
	const z = toTZDate(timeZone, instant)
	const e = endOfDay(z)
	return new Date(e.getTime())
}

/** `YYYY-MM-DD` del calendario en `timeZone` para el instante dado. */
export function formatYmd(
	instant: Date | number | string,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): string {
	const d = typeof instant === 'string' ? new Date(instant) : instant
	return format(toTZDate(timeZone, d), 'yyyy-MM-dd')
}

/** “Hoy” en `timeZone` como `YYYY-MM-DD`. */
export function todayYmd(
	nowMs: number = Date.now(),
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): string {
	return formatYmd(nowMs, timeZone)
}

/**
 * El datepicker devuelve un `Date` a medianoche **local**. Tomamos año/mes/día de ese valor
 * como día calendario en la zona de negocio (misma etiqueta que ve el usuario en la celda).
 */
export function zonedDayFromPickerLocalDate(
	pickerDate: Date,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): Date {
	const y = pickerDate.getFullYear()
	const m = pickerDate.getMonth()
	const d = pickerDate.getDate()
	const z = TZDate.tz(timeZone, y, m, d, 0, 0, 0, 0)
	return new Date(z.getTime())
}

/** Partes calendario (en `timeZone`) del instante, para aritmética de mes/año. */
export function zonedCalendarParts(
	instant: Date | number,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): { year: number; monthIndex: number; day: number } {
	const z = toTZDate(timeZone, instant)
	return { year: z.getFullYear(), monthIndex: z.getMonth(), day: z.getDate() }
}

/** “Ahora” como `TZDate` en la zona de negocio (útil con `date-fns`). */
export function nowInBusinessZone(
	nowMs: number = Date.now(),
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): TZDate {
	return TZDate.tz(timeZone, nowMs)
}

/** Primer día del mes calendario en `timeZone` que contiene `instant`, a 00:00 en esa zona. */
export function startOfZonedMonthContaining(
	instant: Date | number,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): Date {
	const { year, monthIndex } = zonedCalendarParts(instant, timeZone)
	const z = TZDate.tz(timeZone, year, monthIndex, 1, 0, 0, 0, 0)
	return new Date(startOfDay(z).getTime())
}

/** Último instante del último día del mes calendario en `timeZone` que contiene `instant`. */
export function endOfZonedMonthContaining(
	instant: Date | number,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): Date {
	const { year, monthIndex } = zonedCalendarParts(instant, timeZone)
	const zLast = TZDate.tz(timeZone, year, monthIndex + 1, 0, 0, 0, 0, 0)
	return new Date(endOfDay(zLast).getTime())
}

/** Suma días al día calendario en `timeZone` que contiene `instant` (00:00 en zona). */
export function addZonedDays(
	instant: Date | number,
	amount: number,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): Date {
	const start = startOfZonedDayAsDate(instant, timeZone)
	const z = toTZDate(timeZone, start)
	const moved = addDays(z, amount)
	return new Date(startOfDay(moved).getTime())
}

/** Suma meses anclado al día 1 del mes resultante en `timeZone` (patrón “primer día del mes”). */
export function addZonedCalendarMonths(
	instant: Date | number,
	amount: number,
	timeZone: BusinessTimeZone = DEFAULT_BUSINESS_TIMEZONE,
): Date {
	const z = toTZDate(timeZone, instant)
	const moved = addMonths(z, amount)
	const y = moved.getFullYear()
	const m = moved.getMonth()
	const first = TZDate.tz(timeZone, y, m, 1, 0, 0, 0, 0)
	return new Date(startOfDay(first).getTime())
}
