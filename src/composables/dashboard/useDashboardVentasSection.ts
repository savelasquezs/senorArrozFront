import { ref, watch, computed, type Ref } from 'vue';
import {
	fetchVentasDashboard,
	type VentasDashboardPayload,
} from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';

function rangeKey(range: [Date, Date]) {
	const [a, b] = range;
	return `${a.getTime()}-${b.getTime()}`;
}

/**
 * Carga Ventas: comparativa, evolución temporal y productos para el rango del `TimeEvolutionPanel`.
 */
export function useDashboardVentasSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	dateRange: Ref<[Date, Date]>,
) {
	const data = ref<VentasDashboardPayload | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const isActive = computed(() => activeSection.value === 'ventas');

	async function load() {
		if (!isActive.value) return;
		loading.value = true;
		error.value = null;
		try {
			data.value = await fetchVentasDashboard(branchId.value, dateRange.value);
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar Ventas';
			data.value = null;
		} finally {
			loading.value = false;
		}
	}

	watch(
		[isActive, branchId, () => rangeKey(dateRange.value)],
		() => void load(),
		{ immediate: true },
	);

	return { data, loading, error, refresh: load };
}
