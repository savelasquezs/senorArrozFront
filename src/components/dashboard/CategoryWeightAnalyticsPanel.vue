<template>
	<BaseCard title="Peso vendido por categoría" :padding="'md'">
		<div class="space-y-6">
			<div
				class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between pb-3 border-b border-gray-100"
			>
				<DashboardDateRangeFilter
					v-model="dateRangeModel"
					label="Periodo (peso)"
					:max-date="maxSelectableDate"
					:min-date="minSelectableDate"
				/>
				<p class="text-[11px] text-gray-500 max-w-xl sm:text-right leading-relaxed">
					Datos de <strong>pedidos reales</strong> (líneas con producto que tiene peso en gramos). La torta y
					los % usan el mismo rango. La evolución depende de la escala y de la categoría elegida.
				</p>
			</div>

			<div
				v-if="USE_VENTAS_MOCK"
				class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
			>
				Modo mock de ventas activo (<code class="text-xs">VITE_DASHBOARD_VENTAS_MOCK</code>). Conecta el API
				para ver pesos reales.
			</div>

			<div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
				{{ error }}
			</div>

			<div
				v-else-if="loading"
				class="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-500"
			>
				Cargando pesos por categoría…
			</div>

			<template v-else>
				<p v-if="totalGrams > 0" class="text-xs text-gray-600">
					Total en el periodo:
					<strong>{{ formatWeightKgGrams(totalGrams) }}</strong>
				</p>

				<div class="grid grid-cols-1 gap-8 xl:grid-cols-2">
					<section class="space-y-2">
						<h3 class="text-sm font-semibold text-gray-900">Participación por peso (%)</h3>
						<p class="text-xs text-gray-500">
							Porcentaje de gramos respecto al total del rango (mismo filtro de fechas).
						</p>
						<div
							v-if="!hasPie"
							class="h-52 flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg"
						>
							Sin ventas con peso en este rango.
						</div>
						<DashboardWeightShareDonut
							v-else
							:labels="pieLabels"
							:values="pieValues"
							:percents="piePercents"
						/>
					</section>

					<section class="space-y-3 border-t border-gray-100 pt-6 xl:border-t-0 xl:pt-0 xl:border-l xl:pl-8 xl:border-gray-100">
						<h3 class="text-sm font-semibold text-gray-900">Evolución en el tiempo</h3>
						<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
							<p class="text-xs text-gray-500">Escala</p>
							<DashboardSegmentedTabs
								v-model="granularityModel"
								:options="granularityTabs"
								aria-label="Escala de tiempo peso por categoría"
							/>
						</div>
						<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
							<label class="text-xs font-medium text-gray-700 shrink-0" for="cw-cat">Categoría</label>
							<select
								id="cw-cat"
								v-model="selectedCategoryModel"
								class="w-full sm:max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
							>
								<option value="">— Todas (solo torta arriba) —</option>
								<option v-for="c in categoryOptions" :key="c.categoryId" :value="String(c.categoryId)">
									{{ c.name }}
								</option>
							</select>
						</div>
						<p class="text-xs text-gray-500">
							Selecciona una categoría para ver gramos vendidos por
							<strong>{{ granularityLabel }}</strong> en el período.
						</p>
						<div
							v-if="!selectedCategoryId"
							class="h-48 flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg"
						>
							Elige una categoría para ver la evolución.
						</div>
						<div v-else-if="!hasEvolution" class="h-48 flex items-center justify-center text-sm text-gray-500">
							Sin datos de peso para esta categoría en el rango.
						</div>
						<DashboardLineChart
							v-else
							:labels="evolutionLabels"
							:datasets="evolutionDatasets"
							y-format="number"
							variant="line"
							:curve-tension="0.35"
						/>
					</section>
				</div>
			</template>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import DashboardDateRangeFilter from './DashboardDateRangeFilter.vue';
import DashboardSegmentedTabs from './DashboardSegmentedTabs.vue';
import DashboardLineChart from './DashboardLineChart.vue';
import DashboardWeightShareDonut from './DashboardWeightShareDonut.vue';
import { dashboardApi, type DashboardCategoryWeightsApiResponse } from '@/services/MainAPI/dashboardApi';
import { encodeDashboardRangeToApi, USE_VENTAS_MOCK } from '@/services/MainAPI/dashboardSectionApi';
import type { LineChartDataset } from './lineChart.types';

const props = defineProps<{
	branchId: number | null;
	dateRange: [Date, Date];
}>();

const emit = defineEmits<{
	'update:dateRange': [value: [Date, Date]];
}>();

