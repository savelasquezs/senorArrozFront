<template>
	<div class="relative w-full min-h-[200px] h-52 sm:h-60 md:h-80">
		<Line :data="chartData" :options="chartOptions" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { formatAxisCurrency, formatTooltipCurrency } from './chartFormat';
import type { LineChartDataset } from './lineChart.types';
import { getBranchSeriesColor } from './chartColors';

registerChartJs();

const props = withDefaults(
	defineProps<{
		labels: string[];
		datasets: LineChartDataset[];
		yFormat?: 'currency' | 'number';
		/**
		 * `line`: solo trazo.
		 * `area`: relleno bajo la línea (útil para una serie o pocas).
		 */
		variant?: 'line' | 'area';
		curveTension?: number;
	}>(),
	{
		yFormat: 'number',
		variant: 'line',
		curveTension: 0.35,
	},
);

const chartData = computed<ChartData<'line'>>(() => ({
	labels: [...props.labels],
	datasets: props.datasets.map((ds, i) => {
		const pal = getBranchSeriesColor(i);
		const border = ds.borderColor ?? pal.border;
		const fillBg = ds.backgroundColor ?? pal.area;
		return {
			label: ds.label,
			data: [...ds.data],
			borderColor: border,
			backgroundColor: props.variant === 'area' ? fillBg : 'rgba(0,0,0,0)',
			fill: props.variant === 'area',
			tension: props.curveTension,
			pointBackgroundColor: border,
			pointRadius: props.variant === 'area' ? 2 : 3,
			pointHoverRadius: 5,
			borderWidth: 2,
		};
	}),
}));

const chartOptions = computed<ChartOptions<'line'>>(() => {
	const yFormat = props.yFormat;
	return {
		responsive: true,
		maintainAspectRatio: false,
		interaction: { mode: 'index', intersect: false },
		plugins: {
			legend: {
				display: props.datasets.length > 1,
				position: 'bottom',
				labels: { boxWidth: 12, usePointStyle: true },
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
				grid: { display: false },
				ticks: { maxRotation: 45, minRotation: 0, autoSkip: true },
			},
			y: {
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
