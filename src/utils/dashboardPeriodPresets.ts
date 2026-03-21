/**
 * Presets de periodo reutilizables para dashboards (gráficas, KPIs por rango, etc.).
 * No depende de date-fns: solo `Date` local.
 */

function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export type DashboardPeriodPresetId =
	| 'today'
	| 'yesterday'
	| 'this_fortnight'
	| 'last_fortnight'
	| 'this_month'
	| 'last_month'
	| 'this_year'
	| 'custom';

export interface DashboardPeriodPresetOption {
	id: DashboardPeriodPresetId;
	/** Etiqueta corta para chips / select */
	label: string;
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
];

export interface DashboardPeriodValue {
	presetId: DashboardPeriodPresetId;
	/** Inicio y fin inclusive (normalizados a 00:00 local). */
	range: [Date, Date];
}

function endOfCalendarMonth(ref: Date): Date {
	return new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
}

/**
 * Quincena calendario: 1–15 y 16–fin de mes (común en CO).
 */
export function getThisFortnightRange(ref: Date = new Date()): [Date, Date] {
	const y = ref.getFullYear();
	const m = ref.getMonth();
	const day = ref.getDate();
	if (day <= 15) {
		return [startOfDay(new Date(y, m, 1)), startOfDay(new Date(y, m, 15))];
	}
	const last = endOfCalendarMonth(ref);
	return [startOfDay(new Date(y, m, 16)), startOfDay(last)];
}

export function getLastFortnightRange(ref: Date = new Date()): [Date, Date] {
	const y = ref.getFullYear();
	const m = ref.getMonth();
	const day = ref.getDate();
	if (day <= 15) {
		const prevMonth = new Date(y, m - 1, 1);
		const lastPrev = endOfCalendarMonth(prevMonth);
		return [
			startOfDay(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 16)),
			startOfDay(lastPrev),
		];
	}
	return [startOfDay(new Date(y, m, 1)), startOfDay(new Date(y, m, 15))];
}

/**
 * Resuelve el rango [inicio, fin] para un preset. Para `custom`, usa `customRange`.
 */
export function getDateRangeForPreset(
	preset: DashboardPeriodPresetId,
	now: Date = new Date(),
	customRange?: [Date, Date] | null,
): [Date, Date] {
	const n = startOfDay(new Date(now));

	switch (preset) {
		case 'today':
			return [n, n];
		case 'yesterday': {
			const y = new Date(n);
			y.setDate(y.getDate() - 1);
			return [startOfDay(y), startOfDay(y)];
		}
		case 'this_fortnight':
			return getThisFortnightRange(n);
		case 'last_fortnight':
			return getLastFortnightRange(n);
		case 'this_month': {
			const start = startOfDay(new Date(n.getFullYear(), n.getMonth(), 1));
			const end = startOfDay(endOfCalendarMonth(n));
			return [start, end];
		}
		case 'last_month': {
			const firstThis = new Date(n.getFullYear(), n.getMonth(), 1);
			const lastPrev = new Date(firstThis);
			lastPrev.setDate(0);
			const start = startOfDay(new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1));
			return [start, startOfDay(lastPrev)];
		}
		case 'this_year': {
			const start = startOfDay(new Date(n.getFullYear(), 0, 1));
			const end = startOfDay(new Date(n.getFullYear(), 11, 31));
			return [start, end];
		}
		case 'custom': {
			if (customRange?.[0] && customRange[1]) {
				return [startOfDay(customRange[0]), startOfDay(customRange[1])];
			}
			return [n, n];
		}
		default:
			return [n, n];
	}
}

export function defaultDashboardPeriodThisMonth(now: Date = new Date()): DashboardPeriodValue {
	const range = getDateRangeForPreset('this_month', now);
	return { presetId: 'this_month', range };
}

/** Días calendario entre dos fechas (inclusive), asumiendo ya normalizadas. */
export function dayCountInclusive(from: Date, to: Date): number {
	const s = startOfDay(from).getTime();
	const e = startOfDay(to).getTime();
	if (e < s) return 0;
	return Math.round((e - s) / 86400000) + 1;
}
