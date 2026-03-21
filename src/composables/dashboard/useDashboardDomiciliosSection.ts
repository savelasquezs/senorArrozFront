import { ref, watch, computed, type Ref } from 'vue';
import { fetchDomiciliosDashboardScope } from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';

/**
 * Marca carga de la vista Domicilios; el detalle operativo (periodo, gráficas) lo orquesta el padre.
 */
export function useDashboardDomiciliosSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
) {
	const ready = ref(false);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const isActive = computed(() => activeSection.value === 'domicilios');

	async function load() {
		if (!isActive.value) return;
		loading.value = true;
		error.value = null;
		try {
			await fetchDomiciliosDashboardScope(branchId.value);
			ready.value = true;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar Domicilios';
			ready.value = false;
		} finally {
			loading.value = false;
		}
	}

	watch([isActive, branchId], () => void load(), { immediate: true });

	return { ready, loading, error, refresh: load };
}
