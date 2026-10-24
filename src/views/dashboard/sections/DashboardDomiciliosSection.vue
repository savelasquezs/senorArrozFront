<template>
	<div class="space-y-6">
		<div
			v-if="loading"
			class="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
		>
			Cargando sección Domicilios…
		</div>
		<template v-else>
			<div
				v-if="error"
				class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
			>
				{{ error }}
                <button type="button" class="ml-3 font-semibold underline" @click="emit('refresh')">Reintentar</button>
			</div>
			<DeliveryAnalyticsPanel
				v-model:date-range="dateRangeModel"
				v-model:branch-id="branchIdModel"
				v-model:driver-id="driverIdModel"
                :exclude-wednesdays="excludeWednesdays"
                :busy="refreshing"
                @update:exclude-wednesdays="emit('update:excludeWednesdays', $event)"
				:show-branch-filter="showBranchFilter"
				:branch-options="branchOptions"
				:performance="routeMetrics?.performance"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DeliveryAnalyticsPanel from '@/components/dashboard/DeliveryAnalyticsPanel.vue';
import type { DeliveryBranchOption } from '@/components/dashboard';
import type { DeliveryRouteDashboardMetrics } from '@/services/MainAPI/dashboardSectionApi';
const props = withDefaults(
	defineProps<{
		loading: boolean;
        refreshing?: boolean;
        excludeWednesdays?: boolean;
		error: string | null;
		/** Mismo rango que el filtro “Periodo” del sidebar. */
		dateRange: [Date, Date];
		showBranchFilter: boolean;
		branchOptions: DeliveryBranchOption[];

		branchId: number | null;
		deliveryEvolutionDriverId: number | 'all';
		routeMetrics?: DeliveryRouteDashboardMetrics | null;
	}>(),
	{ routeMetrics: null },
);

const emit = defineEmits<{
    'update:dateRange': [value: [Date, Date]];
    'update:excludeWednesdays': [value: boolean];
    refresh: [];
	'update:branchId': [value: number | null];
	'update:deliveryEvolutionDriverId': [value: number | 'all'];
}>();

const branchIdModel = computed({
	get: () => props.branchId,
	set: (v: number | null) => emit('update:branchId', v),
});

const dateRangeModel = computed({
    get: () => props.dateRange,
    set: (value: [Date, Date]) => emit('update:dateRange', value),
});

const driverIdModel = computed({
	get: () => props.deliveryEvolutionDriverId,
	set: (v: number | 'all') => emit('update:deliveryEvolutionDriverId', v),
});
</script>
