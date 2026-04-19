import { TZDate } from '@date-fns/tz'
import { addDays, addMonths, endOfDay, format, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { DEFAULT_BUSINESS_TIMEZONE } from './constants'

export type BusinessTimeZone = string

function toTZDate(timeZone: BusinessTimeZone, instant: Date | number): TZDate {
	return typeof instant === 'number' ? TZDate.tz(timeZone, instant) : TZDate.tz(timeZone, instant)
}

function toInstant(date: Date | number | string): Date | number {
	return typeof date === 'string' ? new Date(date) : date
}

/** Claves `YYYY-MM-DD` / `YYYY-MM` como día calendario al mediodía en la zona (evita corrimiento UTC). */
function toZonedForDisplay(timeZone: BusinessTimeZone, instant: Date | number | string): TZDate {
	if (typeof instant === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(instant)) {
		const [y, mo, da] = instant.split('-').map(Number)
		return TZDate.tz(timeZone, y, mo - 1, da, 12, 0, 0, 0)
	}
	if (typeof instant === 'string' && /^\d{4}-\d{2}$/.test(instant)) {
		const [y, mo] = instant.split('-').map(Number)
		return TZDate.tz(timeZone, y, mo - 1, 1, 12, 0, 0, 0)
	}
	return toTZDate(timeZone, toInstant(instant))
}

/** API de calendario de negocio cerrada sobre una zona IANA (sin repetir `timeZone` en cada llamada). */
export type BusinessCalendar = {
	readonly timeZone: string
	startOfZonedDayAsDate: (instant: Date | number) => Date
	endOfZonedDayAsDate: (instant: Date | number) => Date
	formatYmd: (instant: Date | number | string) => string
	todayYmd: (nowMs?: number) => string
	zonedDayFromPickerLocalDate: (pickerDate: Date) => Date
	zonedCalendarParts: (instant: Date | number) => { year: number; monthIndex: number; day: number }
	nowInBusinessZone: (nowMs?: number) => TZDate
	startOfZonedMonthContaining: (instant: Date | number) => Date
	endOfZonedMonthContaining: (instant: Date | number) => Date
	addZonedDays: (instant: Date | number, amount: number) => Date
	addZonedCalendarMonths: (instant: Date | number, amount: number) => Date
	/** Solo fecha larga: "15 de junio de 2024" (sin hora). */
	formatDateLong: (instant: Date | number | string) => string
	/** Texto largo tipo listado con hora (es + pared horaria de negocio). */
	formatDateTime: (instant: Date | number | string) => string
	/** Fecha corta numérica dd/MM/yyyy. */
	formatDateShort: (instant: Date | number | string) => string
	/** Solo hora HH:mm en zona de negocio. */
	formatTime: (instant: Date | number | string) => string
	/** Hora 12 h con am/pm (tablas de pedidos). */
	formatTime12h: (instant: Date | number | string) => string
	/** Clave yyyy-MM en zona de negocio. */
	formatYearMonth: (instant: Date | number | string) => string
	/** Etiqueta tipo "lun, 14:30" en zona de negocio. */
	formatWeekdayShortTime: (instant: Date | number | string) => string
	/** Etiqueta tipo "15 jun" (día + mes corto). */
	formatDayShortMonth: (instant: Date | number | string) => string
	/** Etiqueta tipo "jun 2024". */
	formatShortMonthYear: (instant: Date | number | string) => string
	/** Fecha y hora cortas: dd/MM/yyyy, HH:mm (listados, transferencias). */
	formatDateTimeCompact: (instant: Date | number | string) => string
	/** Solo mes abreviado (etiquetas de eje). */
	formatMonthShort: (instant: Date | number | string) => string
	/** Día, mes corto y año: "15 jun 2024". */
	formatDayShortMonthYear: (instant: Date | number | string) => string
	/** Estilo "medio" + hora: "15 jun 2024, 14:30" (caja / historial). */
	formatDateMediumTime: (instant: Date | number | string) => string
	/** "lun, 15 abr" (ejes y mocks de evolución). */
	formatWeekdayDayShortMonth: (instant: Date | number | string) => string
	/** "15 abr" con día en dos cifras (ejes de gastos / rangos). */
	formatDayPaddedShortMonth: (instant: Date | number | string) => string
	/** "15 abr 2024" con día en dos cifras. */
	formatDayPaddedShortMonthYear: (instant: Date | number | string) => string
}

export function createBusinessCalendar(timeZone: BusinessTimeZone): BusinessCalendar {
	const tz = timeZone

	const zonedCalendarPartsInner = (instant: Date | number) => {
		const z = toTZDate(tz, instant)
		return { year: z.getFullYear(), monthIndex: z.getMonth(), day: z.getDate() }
	}

	const startOfZonedDayAsDateInner = (instant: Date | number): Date => {
		const z = toTZDate(tz, instant)
		const s = startOfDay(z)
		return new Date(s.getTime())
	}

	const endOfZonedDayAsDateInner = (instant: Date | number): Date => {
		const z = toTZDate(tz, instant)
		const e = endOfDay(z)
		return new Date(e.getTime())
	}

	const formatYmdInner = (instant: Date | number | string): string => {
		const d = toInstant(instant)
		return format(toTZDate(tz, d), 'yyyy-MM-dd')
	}

	return {
		get timeZone() {
			return tz
		},
		startOfZonedDayAsDate: startOfZonedDayAsDateInner,
		endOfZonedDayAsDate: endOfZonedDayAsDateInner,
		formatYmd: formatYmdInner,
		todayYmd: (nowMs = Date.now()) => formatYmdInner(nowMs),
		zonedDayFromPickerLocalDate: (pickerDate: Date) => {
			const y = pickerDate.getFullYear()
			const m = pickerDate.getMonth()
			const d = pickerDate.getDate()
			const z = TZDate.tz(tz, y, m, d, 0, 0, 0, 0)
			return new Date(z.getTime())
		},
		zonedCalendarParts: zonedCalendarPartsInner,
		nowInBusinessZone: (nowMs = Date.now()) => TZDate.tz(tz, nowMs),
		startOfZonedMonthContaining: (instant: Date | number) => {
			const { year, monthIndex } = zonedCalendarPartsInner(instant)
			const z = TZDate.tz(tz, year, monthIndex, 1, 0, 0, 0, 0)
			return new Date(startOfDay(z).getTime())
		},
		endOfZonedMonthContaining: (instant: Date | number) => {
			const { year, monthIndex } = zonedCalendarPartsInner(instant)
			const zLast = TZDate.tz(tz, year, monthIndex + 1, 0, 0, 0, 0, 0)
			return new Date(endOfDay(zLast).getTime())
		},
		addZonedDays: (instant: Date | number, amount: number) => {
			const start = startOfZonedDayAsDateInner(instant)
			const z = toTZDate(tz, start)
			const moved = addDays(z, amount)
			return new Date(startOfDay(moved).getTime())
		},
		addZonedCalendarMonths: (instant: Date | number, amount: number) => {
			const z = toTZDate(tz, instant)
			const moved = addMonths(z, amount)
			const y = moved.getFullYear()
			const m = moved.getMonth()
			const first = TZDate.tz(tz, y, m, 1, 0, 0, 0, 0)
			return new Date(startOfDay(first).getTime())
		},
		formatDateLong: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, "d 'de' MMMM 'de' yyyy", { locale: es })
		},
		formatDateTime: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
		},
		formatDateShort: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'dd/MM/yyyy', { locale: es })
		},
		formatTime: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'HH:mm', { locale: es })
		},
		formatTime12h: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'hh:mm a', { locale: es })
		},
		formatYearMonth: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'yyyy-MM', { locale: es })
		},
		formatWeekdayShortTime: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'EEE, HH:mm', { locale: es })
		},
		formatDayShortMonth: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'd MMM', { locale: es })
		},
		formatShortMonthYear: (instant: Date | number | string) => {
			const z = toZonedForDisplay(tz, instant)
			return format(z, 'MMM yyyy', { locale: es })
		},
		formatDateTimeCompact: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'dd/MM/yyyy, HH:mm', { locale: es })
		},
		formatMonthShort: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'MMM', { locale: es })
		},
		formatDayShortMonthYear: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'd MMM yyyy', { locale: es })
		},
		formatDateMediumTime: (instant: Date | number | string) => {
			const d = toInstant(instant)
			const z = toTZDate(tz, d)
			return format(z, 'd MMM yyyy, HH:mm', { locale: es })
		},
		formatWeekdayDayShortMonth: (instant: Date | number | string) => {
			const z = toZonedForDisplay(tz, instant)
			return format(z, 'EEE, d MMM', { locale: es })
		},
		formatDayPaddedShortMonth: (instant: Date | number | string) => {
			const z = toZonedForDisplay(tz, instant)
			return format(z, 'dd MMM', { locale: es })
		},
		formatDayPaddedShortMonthYear: (instant: Date | number | string) => {
			const z = toZonedForDisplay(tz, instant)
			return format(z, 'dd MMM yyyy', { locale: es })
		},
	}
}

