import { ref, watch, computed, type Ref } from 'vue';
import { dashboardApi, type DashboardPrincipalSalesVsExpensesApiResponse } from '@/services/MainAPI/dashboardApi';
import { encodeDashboardRangeToApi } from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import {
	principalSalesVsExpensesGranularity,
	type DashboardTimeGranularity,
} from '@/views/dashboard/dashboardGlobalFilters';

function rangeKey(range: [Date, Date]) {
	const [a, b] = range;
	return `${a.getTime()}-${b.getTime()}`;
}

/**
 * Gráfico ventas vs gastos (principal): mismo rango y granularidad global que el sidebar.
 */
export function useDashboardPrincipalSalesVsExpenses(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	dateRange: Ref<[Date, Date]>,
	timeGranularity: Ref<DashboardTimeGranularity>,
) {
	const data = ref<DashboardPrincipalSalesVsExpensesApiResponse | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const isActive = computed(() => activeSection.value === 'principal');

	async function load() {
		if (!isActive.value) return;
		loading.value = true;
		error.value = null;
		try {
			const { from, to } = encodeDashboardRangeToApi(dateRange.value);
			const gran = principalSalesVsExpensesGranularity(timeGranularity.value);
			data.value = await dashboardApi.getPrincipalSalesVsExpenses(branchId.value, from, to, gran);
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar ventas vs gastos';
			data.value = null;
		} finally {
			loading.value = false;
		}
	}

	watch(
		[isActive, branchId, () => rangeKey(dateRange.value), timeGranularity],
		() => void load(),
		{ immediate: true },
	);

	return { data, loading, error, refresh: load };
}
