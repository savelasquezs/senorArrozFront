import { ref, watch, computed, type Ref } from 'vue';
import { dashboardApi } from '@/services/MainAPI/dashboardApi';
import { encodeDashboardRangeToApi } from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import {
	expenseTimeSeriesGranularity,
	type DashboardTimeGranularity,
} from '@/views/dashboard/dashboardGlobalFilters';

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

	const isActive = computed(() => activeSection.value === 'gastos');

	let coreSeq = 0;
	let seriesSeq = 0;

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
			data.value = {
				summary: mapSummary(summaryRaw),
				byCategory: catRaw.slices.map((s) => ({
					categoryId: s.categoryId,
					name: s.name,
					totalCop: s.totalCop,
					percent: s.percent,
				})),
				timeSeries: mapTimeSeries(tsRaw),
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
			data.value = {
				...data.value,
				timeSeries: mapTimeSeries(tsRaw),
			};
		} catch {
			// mantener serie anterior
		} finally {
			if (seq === seriesSeq) seriesBusy.value = false;
		}
	}

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
	};
}