/** Calendario por defecto (America/Bogota). Preferir este objeto en código nuevo. */
export const defaultBusinessCalendar = createBusinessCalendar(DEFAULT_BUSINESS_TIMEZONE)

function withCalendar<T>(timeZone: BusinessTimeZone | undefined, fn: (c: BusinessCalendar) => T): T {
	return timeZone != null ? fn(createBusinessCalendar(timeZone)) : fn(defaultBusinessCalendar)
}

/** @deprecated Preferir `defaultBusinessCalendar.startOfZonedDayAsDate` o `createBusinessCalendar(tz)`. */
export function startOfZonedDayAsDate(instant: Date | number, timeZone?: BusinessTimeZone): Date {
	return withCalendar(timeZone, (c) => c.startOfZonedDayAsDate(instant))
}

/** @deprecated Preferir `defaultBusinessCalendar.endOfZonedDayAsDate`. */
export function endOfZonedDayAsDate(instant: Date | number, timeZone?: BusinessTimeZone): Date {
	return withCalendar(timeZone, (c) => c.endOfZonedDayAsDate(instant))
}

/** @deprecated Preferir `defaultBusinessCalendar.formatYmd`. */
export function formatYmd(instant: Date | number | string, timeZone?: BusinessTimeZone): string {
	return withCalendar(timeZone, (c) => c.formatYmd(instant))
}

