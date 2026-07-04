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
	participationPercent: number;
};

const props = withDefaults(
	defineProps<{
		points: SalesHourlyChartPoint[];
		mode?: 'median' | 'total';
	}>(),
	{ mode: 'median' },
);

const chartData = computed(() => {
	const labels = props.points.map((p) => p.label);
	const data =
		props.mode === 'total'
			? props.points.map((p) => p.totalSalesCop)
			: props.points.map((p) => p.medianDailySalesCop);

	return {
		labels,
		datasets: [
			{
				label: props.mode === 'total' ? 'Venta total acumulada' : 'Mediana diaria',
				data,
				backgroundColor: 'rgba(5, 120, 90, 0.82)',
				borderRadius: 6,
				maxBarThickness: 44,
			},
		],
	};
});

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: { mode: 'index', intersect: false },
	plugins: {
		legend: {
			display: false,
			position: 'bottom',
			labels: { boxWidth: 12, usePointStyle: true },
		},
		tooltip: {
			callbacks: {
				title: (items) => items[0]?.label ?? '',
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
					return [
						`Venta total: ${formatTooltipCurrency(p.totalSalesCop)}`,
						`Mediana diaria: ${formatTooltipCurrency(p.medianDailySalesCop)}`,
						`Promedio diario: ${formatTooltipCurrency(p.averageDailySalesCop)}`,
						`Cantidad de pedidos: ${new Intl.NumberFormat('es-CO').format(p.orderCount)}`,
						`Ticket promedio: ${formatTooltipCurrency(p.averageTicketCop)}`,
						`Participacion: ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(p.participationPercent)} %`,
					];
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
