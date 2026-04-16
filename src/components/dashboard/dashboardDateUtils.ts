import { TZDate } from '@date-fns/tz'
import { startOfDay as dfStartOfDay } from 'date-fns'
import {
	addZonedCalendarMonths,
	addZonedDays,
	DEFAULT_BUSINESS_TIMEZONE,
	endOfZonedMonthContaining,
	startOfZonedDayAsDate,
	startOfZonedMonthContaining,
	zonedCalendarParts,
} from '@/utils/datetime'

const TZ = DEFAULT_BUSINESS_TIMEZONE

/** Inicio del día calendario en zona de negocio (America/Bogotá). */
export function startOfDay(d: Date): Date {
	return startOfZonedDayAsDate(d, TZ)
}

/** Rango por defecto: últimos `n` días inclusive (hoy = fin). */
export function defaultDateRangeLastDays(n: number, ref: Date | number = Date.now()): [Date, Date] {
	const end = startOfZonedDayAsDate(ref, TZ)
	const start = addZonedDays(end, -(n - 1), TZ)
	return [start, end]
}

/** Rango por defecto: solo el día en curso en zona de negocio. */
export function defaultDateRangeToday(ref: Date | number = Date.now()): [Date, Date] {
	const day = startOfZonedDayAsDate(ref, TZ)
	return [day, day]
}

/** Un solo día: ayer (calendario zona de negocio). */
export function defaultDateRangeYesterday(ref: Date | number = Date.now()): [Date, Date] {
	const todayStart = startOfZonedDayAsDate(ref, TZ)
	const y = addZonedDays(todayStart, -1, TZ)
	return [y, y]
}

/** Mes calendario en curso en zona de negocio: día 1 → último día del mes. */
export function defaultDateRangeThisMonth(ref: Date | number = Date.now()): [Date, Date] {
	const first = startOfZonedMonthContaining(ref, TZ)
	const last = endOfZonedMonthContaining(ref, TZ)
	return [startOfZonedDayAsDate(first, TZ), startOfZonedDayAsDate(last, TZ)]
}

/** Mes calendario anterior completo. */
export function defaultDateRangeLastMonth(ref: Date | number = Date.now()): [Date, Date] {
	const startThis = startOfZonedMonthContaining(ref, TZ)
	const startPrev = addZonedCalendarMonths(startThis, -1, TZ)
	const endPrev = endOfZonedMonthContaining(startPrev, TZ)
	return [startPrev, startOfZonedDayAsDate(endPrev, TZ)]
}

/**
 * Quincena en curso: días 1–15 o 16–último del mes (zona de negocio).
 */
export function defaultDateRangeThisFortnight(ref: Date | number = Date.now()): [Date, Date] {
	const { year, monthIndex, day } = zonedCalendarParts(ref, TZ)

	if (day <= 15) {
		const first = TZDate.tz(TZ, year, monthIndex, 1, 0, 0, 0, 0)
		const last = TZDate.tz(TZ, year, monthIndex, 15, 0, 0, 0, 0)
		return [new Date(dfStartOfDay(first).getTime()), new Date(dfStartOfDay(last).getTime())]
	}
	const first = TZDate.tz(TZ, year, monthIndex, 16, 0, 0, 0, 0)
	const last = TZDate.tz(TZ, year, monthIndex + 1, 0, 0, 0, 0, 0)
	return [new Date(dfStartOfDay(first).getTime()), new Date(dfStartOfDay(last).getTime())]
}

/**
 * Quincena anterior: si estamos en 1ª quincena, la 2ª del mes pasado; si en 2ª, la 1ª del mismo mes.
 */
export function defaultDateRangeLastFortnight(ref: Date | number = Date.now()): [Date, Date] {
	const { year, monthIndex, day } = zonedCalendarParts(ref, TZ)

	if (day <= 15) {
		const first = TZDate.tz(TZ, year, monthIndex - 1, 16, 0, 0, 0, 0)
		const last = TZDate.tz(TZ, year, monthIndex, 0, 0, 0, 0, 0)
		return [new Date(dfStartOfDay(first).getTime()), new Date(dfStartOfDay(last).getTime())]
	}
	const first = TZDate.tz(TZ, year, monthIndex, 1, 0, 0, 0, 0)
	const last = TZDate.tz(TZ, year, monthIndex, 15, 0, 0, 0, 0)
	return [new Date(dfStartOfDay(first).getTime()), new Date(dfStartOfDay(last).getTime())]
}

/** Año calendario en curso (1 ene – 31 dic) en zona de negocio. */
export function defaultDateRangeThisYear(ref: Date | number = Date.now()): [Date, Date] {
	const { year } = zonedCalendarParts(ref, TZ)
	const first = TZDate.tz(TZ, year, 0, 1, 0, 0, 0, 0)
	const last = TZDate.tz(TZ, year, 11, 31, 0, 0, 0, 0)
	return [new Date(dfStartOfDay(first).getTime()), new Date(dfStartOfDay(last).getTime())]
}

/** Año calendario anterior completo. */
export function defaultDateRangeLastYear(ref: Date | number = Date.now()): [Date, Date] {
	const { year } = zonedCalendarParts(ref, TZ)
	const y = year - 1
	const first = TZDate.tz(TZ, y, 0, 1, 0, 0, 0, 0)
	const last = TZDate.tz(TZ, y, 11, 31, 0, 0, 0, 0)
	return [new Date(dfStartOfDay(first).getTime()), new Date(dfStartOfDay(last).getTime())]
}

/** Días calendario desde `from` hasta `to` inclusive (inicio de día en zona de negocio). Máximo `maxDays` por seguridad. */
export function daysInclusive(from: Date, to: Date, maxDays = 62): Date[] {
	const s = startOfZonedDayAsDate(from, TZ)
	const e = startOfZonedDayAsDate(to, TZ)
	if (e < s) return []

	const out: Date[] = []
	let cur = new Date(s.getTime())
	let guard = 0
	while (cur <= e && guard < maxDays) {
		out.push(new Date(cur.getTime()))
		cur = addZonedDays(cur, 1, TZ)
		guard++
	}
	return out
}

/**
 * Primer día de cada mes desde el mes de `from` hasta el de `to` (inclusive), en zona de negocio.
 */
export function monthsInclusive(from: Date, to: Date, maxMonths = 36): Date[] {
	const s = startOfZonedMonthContaining(from, TZ)
	const e = startOfZonedMonthContaining(to, TZ)
	if (e < s) return []

	const out: Date[] = []
	let cur = new Date(s.getTime())
	let guard = 0
	while (cur <= e && guard < maxMonths) {
		out.push(new Date(cur.getTime()))
		cur = addZonedCalendarMonths(cur, 1, TZ)
		guard++
	}
	return out
}

/**
 * Años enteros desde el año de `from` hasta el de `to` (inclusive), según calendario en zona de negocio.
 */
export function yearsInclusive(from: Date, to: Date, maxYears = 20): number[] {
	const y0 = zonedCalendarParts(from, TZ).year
	const y1 = zonedCalendarParts(to, TZ).year
	if (y1 < y0) return []

	const out: number[] = []
	for (let y = y0; y <= y1 && out.length < maxYears; y++) {
		out.push(y)
	}
	return out
}
