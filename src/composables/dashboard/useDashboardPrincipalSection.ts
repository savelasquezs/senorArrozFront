import { ref, watch, computed, type Ref } from 'vue';
import {
	fetchPrincipalDashboard,
	type PrincipalDashboardPayload,
} from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';

function rangeKey(range: [Date, Date]) {
	const [a, b] = range;
	return `${a.getTime()}-${b.getTime()}`;
}

/**
 * Carga bajo demanda de la sección Principal (KPIs, pipeline, actividad).
 * Los KPIs y promedios de tiempos siguen el periodo global (`kpiFrom`/`kpiTo` en el API).
 */
export function useDashboardPrincipalSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	dateRange: Ref<[Date, Date]>,
) {
	const data = ref<PrincipalDashboardPayload | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const isActive = computed(() => activeSection.value === 'principal');

	async function load() {
		if (!isActive.value) return;
		loading.value = true;
		error.value = null;
		try {
			data.value = await fetchPrincipalDashboard(branchId.value, {
				kpiRange: dateRange.value,
			});
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar Principal';
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
