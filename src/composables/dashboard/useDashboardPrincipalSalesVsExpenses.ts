import { ref, watch, computed, onScopeDispose, type Ref } from 'vue';
import { createSectionSnapshot } from '@/helpers/sectionSnapshot';
import { dashboardApi, type DashboardPrincipalSalesVsExpensesApiResponse } from '@/services/MainAPI/dashboardApi';
import { encodeDashboardRangeToApi } from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import {
	principalSalesVsExpensesGranularity,
	type DashboardTimeGranularity,
} from '@/views/dashboard/dashboardGlobalFilters';
import { aggregatePrincipalSalesVsExpensesByFortnight } from '@/views/dashboard/dashboardGranularityBuckets';

function rangeKey(range: [Date, Date]) {
	const [a, b] = range;
	return `${a.getTime()}-${b.getTime()}`;
}

/**
 * Gráfico ventas vs gastos (principal): mismo rango y granularidad global que el sidebar.
 * Quincena: API en modo día y agregación por quincena en cliente.
 */
export function useDashboardPrincipalSalesVsExpenses(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	dateRange: Ref<[Date, Date]>,
	timeGranularity: Ref<DashboardTimeGranularity>,
) {
	const rawData = ref<DashboardPrincipalSalesVsExpensesApiResponse | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const isActive = computed(() => activeSection.value === 'principal');
	let requestVersion = 0;
	let currentController: AbortController | null = null;
	const snapshot = createSectionSnapshot();
	let filterKey = '';

	function invalidatePending() {
		requestVersion += 1;
		currentController?.abort();
		currentController = null;
	}

	onScopeDispose(invalidatePending);

	const data = computed((): DashboardPrincipalSalesVsExpensesApiResponse | null => {
		const r = rawData.value;
		if (!r) return null;
		if (timeGranularity.value === 'fortnight' && r.granularity === 'day') {
			return aggregatePrincipalSalesVsExpensesByFortnight(r, dateRange.value);
		}
		return r;
	});

	async function load(force = true) {
		if (!isActive.value) return;
		const key = `${branchId.value}:${rangeKey(dateRange.value)}:${principalSalesVsExpensesGranularity(timeGranularity.value)}`;
		if (!force && rawData.value && snapshot.fresh(key)) return;
		if (filterKey !== key) { rawData.value = null; filterKey = key; }
		currentController?.abort();
		const controller = new AbortController();
		currentController = controller;
		const version = ++requestVersion;
		loading.value = true;
		error.value = null;
		try {
			const { from, to } = encodeDashboardRangeToApi(dateRange.value);
			const gran = principalSalesVsExpensesGranularity(timeGranularity.value);
			const nextData = await dashboardApi.getPrincipalSalesVsExpenses(
				branchId.value, from, to, gran, controller.signal,
			);
			if (version !== requestVersion || !isActive.value) return;
			rawData.value = nextData;
			snapshot.loaded(key);
		} catch (e) {
			if (version !== requestVersion || !isActive.value) return;
			error.value = e instanceof Error ? e.message : 'Error al cargar ventas vs gastos';
			rawData.value = null;
		} finally {
			if (version === requestVersion) {
				currentController = null;
				loading.value = false;
			}
		}
	}

	watch(
		[isActive, branchId, () => rangeKey(dateRange.value), () => principalSalesVsExpensesGranularity(timeGranularity.value)],
		() => {
			if (isActive.value) void load(false);
			else {
				invalidatePending();
				loading.value = false;
			}
		},
		{ immediate: true },
	);

	return { data, loading, error, refresh: load };
}
