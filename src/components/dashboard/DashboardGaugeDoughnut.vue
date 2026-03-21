<template>
	<div class="relative flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px]">
		<div class="relative w-[88%] max-w-[200px] aspect-[2/1]">
			<Doughnut :data="chartData" :options="chartOptions" />
			<div
				class="absolute inset-0 flex flex-col items-center justify-end pb-0 pointer-events-none"
				style="padding-bottom: 8%"
			>
				<span class="text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 leading-none">
					{{ displayMinutes }}
				</span>
				<span class="text-[10px] sm:text-xs text-gray-500 mt-0.5">min</span>
			</div>
		</div>
		<p v-if="subtitle" class="text-[11px] text-gray-500 mt-1 text-center px-2">{{ subtitle }}</p>
		<p class="text-xs text-gray-400 mt-2 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
			<span class="text-emerald-600">&lt; {{ greenMax }} min</span>
			<span class="text-amber-600">{{ greenMax }}–{{ yellowMax }} min</span>
			<span class="text-red-600">&gt; {{ yellowMax }} min</span>
		</p>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { registerChartJs } from './registerChartJs';
import { minuteGaugeColor } from './gaugeColors';

registerChartJs();

const props = withDefaults(
	defineProps<{
		/** Valor mostrado (minutos promedio) */
		valueMinutes: number;
		/** Escala máxima del arco (minutos) */
		scaleMax?: number;
		greenMax?: number;
		yellowMax?: number;
		subtitle?: string;
	}>(),
	{
		scaleMax: 60,
		greenMax: 30,
		yellowMax: 45,
		subtitle: '',
	},
);

const displayMinutes = computed(() =>
	Math.round((props.valueMinutes + Number.EPSILON) * 10) / 10,
);

const arcColor = computed(() =>
	minuteGaugeColor(props.valueMinutes, props.greenMax, props.yellowMax),
);

const chartData = computed<ChartData<'doughnut'>>(() => {
	const v = Math.min(Math.max(0, props.valueMinutes), props.scaleMax);
	const rest = Math.max(0, props.scaleMax - v);
	return {
		labels: ['valor', 'resto'],
		datasets: [
			{
				data: [v, rest],
				backgroundColor: [arcColor.value, 'rgb(243, 244, 246)'],
				borderWidth: 0,
				hoverOffset: 0,
			},
		],
	};
});

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	cutout: '72%',
	rotation: -90,
	circumference: 180,
	plugins: {
		legend: { display: false },
		tooltip: {
			enabled: true,
			callbacks: {
				label: (ctx) => {
					if (ctx.dataIndex === 0) return ` ${displayMinutes.value} min`;
					return '';
				},
				filter: (item) => item.dataIndex === 0,
			},
		},
	},
}));
</script>
