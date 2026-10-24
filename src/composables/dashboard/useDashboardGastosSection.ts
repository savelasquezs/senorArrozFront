import { ref, watch, computed, onScopeDispose, type Ref } from 'vue';
import { dashboardApi } from '@/services/MainAPI/dashboardApi';
import { encodeDashboardRangeToApi } from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import {
	expenseTimeSeriesGranularity,
	type DashboardTimeGranularity,
} from '@/views/dashboard/dashboardGlobalFilters';
import { aggregateExpenseTimeSeriesByFortnight } from '@/views/dashboard/dashboardGranularityBuckets';

export type GastosSummaryPayload = {
	totalCop: number;
	headerCount: number;
	lineCount: number;
	avgDailyCop: number;
	avgTicketCop: number;
	previousPeriodTotalCop: number;
	previousPeriodHeaderCount: number;
	totalChangeFromPreviousPercent: number;
};

export type GastosCategorySlice = {
	categoryId: number;
	name: string;
	totalCop: number;
	percent: number;
};

export type GastosTimeSeriesPayload = {
	labels: string[];
	amountsCop: number[];
	granularity: string;
	seriesLabel: string;
};

export type GastosDashboardPayload = {
	summary: GastosSummaryPayload | null;
	byCategory: GastosCategorySlice[];
	timeSeries: GastosTimeSeriesPayload | null;
};

/** Top ítems de catálogo: suma de líneas en el rango, agrupado por ítem de catálogo (mismo criterio que el gráfico). */
export type GastosTopCatalogItem = {
	expenseId: number;
	expenseName: string;
	categoryName: string;
	totalCop: number;
	lineCount: number;
};

const DEFAULT_TOP_LINES_LIMIT = 15;

function mapSummary(raw: {
	totalCop: number;
	headerCount: number;
	lineCount: number;
	avgDailyCop: number;
	avgTicketCop: number;
	previousPeriodTotalCop: number;
	previousPeriodHeaderCount: number;
	totalChangeFromPreviousPercent: number;
}): GastosSummaryPayload {
	return { ...raw };
}

function mapTimeSeries(raw: {
	labels: string[];
	amountsCop: number[];
	granularity: string;
	seriesLabel: string;
}): GastosTimeSeriesPayload {
	return {
		labels: [...raw.labels],
		amountsCop: [...raw.amountsCop],
		granularity: raw.granularity,
		seriesLabel: raw.seriesLabel,
	};
}

function rangeKey(range: [Date, Date]) {
	const [a, b] = range;
	return `${a.getTime()}-${b.getTime()}`;
}

function formatTimeSeriesForScale(raw: GastosTimeSeriesPayload, scale: DashboardTimeGranularity, range: [Date, Date]): GastosTimeSeriesPayload {
	if (scale !== 'fortnight' || raw.granularity !== 'day') return raw;
	const aggregate = aggregateExpenseTimeSeriesByFortnight(raw.labels, raw.amountsCop, range);
	return { ...raw, ...aggregate, granularity: 'fortnight' };
}

/**
 * Gastos del dashboard: KPIs, torta por categoría y línea temporal filtrable.
 * Cambiar categoría/gasto/granularidad solo actualiza la serie (sin pantalla de carga completa).
 * Cambiar rango/sucursal/granularidad global actualiza todo sin bloquear la UI tras la primera carga.
 */
