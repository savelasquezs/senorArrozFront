import { ref, watch, computed, onScopeDispose, type Ref } from 'vue';
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
		routeMetrics: null,
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
	enabled: Ref<boolean> = ref(true),
) {
	const payload = ref<DeliveryDashboardPayload | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	let generation = 0, controller: AbortController | undefined;
	function cancel() { generation++; controller?.abort(); loading.value = false; }
	onScopeDispose(cancel);

	async function load() {
		if (!enabled.value) return;
		cancel();
		const request = generation, current = new AbortController(); controller = current;
		loading.value = true;
		error.value = null;
		try {
			if (USE_DELIVERY_MOCK) {
				payload.value = null;
				return;
			}
			const result = await fetchDeliveryDashboardForSelf(
				dateRange.value,
				branchId.value,
				current.signal,
			);
			if (request === generation && enabled.value) payload.value = result;
		} catch (e) {
			if (request !== generation) return;
			error.value = e instanceof Error ? e.message : 'Error al cargar métricas';
			payload.value = null;
		} finally {
			if (request === generation) loading.value = false;
		}
	}

	watch(
		[enabled, () => rangeKey(dateRange.value), () => branchId.value],
		() => { if (enabled.value) void load(); else cancel(); },
		{ immediate: true, deep: true },
	);

	const resolvedPayload = computed(() => payload.value ?? emptyDeliveryPayload());

	return { payload, loading, error, refresh: load, resolvedPayload };
}
