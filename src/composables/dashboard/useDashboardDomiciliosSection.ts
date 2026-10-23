import { ref, watch, computed, type Ref } from 'vue';
import {
	fetchDeliveryDashboard,
	USE_DELIVERY_MOCK,
	type DeliveryDashboardPayload,
} from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
/**
 * Carga datos de Domicilios desde `GET /api/dashboard/delivery` (rango + sucursal).
 * El rango debe ser el mismo que el filtro global del sidebar (`dateRange`).
 * Con mock, `deliveryPayload` queda `null` y el shell usa datos demo.
 */
function rangeKey(range: [Date, Date]) {
	const [a, b] = range;
	return `${a.getTime()}-${b.getTime()}`;
}

function driverKey(driver: number | 'all') {
	return driver === 'all' ? 'all' : String(driver);
}

export function useDashboardDomiciliosSection(
	activeSection: Ref<DashboardSectionId>,
	branchId: Ref<number | null>,
	dateRange: Ref<[Date, Date]>,
	deliveryManId: Ref<number | 'all'>,
    excludeWednesdays: Ref<boolean> = ref(false),
) {
	const deliveryPayload = ref<DeliveryDashboardPayload | null>(null);
	const loading = ref(false);
	const refreshBusy = ref(false);
	const error = ref<string | null>(null);
	/** Tras el primer intento, los cambios de filtro no vuelven a mostrar el skeleton de toda la sección. */
	const hasCompletedInitialLoad = ref(false);

	const isActive = computed(() => activeSection.value === 'domicilios');
    let requestVersion = 0;

	async function load() {
		if (!isActive.value) return;
        const version = ++requestVersion;
		const hadData = hasCompletedInitialLoad.value;
		if (hadData) refreshBusy.value = true;
		else loading.value = true;
		error.value = null;
		try {
			if (USE_DELIVERY_MOCK) {
				deliveryPayload.value = null;
				return;
			}
			const payload = await fetchDeliveryDashboard(
				branchId.value,
				dateRange.value,
				deliveryManId.value,
                excludeWednesdays.value,
			);
            if (version === requestVersion) deliveryPayload.value = payload;
		} catch (e) {
            if (version !== requestVersion) return;
			error.value = e instanceof Error ? e.message : 'Error al cargar Domicilios';
			deliveryPayload.value = null;
		} finally {
            if (version !== requestVersion) return;
			loading.value = false;
			refreshBusy.value = false;
			hasCompletedInitialLoad.value = true;
		}
	}

	watch(
		[isActive, branchId, () => rangeKey(dateRange.value), () => driverKey(deliveryManId.value), excludeWednesdays],
		() => void load(),
		{ immediate: true },
	);

	return { deliveryPayload, loading, refreshBusy, hasCompletedInitialLoad, error, refresh: load };
}
