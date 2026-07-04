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
					<div v-if="!hasHourlyPoints" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin pedidos para las horas del rango filtrado.
					</div>
					<DashboardSalesHourlyChart
						v-else
						:points="hourlyPoints"
						:median-line-cop="hourlyTotalMedianLine"
					/>
				</BaseCard>

				<BaseCard title="Pedidos por hora" :padding="'md'">
					<div v-if="!hasHourlyPoints" class="h-56 flex items-center justify-center text-sm text-gray-500">
						Sin pedidos para las horas del rango filtrado.
					</div>
					<DashboardBarChart
						v-else
						:labels="hourlyOrderLabels"
						:datasets="hourlyOrderDatasets"
						y-format="number"
					/>
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
				:day-of-week="dayOfWeek"
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
import { computed } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import {
	BranchComparisonPanel,
	TimeEvolutionPanel,
	DashboardBarChart,
	DashboardHorizontalBarChart,
	DashboardRevenueShareDonut,
	DashboardSegmentedTabs,
	CategoryWeightAnalyticsPanel,
	DashboardSalesHourlyChart,
	type BranchComparisonRow,
	type SalesTimeSeriesBlock,
	type OrdersPerHourBlock,
	type BarChartDataset,
} from '@/components/dashboard';
import type {
	VentasProductsGroupBy,
	VentasProductsPayload,
	VentasSalesHourlyPayload,
} from '@/services/MainAPI/dashboardSectionApi';
import type {
	DashboardDayOfWeekFilter,
	DashboardTimeGranularity,
} from '@/views/dashboard/dashboardGlobalFilters';

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
		dayOfWeek: DashboardDayOfWeekFilter;
		/** Sucursal del filtro global (peso por categoría usa API real). */
		branchId: number | null;
	}>(),
	{ showBranchComparison: true },
);

const productsGroupBy = defineModel<VentasProductsGroupBy>('productsGroupBy', { default: 'product' });
const timeGranularity = defineModel<DashboardTimeGranularity>('timeGranularity', { default: 'day' });

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
const hourlyOrderLabels = computed(() => hourlyPoints.value.map((p) => p.label));
const hourlyOrderDatasets = computed((): BarChartDataset[] => [
	{
		label: 'Pedidos',
		data: hourlyPoints.value.map((p) => p.orderCount),
		backgroundColor: 'rgba(37, 99, 235, 0.78)',
	},
]);

function median(values: number[]): number | null {
	const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
	if (sorted.length === 0) return null;
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[middle];
	return (sorted[middle - 1] + sorted[middle]) / 2;
}

const hourlyTotalMedianLine = computed(() =>
	median(hourlyPoints.value.map((p) => p.totalSalesCop)),
);

function formatCop(value: number | null | undefined): string {
	if (value == null || Number.isNaN(Number(value))) return '-';
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(Number(value));
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
			value: summary?.dayOfWeekLabel ?? 'Todos los dias',
			hint: '',
		},
		{
			label: 'Mediana ventas dia',
			value: formatCop(summary?.medianDailySalesCop),
			hint: '',
		},
		{
			label: 'Promedio ventas dia',
			value: formatCop(summary?.averageDailySalesCop),
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
