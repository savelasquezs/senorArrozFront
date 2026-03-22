<template>
	<BaseCard :padding="'md'" :shadow="'sm'">
		<div class="space-y-8">
			<p class="text-[11px] text-gray-500 pb-2 border-b border-gray-100 leading-relaxed">
				Periodo y escala se controlan en el <strong>panel lateral</strong>.
				<strong class="ml-1">Hora:</strong> último día del rango; pedidos: área o barras.
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
				<div
					class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
				>
					<div>
						<h3 class="text-base font-semibold text-gray-900">{{ ordersSectionTitle }}</h3>
						<p class="text-xs text-gray-500 mt-0.5">
							{{ ordersSectionHint }}
						</p>
					</div>
					<DashboardSegmentedTabs
						v-if="timeGranularity === 'hour'"
						v-model="ordersDisplay"
						:options="ordersDisplayTabs"
						aria-label="Tipo de gráfico pedidos por hora"
					/>
				</div>
				<DashboardLineChart
					v-if="timeGranularity === 'hour' && ordersDisplay === 'area'"
					:labels="activeOrdersBlock.labels"
					:datasets="ordersAreaDatasets"
					y-format="number"
					variant="area"
					:curve-tension="0.4"
				/>
				<DashboardBarChart
					v-else
					:labels="activeOrdersBlock.labels"
					:datasets="ordersBarDatasets"
					y-format="number"
				/>
			</section>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import DashboardLineChart from './DashboardLineChart.vue';
import DashboardBarChart from './DashboardBarChart.vue';
import DashboardSegmentedTabs from './DashboardSegmentedTabs.vue';
import type { OrdersPerHourBlock, SalesTimeSeriesBlock } from './timeEvolution.types';

const props = defineProps<{
	salesByDay: SalesTimeSeriesBlock;
	salesByHour: SalesTimeSeriesBlock;
	salesByMonth: SalesTimeSeriesBlock;
	salesByYear: SalesTimeSeriesBlock;
	ordersByDay: OrdersPerHourBlock;
	ordersByHour: OrdersPerHourBlock;
	ordersByMonth: OrdersPerHourBlock;
	ordersByYear: OrdersPerHourBlock;
}>();

const timeGranularity = defineModel<string>('timeGranularity', { default: 'day' });
const ordersDisplay = ref<string>('area');

const ordersDisplayTabs = [
	{ value: 'area', label: 'Área' },
	{ value: 'bar', label: 'Barras' },
];

const activeSalesBlock = computed((): SalesTimeSeriesBlock => {
	switch (timeGranularity.value as string) {
		case 'hour':
			return props.salesByHour;
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
		case 'hour':
			return props.ordersByHour;
		case 'month':
			return props.ordersByMonth;
		case 'year':
			return props.ordersByYear;
		default:
			return props.ordersByDay;
	}
});

const ordersSectionTitle = computed(() => {
	switch (timeGranularity.value as string) {
		case 'hour':
			return 'Pedidos por hora';
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
		case 'hour':
			return 'Agregado de todas las sucursales; último día del rango.';
		case 'day':
			return 'Total de pedidos por día en el rango (todas las sucursales).';
		case 'month':
			return 'Total de pedidos por mes en el rango (todas las sucursales).';
		case 'year':
			return 'Total de pedidos por año en el rango (todas las sucursales).';
		default:
			return '';
	}
});

const ordersAreaDatasets = computed(() => [
	{
		label: 'Pedidos',
		data: [...activeOrdersBlock.value.counts],
	},
]);

const ordersBarDatasets = computed(() => [
	{
		label: 'Pedidos',
		data: [...activeOrdersBlock.value.counts],
		backgroundColor: 'rgba(5, 120, 90, 0.75)',
	},
]);
</script>
