<template>
	<BaseCard :padding="'md'" :shadow="'sm'">
		<div class="space-y-8">
			<p class="text-[11px] text-gray-500 pb-2 border-b border-gray-100 leading-relaxed">
				Periodo y escala se controlan en el <strong>panel lateral</strong>
				(día, quincena, mes o año según el rango).
			</p>

			<section class="space-y-3">
				<div>
					<h3 class="text-base font-semibold text-gray-900">Ventas en el tiempo</h3>
					<p class="text-xs text-gray-500 mt-0.5">
						Una línea por sucursal — cuándo se vende más y qué punto rinde mejor.
					</p>
				</div>
				<DashboardLineChart
					:labels="activeSalesBlock.labels"
					:datasets="activeSalesBlock.datasets"
					y-format="currency"
					variant="line"
					:curve-tension="0.35"
				/>
			</section>

			<section class="space-y-3 pt-2 border-t border-gray-100">
				<div>
					<h3 class="text-base font-semibold text-gray-900">{{ ordersSectionTitle }}</h3>
					<p class="text-xs text-gray-500 mt-0.5">
						{{ ordersSectionHint }}
					</p>
				</div>
				<DashboardBarChart
					:labels="activeOrdersBlock.labels"
					:datasets="ordersBarDatasets"
					y-format="number"
				/>
			</section>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import DashboardLineChart from './DashboardLineChart.vue';
import DashboardBarChart from './DashboardBarChart.vue';
import type { OrdersPerHourBlock, SalesTimeSeriesBlock } from './timeEvolution.types';
import type { BarChartDataset } from './barChart.types';

const props = defineProps<{
	salesByDay: SalesTimeSeriesBlock;
	salesByFortnight: SalesTimeSeriesBlock;
	salesByMonth: SalesTimeSeriesBlock;
	salesByYear: SalesTimeSeriesBlock;
	ordersByDay: OrdersPerHourBlock;
	ordersByFortnight: OrdersPerHourBlock;
	ordersByMonth: OrdersPerHourBlock;
	ordersByYear: OrdersPerHourBlock;
}>();

const timeGranularity = defineModel<string>('timeGranularity', { default: 'day' });

const activeSalesBlock = computed((): SalesTimeSeriesBlock => {
	switch (timeGranularity.value as string) {
		case 'fortnight':
			return props.salesByFortnight;
		case 'month':
			return props.salesByMonth;
		case 'year':
			return props.salesByYear;
		default:
			return props.salesByDay;
	}
});

const activeOrdersBlock = computed((): OrdersPerHourBlock => {
	switch (timeGranularity.value as string) {
		case 'fortnight':
			return props.ordersByFortnight;
		case 'month':
			return props.ordersByMonth;
		case 'year':
			return props.ordersByYear;
		default:
			return props.ordersByDay;
	}
});

const ordersBarDatasets = computed((): BarChartDataset[] => [
	{
		label: 'Pedidos',
		data: activeOrdersBlock.value.counts.map((v) => Number(v)),
		backgroundColor: 'rgba(5, 120, 90, 0.82)',
	},
]);

const ordersSectionTitle = computed(() => {
	switch (timeGranularity.value as string) {
		case 'fortnight':
			return 'Pedidos por quincena';
		case 'month':
			return 'Pedidos por mes';
		case 'year':
			return 'Pedidos por año';
		default:
			return 'Pedidos por día';
	}
});

const ordersSectionHint = computed(() => {
	switch (timeGranularity.value as string) {
		case 'day':
			return 'Total de pedidos por día en el rango (todas las sucursales).';
		case 'fortnight':
			return 'Agregado por quincenas calendario (1–15 y 16–fin de mes).';
		case 'month':
			return 'Total de pedidos por mes en el rango (todas las sucursales).';
		case 'year':
			return 'Total de pedidos por año en el rango (todas las sucursales).';
		default:
			return '';
	}
});
</script>
