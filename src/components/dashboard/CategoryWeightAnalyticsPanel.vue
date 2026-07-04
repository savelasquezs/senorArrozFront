<template>
	<BaseCard title="Peso vendido por categoría" :padding="'md'">
		<div class="space-y-6">
			<p class="text-[11px] text-gray-500 pb-3 border-b border-gray-100 leading-relaxed">
				El <strong>periodo</strong> y la <strong>escala</strong> están en el panel lateral. Datos reales:
				líneas con producto que tiene peso (g). La torta resume el rango; la evolución muestra
				<strong>todas las categorías</strong> o <strong>una</strong> si la eliges abajo.
			</p>

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
				v-else-if="loading && !payload"
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
						<form class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" @submit.prevent>
							<label class="text-xs font-medium text-gray-700 shrink-0" for="cw-cat">Categoría</label>
							<select
								id="cw-cat"
								v-model="selectedCategoryModel"
								class="w-full sm:max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
								@change.stop
							>
								<option value="">— Todas (multilínea) —</option>
								<option v-for="c in categoryOptions" :key="c.categoryId" :value="String(c.categoryId)">
									{{ c.name }}
								</option>
							</select>
						</form>
						<p class="text-xs text-gray-500">
							Sin selección: una línea por categoría. Con categoría: una sola serie por
							<strong>{{ granularityLabel }}</strong>.
						</p>
						<div class="relative min-h-[12rem]">
							<div
								v-if="chartBusy"
								class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 text-sm text-gray-600 backdrop-blur-[1px]"
							>
								Actualizando gráfico…
							</div>
							<div
								v-if="!hasEvolution"
								class="h-48 flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg"
							>
								{{ evolutionEmptyMessage }}
							</div>
							<DashboardLineChart
								v-else
								:labels="evolutionLabels"
								:datasets="evolutionDatasets"
								y-format="number"
								variant="line"
								:curve-tension="0.35"
							/>
						</div>
					</section>
				</div>
			</template>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import DashboardLineChart from './DashboardLineChart.vue';
import DashboardWeightShareDonut from './DashboardWeightShareDonut.vue';
import { dashboardApi, type DashboardCategoryWeightsApiResponse } from '@/services/MainAPI/dashboardApi';
import { encodeDashboardRangeToApi, USE_VENTAS_MOCK } from '@/services/MainAPI/dashboardSectionApi';
import type { LineChartDataset } from './lineChart.types';
import {
	weightApiGranularity,
	type DashboardTimeGranularity,
} from '@/views/dashboard/dashboardGlobalFilters';
import {
	aggregateCategoryEvolutionPointsByFortnight,
	fortnightLabelForDate,
} from '@/views/dashboard/dashboardGranularityBuckets';
import { defaultBusinessCalendar } from '@/utils/datetime';

const props = defineProps<{
	branchId: number | null;
	dateRange: [Date, Date];
	timeGranularity: DashboardTimeGranularity;
}>();

/** Carga inicial del panel (sin datos aún). Las actualizaciones por categoría usan `chartBusy`. */
const loading = ref(!USE_VENTAS_MOCK);
const chartBusy = ref(false);
const error = ref<string | null>(null);
const payload = ref<DashboardCategoryWeightsApiResponse | null>(null);

const selectedCategoryId = ref<number | null>(null);
const selectedCategoryModel = computed({
	get: () => (selectedCategoryId.value === null ? '' : String(selectedCategoryId.value)),
	set: (v: string) => {
		selectedCategoryId.value = v === '' ? null : Number(v);
	},
});

const weightEvolutionGranularity = computed(() => weightApiGranularity(props.timeGranularity));

