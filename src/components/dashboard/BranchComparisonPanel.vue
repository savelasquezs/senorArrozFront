<template>
	<BaseCard title="Comparación entre sucursales" :padding="'md'">
		<div class="space-y-4">
			<div
				class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
			>
				<DashboardSegmentedTabs
					v-model="metricTab"
					:options="metricTabs"
					aria-label="Métrica del gráfico"
				/>
				<label
					class="inline-flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-700 select-none"
				>
					<input
						v-model="stackedByChannel"
						type="checkbox"
						class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
					/>
					<span>Apilar por canal (delivery / local)</span>
				</label>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
				<div class="min-w-0">
					<p class="text-xs text-gray-500 mb-2">{{ chartSubtitle }}</p>
					<DashboardBarChart
						:labels="branchLabels"
						:datasets="chartDatasets"
						:stacked="stackedByChannel"
						:y-format="metricTab === 'sales' ? 'currency' : 'number'"
					/>
				</div>
				<div class="min-w-0">
					<p class="text-xs font-medium text-gray-700 mb-2">Ranking</p>
					<p class="text-[11px] text-gray-500 mb-3">
						Ordena por columna; útil para ver competencia interna entre puntos.
					</p>
					<DashboardRankingTable
						:columns="rankingColumns"
						:rows="tableRows"
						row-id-key="id"
						default-sort-key="salesTotal"
						default-sort-dir="desc"
					/>
				</div>
			</div>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import DashboardBarChart from './DashboardBarChart.vue';
import DashboardSegmentedTabs from './DashboardSegmentedTabs.vue';
import DashboardRankingTable from './DashboardRankingTable.vue';
import type { RankingColumn } from './DashboardRankingTable.types';
import type { BarChartDataset } from './barChart.types';
import type { BranchComparisonRow } from './branchComparison.types';

const props = defineProps<{
	rows: BranchComparisonRow[];
}>();

const metricTab = ref<string>('sales');
const stackedByChannel = ref(false);

const metricTabs = [
	{ value: 'sales' as const, label: 'Ventas' },
	{ value: 'orders' as const, label: 'Pedidos' },
];

const branchLabels = computed(() => props.rows.map((r) => r.name));

const chartSubtitle = computed(() => {
	if (metricTab.value === 'sales') {
		return stackedByChannel.value
			? 'Ventas por sucursal, desglosadas delivery vs local'
			: 'Ventas totales por sucursal';
	}
	return stackedByChannel.value
		? 'Pedidos por sucursal, desglosados delivery vs local'
		: 'Pedidos totales por sucursal';
});

const tableRows = computed(() =>
	props.rows.map((r) => ({ ...r }) as Record<string, unknown>),
);

const chartDatasets = computed<BarChartDataset[]>(() => {
	const r = props.rows;
	if (metricTab.value === 'sales') {
		if (!stackedByChannel.value) {
			return [{ label: 'Ventas', data: r.map((x) => x.salesTotal) }];
		}
		return [
			{
				label: 'Delivery',
				data: r.map((x) => x.salesDelivery),
				backgroundColor: 'rgba(5, 120, 90, 0.9)',
			},
			{
				label: 'Local',
				data: r.map((x) => x.salesOnsite),
				backgroundColor: 'rgba(52, 211, 153, 0.85)',
			},
		];
	}
	if (!stackedByChannel.value) {
		return [{ label: 'Pedidos', data: r.map((x) => x.ordersTotal) }];
	}
	return [
		{
			label: 'Delivery',
			data: r.map((x) => x.ordersDelivery),
			backgroundColor: 'rgba(5, 120, 90, 0.9)',
		},
		{
			label: 'Local',
			data: r.map((x) => x.ordersOnsite),
			backgroundColor: 'rgba(52, 211, 153, 0.85)',
		},
	];
});

const rankingColumns: RankingColumn[] = [
	{ key: 'name', label: 'Sucursal', format: 'text' },
	{ key: 'salesTotal', label: 'Ventas', format: 'currency', miniBar: true },
	{ key: 'ordersTotal', label: 'Pedidos', format: 'number', miniBar: true },
	{ key: 'deliveryTimeMinutes', label: 'Tiempo entrega', format: 'minutes', miniBar: true },
];

</script>
