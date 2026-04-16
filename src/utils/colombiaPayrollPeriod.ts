import { DEFAULT_BUSINESS_TIMEZONE } from '@/utils/datetime/constants'

/** Fecha calendario Colombia (America/Bogota). */
export function getColombiaYmdParts(): { y: number; m: number; d: number } {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: DEFAULT_BUSINESS_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
	const parts = fmt.formatToParts(new Date())
	const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
	return { y: n('year'), m: n('month'), d: n('day') }
}

export function toYmd(y: number, m: number, d: number): string {
	return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Último día del mes calendario (1–12). */
export function daysInCalendarMonth(y: number, month: number): number {
	return new Date(y, month, 0).getDate()
}

/** Quincena actual en Colombia: 1–15 o 16–fin. */
export function currentBiweekRangeYmd(): { from: string; to: string } {
	const { y, m, d } = getColombiaYmdParts()
	if (d <= 15) {
		return { from: toYmd(y, m, 1), to: toYmd(y, m, 15) }
	}
	const last = daysInCalendarMonth(y, m)
	return { from: toYmd(y, m, 16), to: toYmd(y, m, last) }
}

/** Mes calendario actual en Colombia. */
export function currentMonthRangeYmd(): { from: string; to: string } {
	const { y, m } = getColombiaYmdParts()
	const last = daysInCalendarMonth(y, m)
	return { from: toYmd(y, m, 1), to: toYmd(y, m, last) }
}
