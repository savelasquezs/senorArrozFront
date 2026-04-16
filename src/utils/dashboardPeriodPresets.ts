/**
 * Presets de periodo reutilizables para dashboards (gráficas, KPIs por rango, etc.).
 * Calendario alineado a la zona de negocio (America/Bogotá) vía dashboardDateUtils.
 */

import {
	defaultDateRangeLastFortnight,
	defaultDateRangeLastMonth,
	defaultDateRangeThisFortnight,
	defaultDateRangeThisMonth,
	defaultDateRangeThisYear,
	defaultDateRangeToday,
	defaultDateRangeYesterday,
	startOfDay,
} from '@/components/dashboard/dashboardDateUtils'

export type DashboardPeriodPresetId =
	| 'today'
	| 'yesterday'
	| 'this_fortnight'
	| 'last_fortnight'
	| 'this_month'
	| 'last_month'
	| 'this_year'
	| 'custom'

export interface DashboardPeriodPresetOption {
	id: DashboardPeriodPresetId
	/** Etiqueta corta para chips / select */
	label: string
}

/** Opciones fijas (el preset `custom` se combina con el date picker). */
export const DASHBOARD_PERIOD_PRESET_OPTIONS: DashboardPeriodPresetOption[] = [
	{ id: 'today', label: 'Hoy' },
	{ id: 'yesterday', label: 'Ayer' },
	{ id: 'this_fortnight', label: 'Esta quincena' },
	{ id: 'last_fortnight', label: 'Quincena pasada' },
	{ id: 'this_month', label: 'Este mes' },
	{ id: 'last_month', label: 'Mes pasado' },
	{ id: 'this_year', label: 'Este año' },
]

export interface DashboardPeriodValue {
	presetId: DashboardPeriodPresetId
	/** Inicio y fin inclusive (00:00 del primer y último día en zona de negocio). */
	range: [Date, Date]
}

/**
 * Quincena calendario: 1–15 y 16–fin de mes (zona de negocio).
 */
export function getThisFortnightRange(ref: Date = new Date()): [Date, Date] {
	return defaultDateRangeThisFortnight(ref)
}

export function getLastFortnightRange(ref: Date = new Date()): [Date, Date] {
	return defaultDateRangeLastFortnight(ref)
}

/**
 * Resuelve el rango [inicio, fin] para un preset. Para `custom`, usa `customRange`.
 */
export function getDateRangeForPreset(
	preset: DashboardPeriodPresetId,
	now: Date = new Date(),
	customRange?: [Date, Date] | null,
): [Date, Date] {
	switch (preset) {
		case 'today':
			return defaultDateRangeToday(now)
		case 'yesterday':
			return defaultDateRangeYesterday(now)
		case 'this_fortnight':
			return defaultDateRangeThisFortnight(now)
		case 'last_fortnight':
			return defaultDateRangeLastFortnight(now)
		case 'this_month':
			return defaultDateRangeThisMonth(now)
		case 'last_month':
			return defaultDateRangeLastMonth(now)
		case 'this_year':
			return defaultDateRangeThisYear(now)
		case 'custom': {
			if (customRange?.[0] && customRange[1]) {
				return [startOfDay(customRange[0]), startOfDay(customRange[1])]
			}
			return defaultDateRangeToday(now)
		}
		default:
			return defaultDateRangeToday(now)
	}
}

export function defaultDashboardPeriodThisMonth(now: Date = new Date()): DashboardPeriodValue {
	const range = getDateRangeForPreset('this_month', now)
	return { presetId: 'this_month', range }
}

/** Días calendario entre dos fechas (inclusive), asumiendo ya normalizadas en zona de negocio. */
export function dayCountInclusive(from: Date, to: Date): number {
	const s = startOfDay(from).getTime()
	const e = startOfDay(to).getTime()
	if (e < s) return 0
	return Math.round((e - s) / 86400000) + 1
}
