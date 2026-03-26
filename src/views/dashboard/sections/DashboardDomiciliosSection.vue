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
			</div>
			<OperationOverviewPanel
				:date-range="dateRange"
				v-model:branch-id="branchIdModel"
				v-model:delivery-evolution-driver-id="driverIdModel"
				:show-branch-filter="showBranchFilter"
				:branch-options="branchOptions"
				:avg-prep-minutes="avgPrepMinutes"
				:avg-delivery-minutes="avgDeliveryMinutes"
				:deliverymen="deliverymen"
				:evolution-labels="evolutionLabels"
				:evolution-data="evolutionData"
				:evolution-fee-data="evolutionFeeData"
				:evolution-sales-totals="evolutionSalesTotals"
				:period-fee-to-sales-percent="periodFeeToSalesPercent"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { OperationOverviewPanel } from '@/components/dashboard';
import type { DeliveryBranchOption, DeliverymanEfficiencyRow } from '@/components/dashboard';
const props = defineProps<{
	loading: boolean;
	error: string | null;
	/** Mismo rango que el filtro “Periodo” del sidebar. */
	dateRange: [Date, Date];
	showBranchFilter: boolean;
	branchOptions: DeliveryBranchOption[];
	avgPrepMinutes: number;
	avgDeliveryMinutes: number;
	deliverymen: DeliverymanEfficiencyRow[];
	evolutionLabels: string[];
	evolutionData: number[];
	evolutionFeeData: number[];
	evolutionSalesTotals: number[];
	periodFeeToSalesPercent: number;
	branchId: number | null;
	deliveryEvolutionDriverId: number | 'all';
}>();

const emit = defineEmits<{
	'update:branchId': [value: number | null];
	'update:deliveryEvolutionDriverId': [value: number | 'all'];
}>();

const branchIdModel = computed({
	get: () => props.branchId,
	set: (v: number | null) => emit('update:branchId', v),
});

const driverIdModel = computed({
	get: () => props.deliveryEvolutionDriverId,
	set: (v: number | 'all') => emit('update:deliveryEvolutionDriverId', v),
});
</script>
