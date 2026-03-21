<template>
	<div class="relative w-full min-h-[180px] h-52 sm:h-64 md:min-h-[240px] md:h-72">
		<Bar :data="chartData" :options="chartOptions" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { formatAxisCurrency, formatTooltipCurrency } from './chartFormat';
import type { BarChartDataset } from './barChart.types';

registerChartJs();

/** Valor real del segmento (Chart.js en barras apiladas horizontales pone en `parsed.x` el acumulado, no el trozo). */
function segmentValue(ctx: TooltipItem<'bar'>): number | null {
	const raw = ctx.dataset.data[ctx.dataIndex];
	if (typeof raw === 'number') return raw;
	if (raw && typeof raw === 'object' && 'x' in raw) {
		const x = (raw as { x: unknown }).x;
		return typeof x === 'number' ? x : null;
	}
	return null;
}

const props = withDefaults(
	defineProps<{
		labels: string[];
		datasets: BarChartDataset[];
		yFormat?: 'currency' | 'number';
		/** Apila series en el eje de valores (útil para 70% / 30% en barras horizontales). */
		stacked?: boolean;
		/**
		 * Tooltip en 2 líneas: `Nombre — total` y `70%: x  30%: y`.
		 * Oculta filas por dataset y reduce tamaño; solo con `stacked` + `currency`.
		 */
		compactStackedTooltip?: boolean;
		/** Textos de la 2ª línea (p. ej. ['70%', '30%']). */
		stackedSegmentLabels?: readonly [string, string];
	}>(),
	{
		yFormat: 'number',
		stacked: false,
		compactStackedTooltip: false,
	},
);

const chartData = computed<ChartData<'bar'>>(() => ({
	labels: [...props.labels],
	datasets: props.datasets.map((ds) => ({
		label: ds.label,
		data: [...ds.data],
		backgroundColor: ds.backgroundColor ?? 'rgba(5, 120, 90, 0.8)',
		borderRadius: 6,
		maxBarThickness: 22,
		...(ds.stack != null ? { stack: ds.stack } : {}),
	})),
}));

const chartOptions = computed<ChartOptions<'bar'>>(() => {
	const yFormat = props.yFormat;
	const stacked = props.stacked;
	const compact =
		Boolean(props.compactStackedTooltip) && stacked && yFormat === 'currency';
	const segLabels = props.stackedSegmentLabels ?? (['70%', '30%'] as const);

	return {
	responsive: true,
	maintainAspectRatio: false,
	indexAxis: 'y',
	interaction: {
		mode: stacked ? 'index' : 'nearest',
		/** Sobre barras apiladas: el puntero debe intersectar la barra (menos “saltos” al mover el mouse). */
		intersect: stacked,
	},
	plugins: {
		legend: {
			display: props.datasets.length > 1,
			position: 'bottom',
		},
		tooltip: {
			...(compact
				? {
						displayColors: false,
						padding: 6,
						titleMarginBottom: 3,
						bodySpacing: 2,
						titleFont: { size: 11, weight: 600 },
						bodyFont: { size: 10 },
						footerFont: { size: 10 },
						caretSize: 4,
						boxPadding: 2,
					}
				: {}),
			callbacks: {
				title: (items) => {
					if (!items.length) return '';
					const chart = items[0].chart;
					const dataIndex = items[0].dataIndex;
					const name =
						chart.data.labels != null && chart.data.labels[dataIndex] != null
							? String(chart.data.labels[dataIndex])
							: '';

					if (compact) {
						const d0 = chart.data.datasets[0]?.data[dataIndex];
						const d1 = chart.data.datasets[1]?.data[dataIndex];
						const v0 = typeof d0 === 'number' ? d0 : 0;
						const v1 = typeof d1 === 'number' ? d1 : 0;
						const total = v0 + v1;
						return `${name} — ${formatTooltipCurrency(total)}`;
					}

					return name;
				},
				label: (ctx) => {
					if (compact) {
						if (ctx.datasetIndex !== 0) return '';
						const dataIndex = ctx.dataIndex;
						const chart = ctx.chart;
						const d0 = chart.data.datasets[0]?.data[dataIndex];
						const d1 = chart.data.datasets[1]?.data[dataIndex];
						const v0 = typeof d0 === 'number' ? d0 : 0;
						const v1 = typeof d1 === 'number' ? d1 : 0;
						const [l0, l1] = segLabels;
						return `${l0}: ${formatTooltipCurrency(v0)}  ${l1}: ${formatTooltipCurrency(v1)}`;
					}
					const v = stacked ? segmentValue(ctx) : ctx.parsed.x;
					if (v == null || Number.isNaN(Number(v))) return '';
					const n = Number(v);
					const prefix = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
					if (yFormat === 'currency') return `${prefix}${formatTooltipCurrency(n)}`;
					return `${prefix}${new Intl.NumberFormat('es-CO').format(n)}`;
				},
				footer: (items) => {
					if (compact) return '';
					if (!stacked || yFormat !== 'currency' || !items.length) return '';
					const chart = items[0]?.chart;
					const dataIndex = items[0]?.dataIndex;
					if (chart == null || dataIndex == null) return '';
					const total = chart.data.datasets.reduce((acc, ds) => {
						const raw = ds.data[dataIndex];
						const n = typeof raw === 'number' ? raw : 0;
						return acc + n;
					}, 0);
					return `Total barra: ${formatTooltipCurrency(total)}`;
				},
			},
		},
	},
	scales: {
		x: {
			stacked,
			beginAtZero: true,
			grid: { color: 'rgba(0,0,0,0.06)' },
			ticks: {
				callback: (val) => {
					const n = Number(val);
					if (yFormat === 'currency') return formatAxisCurrency(n);
					return new Intl.NumberFormat('es-CO').format(n);
				},
			},
		},
		y: {
			grid: { display: false },
			ticks: { autoSkip: false },
		},
	},
};
});
</script>