const granularityLabel = computed(() => {
	if (props.timeGranularity === 'fortnight') return 'quincena';
	switch (weightEvolutionGranularity.value) {
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
	if (g === 'day') return defaultBusinessCalendar.formatDayShortMonth(d);
	if (g === 'month') return defaultBusinessCalendar.formatShortMonthYear(d);
	return String(d.getFullYear());
}

function mergeAlignedCategoryWeightSeries(
	series: Array<{
		categoryId: number;
		name: string;
		points: Array<{ bucketStartUtc: string; totalWeightGrams: number }>;
	}>,
	g: 'day' | 'month' | 'year',
	labelFormatter?: (iso: string) => string,
): { labelStrings: string[]; datasets: LineChartDataset[] } {
	const bucketSet = new Set<string>();
	for (const s of series) {
		for (const p of s.points) {
			bucketSet.add(p.bucketStartUtc);
		}
	}
	const sorted = [...bucketSet].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
	const labelStrings = sorted.map((iso) =>
		labelFormatter ? labelFormatter(iso) : formatBucketLabel(iso, g),
	);
	const idx = new Map<string, number>();
	sorted.forEach((iso, i) => idx.set(iso, i));
	const datasets: LineChartDataset[] = series.map((s) => {
		const data = new Array<number>(sorted.length).fill(0);
		for (const p of s.points) {
			const i = idx.get(p.bucketStartUtc);
			if (i !== undefined) data[i] = p.totalWeightGrams;
		}
		return { label: `Gramos (${s.name})`, data };
	});
	return { labelStrings, datasets };
}

const evolutionLabels = computed(() => {
	const g = weightEvolutionGranularity.value;
	const fortnight = props.timeGranularity === 'fortnight';
	const labelFn = fortnight
		? (iso: string) => fortnightLabelForDate(new Date(iso))
		: undefined;

	if (selectedCategoryId.value != null) {
		const raw = payload.value?.evolution ?? [];
		const pts = fortnight ? aggregateCategoryEvolutionPointsByFortnight(raw) : raw;
		return pts.map((e) =>
			labelFn ? labelFn(e.bucketStartUtc) : formatBucketLabel(e.bucketStartUtc, g),
		);
	}
	const multi = (payload.value?.evolutionsByCategory ?? []).map((s) => ({
		...s,
		points: fortnight
			? aggregateCategoryEvolutionPointsByFortnight(s.points ?? [])
			: (s.points ?? []),
	}));
	return mergeAlignedCategoryWeightSeries(multi, g, labelFn).labelStrings;
});

const evolutionDatasets = computed((): LineChartDataset[] => {
	const g = weightEvolutionGranularity.value;
	const fortnight = props.timeGranularity === 'fortnight';
	const labelFn = fortnight
		? (iso: string) => fortnightLabelForDate(new Date(iso))
		: undefined;

	if (selectedCategoryId.value != null) {
		const id = selectedCategoryId.value;
		const name =
			(payload.value?.byCategory ?? []).find((c) => c.categoryId === id)?.name ?? 'Categoría';
		const raw = payload.value?.evolution ?? [];
		const pts = fortnight ? aggregateCategoryEvolutionPointsByFortnight(raw) : raw;
		return [
			{
				label: `Gramos (${name})`,
				data: pts.map((e) => e.totalWeightGrams),
			},
		];
	}
	const multi = (payload.value?.evolutionsByCategory ?? []).map((s) => ({
		...s,
		points: fortnight
			? aggregateCategoryEvolutionPointsByFortnight(s.points ?? [])
			: (s.points ?? []),
	}));
	return mergeAlignedCategoryWeightSeries(multi, g, labelFn).datasets;
});

const hasEvolution = computed(() => {
	if (selectedCategoryId.value != null) {
		return (payload.value?.evolution?.length ?? 0) > 0;
	}
	const m = payload.value?.evolutionsByCategory ?? [];
	return m.some((s) => (s.points?.length ?? 0) > 0);
});

const evolutionEmptyMessage = computed(() => {
	if (selectedCategoryId.value != null) {
		return 'Sin datos de peso para esta categoría en el rango.';
	}
	return 'Sin datos de peso por categoría en el rango.';
});

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
		loading.value = false;
		return;
	}
	const hadPayload = payload.value != null;
	if (!hadPayload) loading.value = true;
	else chartBusy.value = true;
	error.value = null;
	try {
		const { from, to } = encodeDashboardRangeToApi(props.dateRange);
		const raw = await dashboardApi.getSalesCategoryWeights(props.branchId, from, to, {
			granularity: weightEvolutionGranularity.value,
			categoryId: selectedCategoryId.value,
		});
		payload.value = {
			...raw,
			evolutionsByCategory: raw.evolutionsByCategory ?? [],
			evolution: raw.evolution ?? [],
		};
		const ids = new Set((raw.byCategory ?? []).map((c) => c.categoryId));
		if (selectedCategoryId.value != null && !ids.has(selectedCategoryId.value)) {
			selectedCategoryId.value = null;
		}
	} catch (e) {
		error.value = e instanceof Error ? e.message : 'Error al cargar pesos';
		payload.value = null;
	} finally {
		loading.value = false;
		chartBusy.value = false;
	}
}

watch(
	() =>
		[
			props.branchId,
			props.dateRange[0].getTime(),
			props.dateRange[1].getTime(),
			props.timeGranularity,
			selectedCategoryId.value,
		] as const,
	() => void load(),
	{ immediate: true },
);
</script>
