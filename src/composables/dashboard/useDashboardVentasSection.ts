import { ref, watch, computed, type Ref } from 'vue';
import {
	fetchVentasDashboardScope,
	type VentasDashboardScopePayload,
} from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';

/**
 * Carga el alcance de Ventas (filas comparación por sucursal). Las series temporales se derivan en el padre.
 */
export function useDashboardVentasSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
) {
	const data = ref<VentasDashboardScopePayload | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const isActive = computed(() => activeSection.value === 'ventas');

	async function load() {
		if (!isActive.value) return;
		loading.value = true;
		error.value = null;
		try {
			data.value = await fetchVentasDashboardScope(branchId.value);
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar Ventas';
			data.value = null;
		} finally {
			loading.value = false;
		}
	}

	watch([isActive, branchId], () => void load(), { immediate: true });

	return { data, loading, error, refresh: load };
}
