import { ref, watch, computed, type Ref } from 'vue';
import {
	fetchDeliveryDashboardForSelf,
	USE_DELIVERY_MOCK,
	type DeliveryDashboardPayload,
} from '@/services/MainAPI/dashboardSectionApi';

function emptyDeliveryPayload(): DeliveryDashboardPayload {
	return {
		avgPrepMinutes: 0,
		avgDeliveryMinutes: 0,
		deliverymen: [],
		evolutionLabels: [],
		evolutionDeliveries: [],
		evolutionFees: [],
		evolutionSalesTotals: [],
		periodFeeToSalesPercent: 0,
	};
}

function rangeKey(range: [Date, Date]) {
	return `${range[0].getTime()}-${range[1].getTime()}`;
}

/**
 * Carga métricas del domiciliario autenticado (`GET /api/dashboard/delivery/me`).
 */
export function useDeliverySelfAnalytics(
	dateRange: Ref<[Date, Date]>,
	branchId: Ref<number | null>,
) {
	const payload = ref<DeliveryDashboardPayload | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);

	async function load() {
		loading.value = true;
		error.value = null;
		try {
			if (USE_DELIVERY_MOCK) {
				payload.value = null;
				return;
			}
			payload.value = await fetchDeliveryDashboardForSelf(
				dateRange.value,
				branchId.value,
			);
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Error al cargar métricas';
			payload.value = null;
		} finally {
			loading.value = false;
		}
	}

	watch(
		[() => rangeKey(dateRange.value), () => branchId.value],
		() => void load(),
		{ immediate: true, deep: true },
	);

	const resolvedPayload = computed(() => payload.value ?? emptyDeliveryPayload());

	return { payload, loading, error, refresh: load, resolvedPayload };
}