const dateRangeModel = computed({
	get: () => props.dateRange,
	set: (v: [Date, Date]) => emit('update:dateRange', v),
});

const maxSelectableDate = computed(() => {
	const d = new Date();
	d.setHours(23, 59, 59, 999);
	return d;
});

const minSelectableDate = computed(() => {
	const d = new Date();
	d.setFullYear(d.getFullYear() - 2);
	d.setHours(0, 0, 0, 0);
	return d;
});

const loading = ref(false);
const error = ref<string | null>(null);
const payload = ref<DashboardCategoryWeightsApiResponse | null>(null);

const granularity = ref<'day' | 'month' | 'year'>('day');
const granularityModel = computed({
	get: () => granularity.value,
	set: (v: string) => {
		if (v === 'month' || v === 'year' || v === 'day') granularity.value = v;
	},
});

const granularityTabs = [
	{ value: 'day', label: 'Por día' },
	{ value: 'month', label: 'Por mes' },
	{ value: 'year', label: 'Por año' },
];

const selectedCategoryId = ref<number | null>(null);
const selectedCategoryModel = computed({
	get: () => (selectedCategoryId.value === null ? '' : String(selectedCategoryId.value)),
	set: (v: string) => {
		selectedCategoryId.value = v === '' ? null : Number(v);
	},
});

const granularityLabel = computed(() => {
	switch (granularity.value) {
		case 'month':
			return 'mes';
		case 'year':
			return 'año';
		default:
			return 'día';
	}
});

const categoryOptions = computed(() => payload.value?.byCategory ?? []);

const totalGrams = computed(() =>
	(payload.value?.byCategory ?? []).reduce((s, r) => s + r.totalWeightGrams, 0),
);

const pieLabels = computed(() => (payload.value?.byCategory ?? []).map((r) => r.name));
const pieValues = computed(() => (payload.value?.byCategory ?? []).map((r) => r.totalWeightGrams));
const piePercents = computed(() => {
	const rows = payload.value?.byCategory ?? [];
	const t = rows.reduce((s, r) => s + r.totalWeightGrams, 0);
	if (t <= 0) return rows.map(() => 0);
	return rows.map((r) => Math.round((1000 * r.totalWeightGrams) / t) / 10);
});

const hasPie = computed(() => pieValues.value.some((v) => v > 0));

function formatBucketLabel(iso: string, g: 'day' | 'month' | 'year'): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	if (g === 'day') return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
	if (g === 'month') return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
	return String(d.getFullYear());
}

const evolutionLabels = computed(() =>
	(payload.value?.evolution ?? []).map((e) => formatBucketLabel(e.bucketStartUtc, granularity.value)),
);

const evolutionDatasets = computed((): LineChartDataset[] => {
	const id = selectedCategoryId.value;
	const name =
		(payload.value?.byCategory ?? []).find((c) => c.categoryId === id)?.name ?? 'Categoría';
	return [
		{
			label: `Gramos (${name})`,
			data: (payload.value?.evolution ?? []).map((e) => e.totalWeightGrams),
		},
	];
});

const hasEvolution = computed(
	() => selectedCategoryId.value != null && (payload.value?.evolution?.length ?? 0) > 0,
);

function formatWeightKgGrams(grams: number): string {
	if (grams >= 1000) {
		const kg = grams / 1000;
		return `${kg.toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg (${grams.toLocaleString('es-CO')} g)`;
	}
	return `${grams.toLocaleString('es-CO')} g`;
}

async function load() {
	if (USE_VENTAS_MOCK) {
		payload.value = null;
		error.value = null;
		return;
	}
	loading.value = true;
	error.value = null;
	try {
		const { from, to } = encodeDashboardRangeToApi(props.dateRange);
		const raw = await dashboardApi.getSalesCategoryWeights(props.branchId, from, to, {
			granularity: granularity.value,
			categoryId: selectedCategoryId.value,
		});
		payload.value = raw;
		const ids = new Set((raw.byCategory ?? []).map((c) => c.categoryId));
		if (selectedCategoryId.value != null && !ids.has(selectedCategoryId.value)) {
			selectedCategoryId.value = null;
		}
	} catch (e) {
		error.value = e instanceof Error ? e.message : 'Error al cargar pesos';
		payload.value = null;
	} finally {
		loading.value = false;
	}
}

watch(
	() => [props.branchId, props.dateRange[0].getTime(), props.dateRange[1].getTime(), granularity.value, selectedCategoryId.value] as const,
	() => void load(),
	{ immediate: true },
);
</script>
