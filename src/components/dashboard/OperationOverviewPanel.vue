<template>
	<DeliveryPerformancePanel
		v-model:branch-id="branchId"
		v-model:delivery-evolution-driver-id="deliveryEvolutionDriverId"
		:show-branch-filter="showBranchFilter"
		:show-prep-time-gauge="showPrepTimeGauge"
		:branch-options="branchOptions"
		:date-range="dateRange"
		:avg-prep-minutes="avgPrepMinutes"
		:avg-delivery-minutes="avgDeliveryMinutes"
		:deliverymen="deliverymen"
		:evolution-labels="evolutionLabels"
		:evolution-data="evolutionData"
		:evolution-fee-data="evolutionFeeData"
		:evolution-sales-totals="evolutionSalesTotals"
		:period-fee-to-sales-percent="periodFeeToSalesPercent"
		:route-metrics="routeMetrics"
	/>
</template>

<script setup lang="ts">
import DeliveryPerformancePanel from './DeliveryPerformancePanel.vue';
import type { DeliveryBranchOption, DeliverymanEfficiencyRow } from './operation.types';
import type { DeliveryRouteDashboardMetrics } from '@/services/MainAPI/dashboardSectionApi';

const branchId = defineModel<number | null>('branchId', { required: true });
const deliveryEvolutionDriverId = defineModel<number | 'all'>('deliveryEvolutionDriverId', {
	required: true,
});

withDefaults(
	defineProps<{
		showBranchFilter?: boolean;
		showPrepTimeGauge?: boolean;
		branchOptions: DeliveryBranchOption[];
		dateRange: [Date, Date];
		avgPrepMinutes: number;
		avgDeliveryMinutes: number;
		deliverymen: DeliverymanEfficiencyRow[];
		evolutionLabels: string[];
		evolutionData: number[];
		evolutionFeeData: number[];
		evolutionSalesTotals: number[];
		periodFeeToSalesPercent: number;
		routeMetrics?: DeliveryRouteDashboardMetrics | null;
	}>(),
	{ showBranchFilter: true, showPrepTimeGauge: false, routeMetrics: null },
);
</script>
