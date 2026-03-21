<template>
	<div class="space-y-6">
		<div
			v-if="loading"
			class="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
		>
			Cargando sección Ventas…
		</div>
		<div
			v-else-if="error"
			class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
		>
			{{ error }}
		</div>
		<template v-else>
			<BranchComparisonPanel v-if="showBranchComparison" :rows="comparisonRows" />

			<TimeEvolutionPanel
				v-model:date-range="dateRangeModel"
				:sales-by-day="salesByDay"
				:sales-by-hour="salesByHour"
				:sales-by-month="salesByMonth"
				:sales-by-year="salesByYear"
				:orders-by-day="ordersByDay"
				:orders-by-hour="ordersByHour"
				:orders-by-month="ordersByMonth"
				:orders-by-year="ordersByYear"
			/>

			<BaseCard title="Pedidos por estado" class="col-span-1">
				<div class="h-64 sm:h-80">
					<div class="flex items-center justify-center h-full text-gray-500 text-sm">
						Gráfico pendiente (Chart.js)
					</div>
				</div>
			</BaseCard>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import {
	BranchComparisonPanel,
	TimeEvolutionPanel,
	type BranchComparisonRow,
	type SalesTimeSeriesBlock,
	type OrdersPerHourBlock,
} from '@/components/dashboard';

const props = withDefaults(
	defineProps<{
	loading: boolean;
	error: string | null;
	/** Superadmin: comparativa entre sucursales. Admin: suele ser false (visibilidad). */
	showBranchComparison?: boolean;
	comparisonRows: BranchComparisonRow[];
	dateRange: [Date, Date];
	salesByDay: SalesTimeSeriesBlock;
	salesByHour: SalesTimeSeriesBlock;
	salesByMonth: SalesTimeSeriesBlock;
	salesByYear: SalesTimeSeriesBlock;
	ordersByDay: OrdersPerHourBlock;
	ordersByHour: OrdersPerHourBlock;
	ordersByMonth: OrdersPerHourBlock;
	ordersByYear: OrdersPerHourBlock;
}>(),
	{ showBranchComparison: true },
);

const emit = defineEmits<{
	'update:dateRange': [value: [Date, Date]];
}>();

const dateRangeModel = computed({
	get: () => props.dateRange,
	set: (v: [Date, Date]) => emit('update:dateRange', v),
});
</script>
