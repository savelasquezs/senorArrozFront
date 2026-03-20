<template>
	<div class="relative w-full min-h-[200px] h-52 sm:h-60 md:h-72">
		<Bar :data="chartData" :options="chartOptions" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { formatAxisCurrency, formatTooltipCurrency } from './chartFormat';
import type { BarChartDataset } from './barChart.types';

registerChartJs();

const props = withDefaults(
	defineProps<{
		labels: string[];
		datasets: BarChartDataset[];
		/** Barras apiladas (p. ej. Delivery + Local) */
		stacked?: boolean;
		/** Formato del eje Y y tooltips */
		yFormat?: 'currency' | 'number';
	}>(),
	{
		stacked: false,
		yFormat: 'number',
	},
);

const chartData = computed<ChartData<'bar'>>(() => ({
	labels: [...props.labels],
	datasets: props.datasets.map((ds) => ({
		label: ds.label,
		data: [...ds.data],
		backgroundColor: ds.backgroundColor ?? 'rgba(5, 150, 105, 0.85)',
		borderRadius: 6,
		maxBarThickness: 44,
	})),
}));

const chartOptions = computed<ChartOptions<'bar'>>(() => {
	const yFormat = props.yFormat;
	return {
		responsive: true,
		maintainAspectRatio: false,
		indexAxis: 'x',
		interaction: { mode: 'index', intersect: false },
		plugins: {
			legend: {
				display: props.datasets.length > 1,
				position: 'bottom',
				labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true },
			},
			tooltip: {
				callbacks: {
					label: (ctx) => {
						const v = ctx.parsed.y;
						if (v == null) return '';
						const raw = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
						if (yFormat === 'currency') return `${raw}${formatTooltipCurrency(v)}`;
						return `${raw}${new Intl.NumberFormat('es-CO').format(v)}`;
					},
				},
			},
		},
		scales: {
			x: {
				stacked: props.stacked,
				grid: { display: false },
				ticks: { maxRotation: 45, minRotation: 0, autoSkip: true },
			},
			y: {
				stacked: props.stacked,
				beginAtZero: true,
				grid: { color: 'rgba(0,0,0,0.06)' },
				ticks: {
					callback: (val) => {
						const n = Number(val);
						if (yFormat === 'currency') return formatAxisCurrency(n);
						return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
					},
				},
			},
		},
	};
});
</script>
