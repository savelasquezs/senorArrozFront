import { ref, watch, computed, type Ref } from 'vue';
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

export type GastosTopLineItem = {
	detailId: number;
	headerId: number;
	headerCreatedAtUtc: string;
	lineCop: number;
	expenseName: string;
	categoryName: string;
	supplierName: string;
	branchName: string;
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
	const topLines = ref<GastosTopLineItem[]>([]);
	const topLinesLoading = ref(false);

	const isActive = computed(() => activeSection.value === 'gastos');

	let coreSeq = 0;
	let seriesSeq = 0;
	let topSeq = 0;

	watch(filterCategoryId, () => {
		filterExpenseId.value = null;
	});

	async function loadCoreAndSeries(silent: boolean) {
		if (!isActive.value) return;
		const seq = ++coreSeq;
		seriesSeq++;
		const hadData = data.value != null;
		if (!silent && !hadData) loading.value = true;
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
			if (seq !== coreSeq) return;
			let ts = mapTimeSeries(tsRaw);
			if (
				timeGranularity.value === 'fortnight' &&
				ts.granularity === 'day' &&
				ts.labels.length > 0
			) {
				const agg = aggregateExpenseTimeSeriesByFortnight(
					ts.labels,
					ts.amountsCop,
					dateRange.value,
				);
				ts = {
					...ts,
					labels: agg.labels,
					amountsCop: agg.amountsCop,
					granularity: 'fortnight',
				};
			}
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
		} catch (e) {
			if (seq !== coreSeq) return;
			error.value = e instanceof Error ? e.message : 'Error al cargar Gastos';
			data.value = null;
		} finally {
			if (seq === coreSeq && !silent && !hadData) loading.value = false;
		}
	}

	async function loadSeriesOnly() {
		if (!isActive.value || !data.value) return;
		const seq = ++seriesSeq;
		seriesBusy.value = true;
		try {
			const { from, to } = encodeDashboardRangeToApi(dateRange.value);
			const granOpt = expenseTimeSeriesGranularity(timeGranularity.value);
			const tsRaw = await dashboardApi.getExpenseTimeSeries(branchId.value, from, to, {
				categoryId: filterCategoryId.value,
				expenseId: filterExpenseId.value,
				granularity: granOpt,
			});
			if (seq !== seriesSeq) return;
			if (!data.value) return;
			let ts = mapTimeSeries(tsRaw);
			if (
				timeGranularity.value === 'fortnight' &&
				ts.granularity === 'day' &&
				ts.labels.length > 0
			) {
				const agg = aggregateExpenseTimeSeriesByFortnight(
					ts.labels,
					ts.amountsCop,
					dateRange.value,
				);
				ts = {
					...ts,
					labels: agg.labels,
					amountsCop: agg.amountsCop,
					granularity: 'fortnight',
				};
			}
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
			topLines.value = [];
			return;
		}
		if (filterCategoryId.value == null) {
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
				detailId: r.detailId,
				headerId: r.headerId,
				headerCreatedAtUtc: r.headerCreatedAtUtc,
				lineCop: r.lineCop,
				expenseName: r.expenseName,
				categoryName: r.categoryName,
				supplierName: r.supplierName,
				branchName: r.branchName,
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
		[isActive, branchId, () => rangeKey(dateRange.value), timeGranularity],
		() => {
			if (!isActive.value) return;
			void loadCoreAndSeries(data.value != null);
		},
		{ immediate: true },
	);

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
