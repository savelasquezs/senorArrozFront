<template>
	<div class="relative w-full min-h-[220px] h-64 sm:h-72">
		<ScatterChart :data="chartData" :options="chartOptions" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Scatter as ScatterChart } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { formatTooltipCurrency } from './chartFormat';
import type { DeliveryScatterPoint } from './operation.types';
import { DELIVERY_FEE_DRIVER_SHARE } from '@/constants/deliveryFeeShare';

registerChartJs();

const props = defineProps<{
	points: DeliveryScatterPoint[];
	label?: string;
	xAxisLabel?: string;
	yAxisLabel?: string;
}>();

const chartData = computed<ChartData<'scatter'>>(() => ({
	datasets: [
		{
			label: props.label ?? 'Domiciliarios',
			data: props.points.map((p) => ({
				x: p.x,
				y: p.y,
				name: p.name,
				deliveryFeeTotal: p.deliveryFeeTotal,
			})),
			backgroundColor: 'rgba(5, 120, 90, 0.75)',
			borderColor: 'rgb(5, 100, 80)',
			borderWidth: 1,
			pointRadius: 8,
			pointHoverRadius: 10,
		},
	],
}));

const chartOptions = computed<ChartOptions<'scatter'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: { display: false },
		tooltip: {
			callbacks: {
				title: () => '',
				label: (ctx) => {
					const raw = ctx.raw as Record<string, unknown>;
					const name = String(raw.name ?? '');
					const x = Number(raw.x);
					const y = Number(raw.y);
					const fee = raw.deliveryFeeTotal;
					const pct = Math.round(DELIVERY_FEE_DRIVER_SHARE * 100);
					const feePart =
						typeof fee === 'number' && fee > 0
							? ` · ${formatTooltipCurrency(fee)} fees (${pct}%: ${formatTooltipCurrency(Math.round(fee * DELIVERY_FEE_DRIVER_SHARE))})`
							: '';
					return `${name}: ${Math.round(x)} min promedio · ${y} entregas${feePart}`;
				},
			},
		},
	},
	scales: {
		x: {
			title: {
				display: true,
				text: props.xAxisLabel ?? 'Tiempo medio entrega (min)',
			},
			grid: { color: 'rgba(0,0,0,0.06)' },
		},
		y: {
			beginAtZero: true,
			title: {
				display: true,
				text: props.yAxisLabel ?? 'Pedidos entregados',
			},
			grid: { color: 'rgba(0,0,0,0.06)' },
			ticks: { stepSize: 1 },
		},
	},
}));
</script>
