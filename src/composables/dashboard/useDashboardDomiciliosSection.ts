import { ref, watch, computed, type Ref } from 'vue';
import {
	fetchDeliveryDashboard,
	USE_DELIVERY_MOCK,
	type DeliveryDashboardPayload,
} from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import type { DashboardPeriodValue } from '@/utils/dashboardPeriodPresets';

/**
 * Carga datos de Domicilios desde `GET /api/dashboard/delivery` (rango del periodo + sucursal).
 * Con mock, `deliveryPayload` queda `null` y el shell usa datos demo.
 */
export function useDashboardDomiciliosSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	deliveryPeriod: Ref<DashboardPeriodValue>,
) {
	const deliveryPayload = ref<DeliveryDashboardPayload | null>(null);
	const loading = ref(false);
	const refreshBusy = ref(false);
	const error = ref<string | null>(null);
	/** Tras el primer intento, los cambios de filtro no vuelven a mostrar el skeleton de toda la sección. */
	const hasCompletedInitialLoad = ref(false);

	const isActive = computed(() => activeSection.value === 'domicilios');

	function periodRangeKey() {
		const [a, b] = deliveryPeriod.value.range;
		return `${a.getTime()}-${b.getTime()}-${deliveryPeriod.value.presetId}`;
	}

	async function load() {
		if (!isActive.value) return;
		const hadData = hasCompletedInitialLoad.value;
		if (hadData) refreshBusy.value = true;
		else loading.value = true;
		error.value = null;
		try {
			if (USE_DELIVERY_MOCK) {
				deliveryPayload.value = null;
				return;
			}
			deliveryPayload.value = await fetchDeliveryDashboard(
				branchId.value,
				deliveryPeriod.value.range,
			);
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar Domicilios';
			if (!hadData) deliveryPayload.value = null;
		} finally {
			loading.value = false;
			refreshBusy.value = false;
			hasCompletedInitialLoad.value = true;
		}
	}

	watch(
		[isActive, branchId, () => periodRangeKey()],
		() => void load(),
		{ immediate: true },
	);

	return { deliveryPayload, loading, refreshBusy, hasCompletedInitialLoad, error, refresh: load };
}