/** @deprecated Preferir `defaultBusinessCalendar.todayYmd`. */
export function todayYmd(nowMs: number = Date.now(), timeZone?: BusinessTimeZone): string {
	return withCalendar(timeZone, (c) => c.todayYmd(nowMs))
}

/** @deprecated Preferir `defaultBusinessCalendar.zonedDayFromPickerLocalDate`. */
export function zonedDayFromPickerLocalDate(pickerDate: Date, timeZone?: BusinessTimeZone): Date {
	return withCalendar(timeZone, (c) => c.zonedDayFromPickerLocalDate(pickerDate))
}

/** @deprecated Preferir `defaultBusinessCalendar.zonedCalendarParts`. */
export function zonedCalendarParts(instant: Date | number, timeZone?: BusinessTimeZone) {
	return withCalendar(timeZone, (c) => c.zonedCalendarParts(instant))
}

/** @deprecated Preferir `defaultBusinessCalendar.nowInBusinessZone`. */
export function nowInBusinessZone(nowMs: number = Date.now(), timeZone?: BusinessTimeZone): TZDate {
	return withCalendar(timeZone, (c) => c.nowInBusinessZone(nowMs))
}

/** @deprecated Preferir `defaultBusinessCalendar.startOfZonedMonthContaining`. */
export function startOfZonedMonthContaining(instant: Date | number, timeZone?: BusinessTimeZone): Date {
	return withCalendar(timeZone, (c) => c.startOfZonedMonthContaining(instant))
}

/** @deprecated Preferir `defaultBusinessCalendar.endOfZonedMonthContaining`. */
export function endOfZonedMonthContaining(instant: Date | number, timeZone?: BusinessTimeZone): Date {
	return withCalendar(timeZone, (c) => c.endOfZonedMonthContaining(instant))
}

/** @deprecated Preferir `defaultBusinessCalendar.addZonedDays`. */
export function addZonedDays(instant: Date | number, amount: number, timeZone?: BusinessTimeZone): Date {
	return withCalendar(timeZone, (c) => c.addZonedDays(instant, amount))
}

/** @deprecated Preferir `defaultBusinessCalendar.addZonedCalendarMonths`. */
export function addZonedCalendarMonths(instant: Date | number, amount: number, timeZone?: BusinessTimeZone): Date {
	return withCalendar(timeZone, (c) => c.addZonedCalendarMonths(instant, amount))
}
