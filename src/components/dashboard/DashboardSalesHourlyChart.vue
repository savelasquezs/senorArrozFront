<template>
	<div class="relative w-full min-h-[240px] h-72 md:h-80">
		<Chart type="bar" :data="chartData" :options="chartOptions" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Chart } from 'vue-chartjs';
import type { ChartOptions } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { formatAxisCurrency, formatTooltipCurrency } from './chartFormat';

registerChartJs();

export type SalesHourlyChartPoint = {
	label: string;
	orderCount: number;
	totalSalesCop: number;
	averageDailySalesCop: number;
	medianDailySalesCop: number;
	averageTicketCop: number;
};

const props = defineProps<{
	points: SalesHourlyChartPoint[];
	medianLineCop: number | null;
}>();

const chartData = computed(() => {
	const labels = props.points.map((p) => p.label);
	const medianLine =
		props.medianLineCop != null && props.medianLineCop > 0
			? props.points.map(() => props.medianLineCop)
			: [];

	return {
		labels,
		datasets: [
			{
				type: 'bar' as const,
				label: 'Venta total',
				data: props.points.map((p) => p.totalSalesCop),
				backgroundColor: 'rgba(5, 120, 90, 0.82)',
				borderRadius: 6,
				maxBarThickness: 44,
				order: 3,
			},
			{
				type: 'line' as const,
				label: 'Mediana por hora',
				data: props.points.map((p) => p.medianDailySalesCop),
				borderColor: 'rgba(15, 23, 42, 0.9)',
				backgroundColor: 'rgba(15, 23, 42, 0)',
				pointBackgroundColor: 'rgba(15, 23, 42, 0.9)',
				pointRadius: 3,
				borderWidth: 2,
				tension: 0.25,
				order: 1,
			},
			{
				type: 'line' as const,
				label: 'Ticket promedio',
				data: props.points.map((p) => p.averageTicketCop),
				borderColor: 'rgba(37, 99, 235, 0.85)',
				backgroundColor: 'rgba(37, 99, 235, 0)',
				pointBackgroundColor: 'rgba(37, 99, 235, 0.85)',
				pointRadius: 2,
				borderWidth: 2,
				tension: 0.25,
				order: 2,
			},
			...(medianLine.length
				? [
						{
							type: 'line' as const,
							label: 'Mediana venta por hora',
							data: medianLine,
							borderColor: 'rgba(220, 38, 38, 0.85)',
							backgroundColor: 'rgba(220, 38, 38, 0)',
							pointRadius: 0,
							borderWidth: 2,
							borderDash: [6, 5],
							tension: 0,
							order: 0,
						},
					]
				: []),
		],
	};
});

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: { mode: 'index', intersect: false },
	plugins: {
		legend: {
			display: true,
			position: 'bottom',
			labels: { boxWidth: 12, usePointStyle: true },
		},
		tooltip: {
			callbacks: {
				label: (ctx) => {
					const v = Number(ctx.parsed.y);
					if (Number.isNaN(v)) return '';
					const raw = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
					return `${raw}${formatTooltipCurrency(v)}`;
				},
				footer: (items) => {
					const idx = items[0]?.dataIndex;
					const p = idx == null ? null : props.points[idx];
					if (!p) return '';
					return `Promedio por dia: ${formatTooltipCurrency(p.averageDailySalesCop)}`;
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
				callback: (val) => formatAxisCurrency(Number(val)),
			},
		},
	},
}));
</script>
