<template>
	<div class="relative w-full" :class="expanded ? 'h-[55dvh] min-h-72 max-h-[640px]' : compact ? 'h-40 min-h-40 min-[56.25rem]:h-[90px] min-[56.25rem]:min-h-[90px]' : 'min-h-[200px] h-52 sm:h-60 md:h-80'">
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
		yFormat?: 'currency' | 'number' | 'percent';
		/**
		 * `line`: solo trazo.
		 * `area`: relleno bajo la línea (útil para una serie o pocas).
		 */
		variant?: 'line' | 'area';
		curveTension?: number;
        spanGaps?: boolean;
        compact?: boolean;
        expanded?: boolean;
	}>(),
	{
		yFormat: 'number',
		variant: 'line',
		curveTension: 0.35,
        spanGaps: true,
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
			spanGaps: props.spanGaps,
			pointBackgroundColor: border,
			pointRadius: ds.pointRadius ?? (props.variant === 'area' ? 2 : 3),
            borderDash: ds.borderDash,
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
				labels: { boxWidth: 12, usePointStyle: true, font: { size: props.compact ? 9 : 12 }, padding: props.compact ? 5 : 10 },
			},
			tooltip: {
				callbacks: {
					label: (ctx) => {
						const v = ctx.parsed.y;
						if (v == null) return '';
						const raw = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
						if (yFormat === 'currency') return `${raw}${formatTooltipCurrency(v)}`;
						if (yFormat === 'percent') {
							return `${raw}${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(v)} %`;
						}
						return `${raw}${new Intl.NumberFormat('es-CO').format(v)}`;
					},
				},
			},
		},
		scales: {
			x: {
				grid: { display: false },
				ticks: { maxRotation: props.compact ? 0 : 45, minRotation: 0, autoSkip: true, maxTicksLimit: props.compact ? 4 : undefined, font: { size: props.compact ? 9 : 12 } },
			},
			y: {
				beginAtZero: true,
				grid: { color: 'rgba(0,0,0,0.06)' },
				ticks: {
                    maxTicksLimit: props.compact ? 4 : undefined,
                    font: { size: props.compact ? 9 : 12 },
					callback: (val) => {
						const n = Number(val);
						if (yFormat === 'currency') return formatAxisCurrency(n);
						if (yFormat === 'percent') {
							return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(n)} %`;
						}
						return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
					},
				},
			},
		},
	};
});
</script>
