<template>
	<div class="relative w-full min-h-[220px] sm:min-h-[260px] flex flex-col items-center">
		<div class="relative w-full max-w-[280px] aspect-square mx-auto">
			<Doughnut :data="chartData" :options="chartOptions" />
		</div>
		<ul
			v-if="legendItems.length"
			class="mt-3 w-full max-w-md text-xs text-gray-600 space-y-1 px-2"
		>
			<li v-for="(item, i) in legendItems" :key="i" class="flex justify-between gap-2">
				<span class="flex items-center gap-2 min-w-0">
					<span
						class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
						:style="{ backgroundColor: item.color }"
					/>
					<span class="truncate">{{ item.label }}</span>
				</span>
				<span class="shrink-0 tabular-nums font-medium text-gray-800">{{ item.percent }}%</span>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { branchSeriesColors } from './chartColors';
import { formatTooltipGrams } from './chartFormat';

registerChartJs();

const props = defineProps<{
	labels: string[];
	/** Gramos por categoría (tamaño del arco). */
	values: number[];
	/** Porcentajes 0–100 alineados a labels. */
	percents: number[];
}>();

const colors = computed(() =>
	props.labels.map((_, i) => {
		const c = branchSeriesColors[i % branchSeriesColors.length];
		return c.area;
	}),
);

const legendItems = computed(() =>
	props.labels.map((label, i) => ({
		label,
		percent: props.percents[i] ?? 0,
		color: colors.value[i] ?? '#888',
	})),
);

const chartData = computed<ChartData<'doughnut'>>(() => ({
	labels: [...props.labels],
	datasets: [
		{
			data: [...props.values],
			backgroundColor: colors.value,
			borderWidth: 2,
			borderColor: '#fff',
		},
	],
}));

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	cutout: '58%',
	plugins: {
		legend: { display: false },
		tooltip: {
			callbacks: {
				label: (ctx) => {
					const v = typeof ctx.raw === 'number' ? ctx.raw : 0;
					const i = ctx.dataIndex;
					const pct = props.percents[i];
					return ` ${formatTooltipGrams(v)} (${pct ?? 0}%)`;
				},
			},
		},
	},
}));
</script>