export function useDashboardGastosSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	dateRange: Ref<[Date, Date]>,
	timeGranularity: Ref<DashboardTimeGranularity>,
) {
	const data = ref<GastosDashboardPayload | null>(null);
	const loading = ref(false);
	const seriesBusy = ref(false);
	const error = ref<string | null>(null);

	const filterCategoryId = ref<number | null>(null);
	const filterExpenseId = ref<number | null>(null);
	const topLinesLimit = ref(DEFAULT_TOP_LINES_LIMIT);
	const topLines = ref<GastosTopCatalogItem[]>([]);
	const topLinesLoading = ref(false);

	const isActive = computed(() => activeSection.value === 'gastos');

	let coreSeq = 0;
	let seriesSeq = 0;
	let topSeq = 0;
	let lastCoreKey = '';
	let rawSeries: GastosTimeSeriesPayload | null = null;
	let rawSeriesKey = '';
	const coreKey = () => `${branchId.value ?? 'all'}|${rangeKey(dateRange.value)}`;
	const seriesKey = () => `${coreKey()}|${filterCategoryId.value ?? 'all'}|${filterExpenseId.value ?? 'all'}|${expenseTimeSeriesGranularity(timeGranularity.value) ?? 'auto'}`;
	onScopeDispose(() => { coreSeq++; seriesSeq++; topSeq++; });

	watch(filterCategoryId, () => {
		filterExpenseId.value = null;
	});

	async function loadCoreAndSeries(silent: boolean) {
		if (!isActive.value) return;
		const seq = ++coreSeq;
		seriesSeq++;
		const key = coreKey();
		const fetchedSeriesKey = seriesKey();
		if (lastCoreKey !== key) {
			data.value = null;
			lastCoreKey = key;
		}
		const hadData = data.value != null;
		if (!hadData) loading.value = true;
		error.value = null;
		try {
			const { from, to } = encodeDashboardRangeToApi(dateRange.value);
			const b = branchId.value;
			const granOpt = expenseTimeSeriesGranularity(timeGranularity.value);
			const [summaryRaw, catRaw, tsRaw] = await Promise.all([
				dashboardApi.getExpenseSummary(b, from, to),
				dashboardApi.getExpenseByCategory(b, from, to),
				dashboardApi.getExpenseTimeSeries(b, from, to, {
					categoryId: filterCategoryId.value,
					expenseId: filterExpenseId.value,
					granularity: granOpt,
				}),
			]);
			if (seq !== coreSeq || !isActive.value) return;
			const seriesMatches = fetchedSeriesKey === seriesKey();
			rawSeries = seriesMatches ? mapTimeSeries(tsRaw) : null;
			rawSeriesKey = seriesMatches ? fetchedSeriesKey : '';
			let ts = rawSeries;
			ts = ts ? formatTimeSeriesForScale(ts, timeGranularity.value, dateRange.value) : null;
			data.value = {
				summary: mapSummary(summaryRaw),
				byCategory: catRaw.slices.map((s) => ({
					categoryId: s.categoryId,
					name: s.name,
					totalCop: s.totalCop,
					percent: s.percent,
				})),
				timeSeries: ts,
			};
			if (!seriesMatches) void loadSeriesOnly();
		} catch (e) {
			if (seq !== coreSeq) return;
			error.value = e instanceof Error ? e.message : 'Error al cargar Gastos';
			data.value = null;
		} finally {
			if (seq === coreSeq) loading.value = false;
		}
	}

	async function loadSeriesOnly() {
		if (!isActive.value || !data.value) return;
		const seq = ++seriesSeq;
		const key = seriesKey();
		seriesBusy.value = true;
		try {
			const { from, to } = encodeDashboardRangeToApi(dateRange.value);
			const granOpt = expenseTimeSeriesGranularity(timeGranularity.value);
			const tsRaw = await dashboardApi.getExpenseTimeSeries(branchId.value, from, to, {
				categoryId: filterCategoryId.value,
				expenseId: filterExpenseId.value,
				granularity: granOpt,
			});
			if (seq !== seriesSeq || key !== seriesKey() || !isActive.value) return;
			if (!data.value) return;
			rawSeries = mapTimeSeries(tsRaw);
			rawSeriesKey = key;
			let ts = formatTimeSeriesForScale(rawSeries, timeGranularity.value, dateRange.value);
			data.value = {
				...data.value,
				timeSeries: ts,
			};
		} catch {
			// mantener serie anterior
		} finally {
			if (seq === seriesSeq) seriesBusy.value = false;
		}
	}

	async function loadTopLines() {
		if (!isActive.value) {
			topSeq++;
			topLinesLoading.value = false;
			topLines.value = [];
			return;
		}
		if (filterCategoryId.value == null) {
			topSeq++;
			topLinesLoading.value = false;
			topLines.value = [];
			return;
		}
		const seq = ++topSeq;
		topLinesLoading.value = true;
		try {
			const { from, to } = encodeDashboardRangeToApi(dateRange.value);
			const raw = await dashboardApi.getExpenseTopLines(branchId.value, from, to, {
				categoryId: filterCategoryId.value,
				expenseId: filterExpenseId.value,
				limit: topLinesLimit.value,
			});
			if (seq !== topSeq) return;
			topLines.value = (raw.items ?? []).map((r) => ({
				expenseId: r.expenseId,
				expenseName: r.expenseName,
				categoryName: r.categoryName,
				totalCop: r.totalCop,
				lineCount: r.lineCount,
			}));
		} catch {
			if (seq !== topSeq) return;
			topLines.value = [];
		} finally {
			if (seq === topSeq) topLinesLoading.value = false;
		}
	}

	watch(
		[
			isActive,
			branchId,
			() => rangeKey(dateRange.value),
			filterCategoryId,
			filterExpenseId,
			topLinesLimit,
		],
		() => {
			void loadTopLines();
		},
		{ immediate: true },
	);

	watch(
		[isActive, branchId, () => rangeKey(dateRange.value)],
		() => {
			if (!isActive.value) {
				coreSeq++; seriesSeq++; topSeq++;
				loading.value = false; seriesBusy.value = false; topLinesLoading.value = false;
				data.value = null;
				return;
			}
			void loadCoreAndSeries(false);
		},
		{ immediate: true },
	);

	watch(timeGranularity, () => {
		if (!isActive.value || !data.value) return;
		if (rawSeries && rawSeriesKey === seriesKey()) {
			data.value = { ...data.value, timeSeries: formatTimeSeriesForScale(rawSeries, timeGranularity.value, dateRange.value) };
		} else {
			void loadSeriesOnly();
		}
	});

	watch(
		[filterCategoryId, filterExpenseId],
		() => {
			if (!isActive.value || !data.value) return;
			void loadSeriesOnly();
		},
	);

	return {
		data,
		loading,
		seriesBusy,
		error,
		filterCategoryId,
		filterExpenseId,
		topLines,
		topLinesLoading,
		topLinesLimit,
	};
}
