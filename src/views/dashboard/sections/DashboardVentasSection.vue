<template>
	<div class="space-y-6">
		<div
			v-if="loading"
			class="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
		>
			Cargando sección Ventas…
		</div>
		<div
			v-else-if="error"
			class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
		>
			{{ error }}
		</div>
		<template v-else>
			<section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<BaseCard v-for="card in summaryCards" :key="card.label" :padding="'md'" :shadow="'sm'">
					<p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
					<p class="mt-1 truncate text-lg font-semibold text-gray-900">{{ card.value }}</p>
					<p v-if="card.hint" class="mt-1 text-xs text-gray-500">{{ card.hint }}</p>
				</BaseCard>
			</section>

			<BranchComparisonPanel v-if="showBranchComparison" :rows="comparisonRows" />

			<TimeEvolutionPanel
				v-model:time-granularity="timeGranularity"
				:sales-by-day="salesByDay"
				:sales-by-fortnight="salesByFortnight"
				:sales-by-month="salesByMonth"
				:sales-by-year="salesByYear"
				:orders-by-day="ordersByDay"
				:orders-by-fortnight="ordersByFortnight"
				:orders-by-month="ordersByMonth"
				:orders-by-year="ordersByYear"
				:sales-median-cop="dailyMedianLine"
			/>

			<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
				<BaseCard title="Ventas por hora" :padding="'md'">
					<div class="mb-3 flex justify-end">
						<DashboardSegmentedTabs
							v-model="hourlySalesMode"
							:options="hourlySalesModeOptions"
							aria-label="Metrica de ventas por hora"
						/>
					</div>
					<div v-if="!hasHourlyPoints" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin pedidos para las horas del rango filtrado.
					</div>
					<DashboardSalesHourlyChart
						v-else
						:points="hourlyPoints"
						:mode="hourlySalesMode"
					/>
				</BaseCard>

				<BaseCard title="Ticket promedio por hora" :padding="'md'">
					<div v-if="!hasHourlyPoints" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin pedidos para las horas del rango filtrado.
					</div>
					<DashboardLineChart
						v-else
						:labels="hourlyLabels"
						:datasets="hourlyTicketDatasets"
						y-format="currency"
					/>
				</BaseCard>
			</section>

			<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
				<BaseCard title="ParticipaciÃ³n de ventas por hora" :padding="'md'">
					<div v-if="!hasHourlyPoints" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin ventas para calcular participaciÃ³n.
					</div>
					<DashboardHorizontalBarChart
						v-else
						:labels="hourlyParticipationLabels"
						:datasets="hourlyParticipationDatasets"
						y-format="percent"
					/>
				</BaseCard>

				<BaseCard title="HistÃ³rico por dÃ­a de la semana" :padding="'md'">
					<div class="mb-3 flex justify-end">
						<select
							v-model="selectedHistoryDayOfWeek"
							class="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
							aria-label="Dia de la semana del historico"
						>
							<option
								v-for="option in localDayOfWeekOptions"
								:key="String(option.value)"
								:value="option.value"
							>
								{{ option.label }}
							</option>
						</select>
					</div>
					<div v-if="!hasFilteredDailyHistory" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin ventas para ese dÃ­a en el rango filtrado.
					</div>
					<DashboardLineChart
						v-else
						:labels="historyLabels"
						:datasets="historyDatasets"
						y-format="currency"
						:curve-tension="0.2"
					/>
				</BaseCard>
			</section>

			<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
				<BaseCard title="Heatmap de ventas" :padding="'md'">
					<div v-if="!hasHeatmap" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin datos para el heatmap.
					</div>
					<div v-else class="overflow-x-auto">
						<table class="min-w-full border-separate border-spacing-1 text-xs">
							<thead>
								<tr>
									<th class="w-24 px-2 py-1 text-left font-semibold text-gray-500">DÃ­a</th>
									<th
										v-for="hour in heatmapHours"
										:key="hour.hour"
										class="px-2 py-1 text-center font-semibold text-gray-500"
									>
										{{ hour.label }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="day in heatmapDays" :key="day.value">
									<th class="px-2 py-1 text-left font-medium text-gray-700">{{ day.label }}</th>
									<td
										v-for="hour in heatmapHours"
										:key="`${day.value}-${hour.hour}`"
										class="min-w-20 rounded px-2 py-2 text-center font-medium"
										:style="heatmapCellStyle(day.value, hour.hour)"
										:title="`${day.label} ${hour.label}: ${formatCop(heatmapValue(day.value, hour.hour))}`"
									>
										{{ formatCompactCop(heatmapValue(day.value, hour.hour)) }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</BaseCard>

				<BaseCard title="Resumen por hora" :padding="'md'">
					<div v-if="!hasHourlyPoints" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin datos por hora.
					</div>
					<div v-else class="max-h-80 overflow-auto">
						<table class="min-w-full text-left text-xs">
							<thead class="sticky top-0 bg-white text-gray-500">
								<tr>
									<th class="px-2 py-2 font-semibold">Hora</th>
									<th class="px-2 py-2 font-semibold">Venta total</th>
									<th class="px-2 py-2 font-semibold">Promedio diario</th>
									<th class="px-2 py-2 font-semibold">Mediana diaria</th>
									<th class="px-2 py-2 font-semibold">Pedidos</th>
									<th class="px-2 py-2 font-semibold">Ticket promedio</th>
									<th class="px-2 py-2 font-semibold">ParticipaciÃ³n</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								<tr v-for="p in hourlyPoints" :key="p.hour" class="text-gray-700">
									<td class="px-2 py-2 font-medium">{{ p.label }}</td>
									<td class="px-2 py-2">{{ formatCop(p.totalSalesCop) }}</td>
									<td class="px-2 py-2">{{ formatCop(p.averageDailySalesCop) }}</td>
									<td class="px-2 py-2">{{ formatCop(p.medianDailySalesCop) }}</td>
									<td class="px-2 py-2">{{ formatNumber(p.orderCount) }}</td>
									<td class="px-2 py-2">{{ formatCop(p.averageTicketCop) }}</td>
									<td class="px-2 py-2">{{ formatPercent(p.participationPercent) }}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</BaseCard>
			</section>

			<section class="space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<span class="text-lg" aria-hidden="true">{{ rankingSectionEmoji }}</span>
						<h2 class="text-base font-semibold text-gray-900">{{ rankingSectionTitle }}</h2>
					</div>
					<DashboardSegmentedTabs
						v-model="productsGroupByModel"
						:options="productsGroupOptions"
						aria-label="Ver gráficas por producto o por categoría"
					/>
				</div>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<BaseCard title="Más vendidos" :padding="'md'">
						<p class="text-xs text-gray-500 mb-3">
							Top por <strong>unidades</strong> en el mismo periodo del gráfico (hasta 10).
							<span v-if="isCategoryMode"> Agrupado por <strong>categoría</strong>.</span>
							<span v-else> Por <strong>producto</strong>.</span>
						</p>
						<div
							v-if="!hasProductBars"
							class="h-48 flex items-center justify-center text-sm text-gray-500"
						>
							Sin datos de {{ rankingEmptyLabel }} en este rango (o modo mock de ventas).
						</div>
						<div v-else class="min-h-[200px]">
							<DashboardHorizontalBarChart
								:labels="productBarLabels"
								:datasets="productBarDatasets"
								y-format="number"
							/>
						</div>
					</BaseCard>
					<BaseCard title="Participación" :padding="'md'">
						<p class="text-xs text-gray-500 mb-2">
							Concentración del <strong>recaudo</strong> (top 5 + Otros si aplica).
							<span v-if="isCategoryMode"> Por <strong>categoría</strong>.</span>
						</p>
						<div
							v-if="!hasParticipation"
							class="h-52 flex items-center justify-center text-sm text-gray-500"
						>
							Sin datos para el donut en este rango.
						</div>
						<DashboardRevenueShareDonut
							v-else
							:labels="participationLabels"
							:values="participationValues"
							:percents="participationPercents"
						/>
					</BaseCard>
				</div>
			</section>

			<CategoryWeightAnalyticsPanel
				:date-range="dateRange"
				:time-granularity="timeGranularity"
				:branch-id="branchId"
			/>

			<BaseCard title="Pedidos por estado" class="col-span-1">
				<div class="h-64 sm:h-80">
					<div class="flex items-center justify-center h-full text-gray-500 text-sm">
						Gráfico pendiente (Chart.js)
					</div>
				</div>
			</BaseCard>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import {
	BranchComparisonPanel,
	TimeEvolutionPanel,
	DashboardLineChart,
	DashboardHorizontalBarChart,
	DashboardRevenueShareDonut,
	DashboardSegmentedTabs,
	CategoryWeightAnalyticsPanel,
	DashboardSalesHourlyChart,
	type BranchComparisonRow,
	type SalesTimeSeriesBlock,
	type OrdersPerHourBlock,
	type BarChartDataset,
	type LineChartDataset,
} from '@/components/dashboard';
import type {
	VentasProductsGroupBy,
	VentasProductsPayload,
	VentasSalesHourlyPayload,
} from '@/services/MainAPI/dashboardSectionApi';
import type { DashboardTimeGranularity } from '@/views/dashboard/dashboardGlobalFilters';

const props = withDefaults(
	defineProps<{
		loading: boolean;
		error: string | null;
		showBranchComparison?: boolean;
		comparisonRows: BranchComparisonRow[];
		dateRange: [Date, Date];
		salesByDay: SalesTimeSeriesBlock;
		salesByFortnight: SalesTimeSeriesBlock;
		salesByMonth: SalesTimeSeriesBlock;
		salesByYear: SalesTimeSeriesBlock;
		ordersByDay: OrdersPerHourBlock;
		ordersByFortnight: OrdersPerHourBlock;
		ordersByMonth: OrdersPerHourBlock;
		ordersByYear: OrdersPerHourBlock;
		/** Desde API; null con mock o sin ventas. */
		productsPayload: VentasProductsPayload | null;
		hourlyPayload: VentasSalesHourlyPayload | null;
		/** Sucursal del filtro global (peso por categoría usa API real). */
		branchId: number | null;
	}>(),
	{ showBranchComparison: true },
);

const productsGroupBy = defineModel<VentasProductsGroupBy>('productsGroupBy', { default: 'product' });
const timeGranularity = defineModel<DashboardTimeGranularity>('timeGranularity', { default: 'day' });
const hourlySalesMode = ref<'median' | 'total'>('median');
const selectedHistoryDayOfWeek = ref<'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7>('all');

/** Tabs usan `string`; enlazamos al mismo ref que el padre. */
const productsGroupByModel = computed({
	get: () => productsGroupBy.value,
	set: (v: string) => {
		if (v === 'product' || v === 'category') productsGroupBy.value = v;
	},
});

const productsGroupOptions = [
	{ value: 'product', label: 'Productos' },
	{ value: 'category', label: 'Categorías' },
];

const isCategoryMode = computed(() => productsGroupBy.value === 'category');

const hourlySalesModeOptions = [
	{ value: 'median', label: 'Mediana diaria' },
	{ value: 'total', label: 'Total acumulado' },
];

const localDayOfWeekOptions: Array<{ value: 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string }> = [
	{ value: 'all', label: 'Todos los dias' },
	{ value: 1, label: 'Lunes' },
	{ value: 2, label: 'Martes' },
	{ value: 3, label: 'Miercoles' },
	{ value: 4, label: 'Jueves' },
	{ value: 5, label: 'Viernes' },
	{ value: 6, label: 'Sabado' },
	{ value: 7, label: 'Domingo' },
];

const rankingSectionTitle = computed(() =>
	isCategoryMode.value ? 'Categorías' : 'Productos',
);

const rankingSectionEmoji = computed(() => (isCategoryMode.value ? '📂' : '🍗'));

const rankingEmptyLabel = computed(() => (isCategoryMode.value ? 'categorías' : 'productos'));

const hasProductBars = computed(
	() => (props.productsPayload?.topByQuantity.length ?? 0) > 0,
);

const hasParticipation = computed(
	() => (props.productsPayload?.participationLabels.length ?? 0) > 0,
);

const productBarLabels = computed(() =>
	(props.productsPayload?.topByQuantity ?? []).map((p) => p.name),
);

const productBarDatasets = computed((): BarChartDataset[] => [
	{
		label: 'Unidades vendidas',
		data: (props.productsPayload?.topByQuantity ?? []).map((p) => p.quantitySold),
		backgroundColor: 'rgba(5, 120, 90, 0.85)',
	},
]);

const participationLabels = computed(() => props.productsPayload?.participationLabels ?? []);
const participationValues = computed(() => props.productsPayload?.participationValues ?? []);
const participationPercents = computed(() => props.productsPayload?.participationPercents ?? []);

const hourlyPoints = computed(() => props.hourlyPayload?.points ?? []);
const hasHourlyPoints = computed(() => hourlyPoints.value.length > 0);
const dailyMedianLine = computed(() => props.hourlyPayload?.summary.medianDailySalesCop ?? null);
const hourlyLabels = computed(() => hourlyPoints.value.map((p) => p.label));
const hourlyTicketDatasets = computed((): LineChartDataset[] => [
	{
		label: 'Ticket promedio',
		data: hourlyPoints.value.map((p) => p.averageTicketCop),
		borderColor: 'rgba(37, 99, 235, 0.85)',
		backgroundColor: 'rgba(37, 99, 235, 0.12)',
	},
]);

function median(values: number[]): number {
	const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
	if (sorted.length === 0) return 0;
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[middle];
	return (sorted[middle - 1] + sorted[middle]) / 2;
}

const hourlyParticipationRows = computed(() =>
	[...hourlyPoints.value].sort((a, b) => b.participationPercent - a.participationPercent),
);
const hourlyParticipationLabels = computed(() => hourlyParticipationRows.value.map((p) => p.label));
const hourlyParticipationDatasets = computed((): BarChartDataset[] => [
	{
		label: '% ventas',
		data: hourlyParticipationRows.value.map((p) => p.participationPercent),
		backgroundColor: 'rgba(5, 120, 90, 0.82)',
	},
]);

const filteredDailyHistory = computed(() => {
	const rows = props.hourlyPayload?.dailyHistory ?? [];
	if (selectedHistoryDayOfWeek.value === 'all') return rows;
	return rows.filter((p) => p.dayOfWeek === selectedHistoryDayOfWeek.value);
});
const hasFilteredDailyHistory = computed(() => filteredDailyHistory.value.length > 0);
const historyLabels = computed(() => filteredDailyHistory.value.map((p) => p.label));
const historyMedian = computed(() => median(filteredDailyHistory.value.map((p) => p.totalSalesCop)));
const historyAverage = computed(() => {
	const rows = filteredDailyHistory.value;
	if (rows.length === 0) return 0;
	return rows.reduce((sum, p) => sum + p.totalSalesCop, 0) / rows.length;
});
const historyDatasets = computed((): LineChartDataset[] => [
	{
		label: 'Ventas',
		data: filteredDailyHistory.value.map((p) => p.totalSalesCop),
		borderColor: 'rgba(5, 120, 90, 0.9)',
		backgroundColor: 'rgba(5, 120, 90, 0.12)',
	},
	{
		label: 'Mediana historica',
		data: filteredDailyHistory.value.map(() => historyMedian.value),
		borderColor: 'rgba(220, 38, 38, 0.85)',
		backgroundColor: 'rgba(220, 38, 38, 0)',
	},
	{
		label: 'Promedio historico',
		data: filteredDailyHistory.value.map(() => historyAverage.value),
		borderColor: 'rgba(37, 99, 235, 0.85)',
		backgroundColor: 'rgba(37, 99, 235, 0)',
	},
]);

const heatmapRows = computed(() => props.hourlyPayload?.heatmap ?? []);
const hasHeatmap = computed(() => heatmapRows.value.length > 0);
const heatmapHours = computed(() => {
	const byHour = new Map<number, string>();
	for (const p of heatmapRows.value) byHour.set(p.hour, p.hourLabel);
	return [...byHour.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([hour, label]) => ({ hour, label }));
});
const heatmapDays = computed(() =>
	localDayOfWeekOptions.filter((o): o is { value: 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string } => o.value !== 'all'),
);
const heatmapMax = computed(() =>
	Math.max(0, ...heatmapRows.value.map((p) => p.medianDailySalesCop)),
);
const heatmapLookup = computed(() => {
	const m = new Map<string, number>();
	for (const p of heatmapRows.value) m.set(`${p.dayOfWeek}-${p.hour}`, p.medianDailySalesCop);
	return m;
});

const selectedHistoryDayLabel = computed(() => {
	if (selectedHistoryDayOfWeek.value === 'all') return 'Todos los dias';
	return localDayOfWeekOptions.find((o) => o.value === selectedHistoryDayOfWeek.value)?.label ?? '-';
});

function heatmapValue(dayOfWeek: number, hour: number): number {
	return heatmapLookup.value.get(`${dayOfWeek}-${hour}`) ?? 0;
}

function heatmapCellStyle(dayOfWeek: number, hour: number): Record<string, string> {
	const value = heatmapValue(dayOfWeek, hour);
	const intensity = heatmapMax.value <= 0 ? 0 : Math.min(1, value / heatmapMax.value);
	const alpha = 0.08 + intensity * 0.72;
	return {
		backgroundColor: `rgba(5, 120, 90, ${alpha})`,
		color: intensity > 0.55 ? '#ffffff' : '#064e3b',
	};
}

function formatCop(value: number | null | undefined): string {
	if (value == null || Number.isNaN(Number(value))) return '-';
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(Number(value));
}

function formatCompactCop(value: number | null | undefined): string {
	const n = Number(value ?? 0);
	if (!Number.isFinite(n) || n <= 0) return '-';
	if (n >= 1000000) return `$${(n / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`;
	if (n >= 1000) return `$${Math.round(n / 1000).toLocaleString('es-CO')}k`;
	return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat('es-CO').format(value);
}

function formatPercent(value: number): string {
	return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value)} %`;
}

const summaryCards = computed(() => {
	const summary = props.hourlyPayload?.summary;
	const bestTotal = summary?.highestTotalSalesHour;
	const bestMedian = summary?.highestMedianSalesHour;
	return [
		{
			label: 'Hora mayor venta total',
			value: bestTotal ? bestTotal.label : '-',
			hint: bestTotal ? formatCop(bestTotal.totalSalesCop) : '',
		},
		{
			label: 'Hora mayor mediana',
			value: bestMedian ? bestMedian.label : '-',
			hint: bestMedian ? formatCop(bestMedian.medianDailySalesCop) : '',
		},
		{
			label: 'Dia seleccionado',
			value: selectedHistoryDayLabel.value,
			hint: '',
		},
		{
			label: 'Mediana ventas dia',
			value: formatCop(historyMedian.value),
			hint: '',
		},
		{
			label: 'Promedio ventas dia',
			value: formatCop(historyAverage.value),
			hint: '',
		},
		{
			label: 'Total vendido rango',
			value: formatCop(summary?.totalSalesCop),
			hint: '',
		},
	];
});
</script>
