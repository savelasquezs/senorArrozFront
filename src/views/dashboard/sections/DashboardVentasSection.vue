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
			<BranchComparisonPanel v-if="showBranchComparison" :rows="comparisonRows" />

			<TimeEvolutionPanel
				v-model:date-range="dateRangeModel"
				:sales-by-day="salesByDay"
				:sales-by-hour="salesByHour"
				:sales-by-month="salesByMonth"
				:sales-by-year="salesByYear"
				:orders-by-day="ordersByDay"
				:orders-by-hour="ordersByHour"
				:orders-by-month="ordersByMonth"
				:orders-by-year="ordersByYear"
			/>

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

			<BaseCard title="Peso vendido por categoría" :padding="'md'">
				<p class="text-xs text-gray-500 mb-3">
					Suma de <strong>unidades × peso unitario (g)</strong> por categoría, solo productos con peso
					definido. Mismo periodo que el gráfico superior.
					<span v-if="hasWeightChart" class="block mt-1 text-gray-600">
						Total: <strong>{{ formatWeightKgGrams(weightTotalGrams) }}</strong>
					</span>
				</p>
				<div
					v-if="!hasWeightChart"
					class="h-48 flex items-center justify-center text-sm text-gray-500"
				>
					Sin peso registrado en productos o sin ventas con peso en este rango.
				</div>
				<div v-else class="min-h-[200px]">
					<DashboardHorizontalBarChart
						:labels="weightBarLabels"
						:datasets="weightBarDatasets"
						y-format="number"
					/>
				</div>
			</BaseCard>

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
	DashboardHorizontalBarChart,
	DashboardRevenueShareDonut,
	DashboardSegmentedTabs,
	type BranchComparisonRow,
	type SalesTimeSeriesBlock,
	type OrdersPerHourBlock,
	type BarChartDataset,
} from '@/components/dashboard';
import type { VentasProductsGroupBy, VentasProductsPayload } from '@/services/MainAPI/dashboardSectionApi';

const props = withDefaults(
	defineProps<{
		loading: boolean;
		error: string | null;
		showBranchComparison?: boolean;
		comparisonRows: BranchComparisonRow[];
		dateRange: [Date, Date];
		salesByDay: SalesTimeSeriesBlock;
		salesByHour: SalesTimeSeriesBlock;
		salesByMonth: SalesTimeSeriesBlock;
		salesByYear: SalesTimeSeriesBlock;
		ordersByDay: OrdersPerHourBlock;
		ordersByHour: OrdersPerHourBlock;
		ordersByMonth: OrdersPerHourBlock;
		ordersByYear: OrdersPerHourBlock;
		/** Desde API; null con mock o sin ventas. */
		productsPayload: VentasProductsPayload | null;
	}>(),
	{ showBranchComparison: true },
);

const productsGroupBy = defineModel<VentasProductsGroupBy>('productsGroupBy', { default: 'product' });

const emit = defineEmits<{
	'update:dateRange': [value: [Date, Date]];
}>();

const dateRangeModel = computed({
	get: () => props.dateRange,
	set: (v: [Date, Date]) => emit('update:dateRange', v),
});

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

const weightRows = computed(() => props.productsPayload?.weightByCategory ?? []);
const hasWeightChart = computed(() => weightRows.value.length > 0);
const weightTotalGrams = computed(() =>
	weightRows.value.reduce((s, r) => s + r.totalWeightGrams, 0),
);

const weightBarLabels = computed(() => weightRows.value.map((r) => r.name));
const weightBarDatasets = computed((): BarChartDataset[] => [
	{
		label: 'Gramos vendidos (g)',
		data: weightRows.value.map((r) => r.totalWeightGrams),
		backgroundColor: 'rgba(37, 99, 235, 0.85)',
	},
]);

/** Muestra kg si >= 1000 g para lectura rápida. */
function formatWeightKgGrams(grams: number): string {
	if (grams >= 1000) {
		const kg = grams / 1000;
		return `${kg.toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg (${grams.toLocaleString('es-CO')} g)`;
	}
	return `${grams.toLocaleString('es-CO')} g`;
}
</script>
