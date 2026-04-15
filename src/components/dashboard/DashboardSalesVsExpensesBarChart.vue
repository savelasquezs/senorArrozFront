<template>
	<div class="relative w-full min-h-[220px] h-64 sm:h-72 md:h-80">
		<Bar v-if="hasData" :data="chartData" :options="chartOptions" />
		<div
			v-else
			class="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 text-sm text-gray-500"
		>
			Sin datos para el periodo seleccionado.
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { formatAxisCurrency, formatTooltipCurrency } from './chartFormat';
registerChartJs();

const expenseFillColors = [
	'rgba(37, 99, 235, 0.82)',
	'rgba(194, 65, 12, 0.82)',
	'rgba(124, 58, 237, 0.82)',
	'rgba(180, 83, 9, 0.82)',
	'rgba(219, 39, 119, 0.78)',
	'rgba(13, 148, 136, 0.82)',
	'rgba(79, 70, 229, 0.78)',
	'rgba(161, 98, 7, 0.82)',
	'rgba(100, 116, 139, 0.78)',
];

const props = defineProps<{
	labels: string[];
	salesCop: number[];
	expenseCategories: Array<{ name: string; amountsCop: number[] }>;
}>();

const hasData = computed(
	() => props.labels.length > 0 && (props.salesCop.some((v) => v > 0) || props.expenseCategories.length > 0),
);

const chartData = computed<ChartData<'bar'>>(() => {
	const salesDataset = {
		label: 'Ventas',
		data: props.salesCop.map((v) => Number(v)),
		stack: 'sales',
		backgroundColor: 'rgba(5, 120, 90, 0.88)',
		borderRadius: 6,
		maxBarThickness: 48,
	};

	const expenseDatasets = props.expenseCategories.map((c, i) => ({
		label: c.name,
		data: c.amountsCop.map((v) => Number(v)),
		stack: 'expenses',
		backgroundColor: expenseFillColors[i % expenseFillColors.length],
		borderRadius: 4,
		maxBarThickness: 48,
	}));

	return {
		labels: [...props.labels],
		datasets: [salesDataset, ...expenseDatasets],
	};
});

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	indexAxis: 'x',
	interaction: { mode: 'index', intersect: false },
	plugins: {
		legend: {
			display: true,
			position: 'bottom',
			labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true },
		},
		tooltip: {
			displayColors: false,
			filter: (item) => item.datasetIndex === 0,
			callbacks: {
				label: (ctx) => {
					if (ctx.datasetIndex !== 0) return '';
					const i = ctx.dataIndex;
					const sales = Number(props.salesCop[i] ?? 0);
					const lines: string[] = [`Ventas: ${formatTooltipCurrency(sales)}`];

					let totalExpenses = 0;
					const breakdown = props.expenseCategories.map((c) => {
						const amount = Number(c.amountsCop[i] ?? 0);
						totalExpenses += amount;
						return { name: c.name, amount };
					});

					lines.push(`Total gastos: ${formatTooltipCurrency(totalExpenses)}`);
					for (const { name, amount } of breakdown) {
						if (amount === 0) continue;
						const pct =
							totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
						lines.push(`  ${name}: ${formatTooltipCurrency(amount)} (${pct}%)`);
					}

					return lines;
				},
			},
		},
	},
	scales: {
		x: {
			stacked: true,
			grid: { display: false },
			ticks: { maxRotation: 45, minRotation: 0, autoSkip: true },
		},
		y: {
			stacked: true,
			beginAtZero: true,
			grid: { color: 'rgba(0,0,0,0.06)' },
			ticks: {
				callback: (val) => formatAxisCurrency(Number(val)),
			},
		},
	},
}));
</script>
