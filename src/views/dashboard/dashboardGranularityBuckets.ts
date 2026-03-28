/**
 * Pestañas de escala del sidebar según el periodo y agregación por quincena (1–15 / 16–fin).
 */
import type { SalesTimeSeriesBlock, OrdersPerHourBlock } from '@/components/dashboard/timeEvolution.types';
import type { DashboardPrincipalSalesVsExpensesApiResponse } from '@/services/MainAPI/dashboardApi';
import {
	daysInclusive,
	startOfDay,
	defaultDateRangeThisFortnight,
	defaultDateRangeLastFortnight,
} from '@/components/dashboard/dashboardDateUtils';
import type { DashboardTimeGranularity } from '@/views/dashboard/dashboardGlobalFilters';

export const GRANULARITY_TAB_LABELS: Record<DashboardTimeGranularity, string> = {
	day: 'Día',
	fortnight: 'Quincena',
	month: 'Mes',
	year: 'Año',
};

function rangesEqual(a: [Date, Date], b: [Date, Date]): boolean {
	return (
		startOfDay(a[0]).getTime() === startOfDay(b[0]).getTime() &&
		startOfDay(a[1]).getTime() === startOfDay(b[1]).getTime()
	);
}

/** Días calendario incluidos en el rango (tope de seguridad). */
export function diffInclusiveCalendarDays(range: [Date, Date], maxDays = 400): number {
	return daysInclusive(range[0], range[1], maxDays).length;
}

export function isFortnightPresetRange(range: [Date, Date]): boolean {
	return (
		rangesEqual(range, defaultDateRangeThisFortnight()) ||
		rangesEqual(range, defaultDateRangeLastFortnight())
	);
}

/**
 * Valores de escala permitidos (orden: Día → Quincena → Mes → Año).
 * - Día: solo si el rango es de hasta 31 días.
 * - Quincena: si hay al menos 2 días (un solo día usa Día + Año).
 * - Mes: oculto en un solo día o en atajos de quincena (esta / pasada).
 * - Año: siempre.
 */
export function getAllowedGranularityValues(range: [Date, Date]): DashboardTimeGranularity[] {
	const days = diffInclusiveCalendarDays(range);
	const single = days === 1;
	const fortnightPreset = isFortnightPresetRange(range);

	const ordered: DashboardTimeGranularity[] = [];

	if (days <= 31) ordered.push('day');
	if (days >= 2) ordered.push('fortnight');
	if (!single && !fortnightPreset) ordered.push('month');
	ordered.push('year');

	return [...new Set(ordered)];
}

export function getAllowedGranularityTabs(range: [Date, Date]): Array<{
	value: DashboardTimeGranularity;
	label: string;
}> {
	return getAllowedGranularityValues(range).map((value) => ({
		value,
		label: GRANULARITY_TAB_LABELS[value],
	}));
}

export function coerceGranularityToAllowed(
	current: DashboardTimeGranularity,
	range: [Date, Date],
): DashboardTimeGranularity {
	const allowed = getAllowedGranularityValues(range);
	if (allowed.includes(current)) return current;
	const days = diffInclusiveCalendarDays(range);
	if (days > 62 && allowed.includes('year')) return 'year';
	if (days > 31 && allowed.includes('month') && !isFortnightPresetRange(range)) return 'month';
	if (days > 31 && allowed.includes('year')) return 'year';
	return allowed[0] ?? 'year';
}

function fortnightKey(d: Date): string {
	const y = d.getFullYear();
	const m = d.getMonth();
	const day = d.getDate();
	const half = day <= 15 ? 1 : 2;
	return `${y}-${m}-H${half}`;
}

/** Etiqueta legible de la quincena calendario que contiene `d`. */
export function fortnightLabelForDate(d: Date): string {
	const y = d.getFullYear();
	const m = d.getMonth();
	const day = d.getDate();
	const monthShort = d.toLocaleDateString('es-CO', { month: 'short' });
	if (day <= 15) return `1–15 ${monthShort} ${y}`;
	const last = new Date(y, m + 1, 0).getDate();
	return `16–${last} ${monthShort} ${y}`;
}

export function aggregateSalesBlockByFortnight(
	block: SalesTimeSeriesBlock,
	range: [Date, Date],
): SalesTimeSeriesBlock {
	const days = daysInclusive(range[0], range[1], 400);
	const lens = [block.labels.length, ...block.datasets.map((d) => d.data.length)];
	const n = lens.length ? Math.min(days.length, ...lens) : 0;
	if (n <= 0) return { labels: [], datasets: block.datasets.map((d) => ({ ...d, data: [] })) };

	const bucketOrder: string[] = [];
	const keyToIndex = new Map<string, number>();

	for (let i = 0; i < n; i++) {
		const k = fortnightKey(days[i]);
		if (!keyToIndex.has(k)) {
			keyToIndex.set(k, bucketOrder.length);
			bucketOrder.push(fortnightLabelForDate(days[i]));
		}
	}

	const nb = bucketOrder.length;
	const datasets = block.datasets.map((ds) => {
		const sums = new Array(nb).fill(0);
		for (let i = 0; i < n; i++) {
			const k = fortnightKey(days[i]);
			const bi = keyToIndex.get(k)!;
			sums[bi] += Number(ds.data[i] ?? 0);
		}
		return { ...ds, data: sums };
	});

	return { labels: bucketOrder, datasets };
}

export function aggregateOrdersBlockByFortnight(
	block: OrdersPerHourBlock,
	range: [Date, Date],
): OrdersPerHourBlock {
	const fake: SalesTimeSeriesBlock = {
		labels: block.labels,
		datasets: [{ label: '_', data: block.counts.map((c) => c) }],
	};
	const agg = aggregateSalesBlockByFortnight(fake, range);
	return {
		labels: agg.labels,
		counts: (agg.datasets[0]?.data ?? []).map((v) => Number(v ?? 0)),
	};
}

export function aggregatePrincipalSalesVsExpensesByFortnight(
	data: DashboardPrincipalSalesVsExpensesApiResponse,
	range: [Date, Date],
): DashboardPrincipalSalesVsExpensesApiResponse {
	const days = daysInclusive(range[0], range[1], 400);
	const n = Math.min(days.length, data.labels.length, data.salesCop.length);
	if (n <= 0) {
		return {
			granularity: 'fortnight',
			labels: [],
			salesCop: [],
			expenseCategories: data.expenseCategories.map((c) => ({
				...c,
				amountsCop: [],
			})),
		};
	}

	const bucketOrder: string[] = [];
	const keyToIndex = new Map<string, number>();
	for (let i = 0; i < n; i++) {
		const k = fortnightKey(days[i]);
		if (!keyToIndex.has(k)) {
			keyToIndex.set(k, bucketOrder.length);
			bucketOrder.push(fortnightLabelForDate(days[i]));
		}
	}
	const nb = bucketOrder.length;
	const salesCop = new Array(nb).fill(0);
	for (let i = 0; i < n; i++) {
		const k = fortnightKey(days[i]);
		const bi = keyToIndex.get(k)!;
		salesCop[bi] += Number(data.salesCop[i] ?? 0);
	}

	const expenseCategories = data.expenseCategories.map((c) => {
		const amountsCop = new Array(nb).fill(0);
		const m = Math.min(n, c.amountsCop.length);
		for (let i = 0; i < m; i++) {
			const k = fortnightKey(days[i]);
			const bi = keyToIndex.get(k)!;
			amountsCop[bi] += Number(c.amountsCop[i] ?? 0);
		}
		return { ...c, amountsCop };
	});

	return {
		granularity: 'fortnight',
		labels: bucketOrder,
		salesCop,
		expenseCategories,
	};
}

/** Agrupa puntos diarios de evolución de peso por categoría en quincenas. */
export function aggregateCategoryEvolutionPointsByFortnight(
	points: Array<{ bucketStartUtc: string; totalWeightGrams: number }>,
): Array<{ bucketStartUtc: string; totalWeightGrams: number }> {
	const sorted = [...points].sort(
		(a, b) => new Date(a.bucketStartUtc).getTime() - new Date(b.bucketStartUtc).getTime(),
	);
	const keyToFirst = new Map<string, Date>();
	const keyToSum = new Map<string, number>();
	for (const p of sorted) {
		const d = new Date(p.bucketStartUtc);
		const k = fortnightKey(d);
		if (!keyToFirst.has(k)) keyToFirst.set(k, d);
		keyToSum.set(k, (keyToSum.get(k) ?? 0) + p.totalWeightGrams);
	}
	const orderedKeys = [...keyToSum.keys()].sort((a, b) => {
		const da = keyToFirst.get(a)!;
		const db = keyToFirst.get(b)!;
		return da.getTime() - db.getTime();
	});
	return orderedKeys.map((k) => {
		const d = keyToFirst.get(k)!;
		const y = d.getFullYear();
		const m = d.getMonth();
		const day = d.getDate();
		const start =
			day <= 15
				? startOfDay(new Date(y, m, 1))
				: startOfDay(new Date(y, m, 16));
		return {
			bucketStartUtc: start.toISOString(),
			totalWeightGrams: keyToSum.get(k) ?? 0,
		};
	});
}

/** Serie de gastos (labels + amounts alineados a días). */
export function aggregateExpenseTimeSeriesByFortnight(
	labels: string[],
	amountsCop: number[],
	range: [Date, Date],
): { labels: string[]; amountsCop: number[] } {
	const fake: SalesTimeSeriesBlock = {
		labels,
		datasets: [{ label: '_', data: amountsCop }],
	};
	const agg = aggregateSalesBlockByFortnight(fake, range);
	return {
		labels: agg.labels,
		amountsCop: (agg.datasets[0]?.data ?? []).map((v) => Number(v ?? 0)),
	};
}
