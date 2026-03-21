<template>
	<div class="space-y-6">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<DashboardGaugeCard
				title="Tiempo preparación (prom.)"
				description="Desde inicio efectivo de cocina hasta listo"
				:value-minutes="avgPrepMinutes"
				subtitle="Según política de tiempos del negocio"
			/>
			<DashboardGaugeCard
				title="Tiempo entrega (prom.)"
				description="Listo → entregado al cliente"
				:value-minutes="avgDeliveryMinutes"
				subtitle="Domicilios / última milla"
			/>
		</div>

		<BaseCard title="Eficiencia por domiciliario" :padding="'md'">
			<div class="mb-5 pb-5 border-b border-gray-100 space-y-4">
				<div
					v-if="showBranchFilter"
					class="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end"
				>
					<div class="w-full sm:w-auto sm:min-w-[200px]">
						<label class="block text-xs font-medium text-gray-600 mb-1" for="delivery-branch-filter"
							>Sucursal</label
						>
						<select
							id="delivery-branch-filter"
							class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
							:value="branchId === null ? '' : String(branchId)"
							@change="onBranchChange"
						>
							<option value="">Todas las sucursales</option>
							<option v-for="b in branchOptions" :key="b.id" :value="String(b.id)">
								{{ b.name }}
							</option>
						</select>
					</div>
				</div>
				<p v-if="showBranchFilter" class="text-xs text-gray-500">
					<strong>Sucursal:</strong> filtra todo el bloque (domiciliarios visibles, medidores, evolución
					de fees, barras y dispersión).
					<strong class="ml-1">Domiciliario</strong> (solo entregas): limita la línea
					<em>Entregas completadas</em> a quien elijas; la lista depende de la sucursal.
				</p>
				<p v-else class="text-xs text-gray-500">
					<strong>Domiciliario</strong> (solo entregas): la sucursal la define el panel lateral del
					dashboard (superadmin). Esta lista reacciona a ese filtro.
				</p>
				<DashboardPeriodFilter v-model="period" />
			</div>

			<div class="mb-6">
				<h3 class="text-sm font-semibold text-gray-800 mb-1">Evolución en el periodo</h3>
				<p class="text-xs text-gray-500 mb-3">
					Misma granularidad (horas, días, semanas o meses) para volumen de entregas y recaudo por
					costo de domicilio. Los totales en el título suman todos los puntos del periodo mostrado.
				</p>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div class="min-h-[200px] sm:min-h-[240px]">
						<div class="mb-2 space-y-2">
							<div class="w-full sm:max-w-xs">
								<label
									class="block text-xs font-medium text-gray-600 mb-1"
									for="delivery-evolution-driver"
									>Domiciliario (entregas)</label
								>
								<select
									id="delivery-evolution-driver"
									class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
									:value="
										deliveryEvolutionDriverId === 'all'
											? 'all'
											: String(deliveryEvolutionDriverId)
									"
									@change="onDeliveryEvolutionDriverChange"
								>
									<option value="all">Todos los domiciliarios (esta sucursal)</option>
									<option v-for="d in deliverymen" :key="d.id" :value="String(d.id)">
										{{ d.name }}
									</option>
								</select>
							</div>
							<p class="text-xs font-medium text-gray-700 leading-snug">
								Entregas completadas:
								<span class="text-emerald-800 font-semibold tabular-nums">{{
									formatInt(totalEvolutionDeliveries)
								}}</span>
							</p>
						</div>
						<DashboardLineChart
							:labels="evolutionLabels"
							:datasets="evolutionLineDatasets"
							y-format="number"
							variant="area"
						/>
					</div>
					<div class="min-h-[200px] sm:min-h-[240px]">
						<p class="text-xs font-medium text-gray-700 mb-2 leading-snug">
							Recaudo fees de envío (COP) — Total:
							<span class="text-amber-900 font-semibold tabular-nums">{{
								formatCop(totalEvolutionFees)
							}}</span>,
							{{ feeDriverPercentLabel }}:
							<span class="text-amber-900 font-semibold tabular-nums">{{
								formatCop(driverShareFromTotal(totalEvolutionFees))
							}}</span>
						</p>
						<DashboardLineChart
							:labels="evolutionLabels"
							:datasets="evolutionFeeLineDatasets"
							y-format="currency"
							variant="area"
						/>
					</div>
				</div>
			</div>

			<div
				class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-4 pt-4 border-t border-gray-100"
			>
				<p class="text-xs text-gray-500 max-w-xl">
					<strong>Barras:</strong> entregas y recaudo por fee (apilado {{ feeDriverPercentLabel }} /
					{{ feeRestPercentLabel }}). <strong class="ml-1">Dispersión:</strong> tiempo vs entregas;
					el tooltip incluye recaudo.
				</p>
				<DashboardSegmentedTabs
					v-model="deliveryViz"
					:options="deliveryVizTabs"
					aria-label="Vista eficiencia domiciliarios"
				/>
			</div>
			<div v-if="deliveryViz === 'bars'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div>
					<p class="text-xs font-medium text-gray-700 mb-2 leading-snug">
						Pedidos entregados:
						<span class="text-emerald-800 font-semibold tabular-nums">{{
							formatInt(totalBarDeliveries)
						}}</span>
					</p>
					<DashboardHorizontalBarChart
						:labels="barLabels"
						:datasets="horizontalBarDataset"
						y-format="number"
					/>
				</div>
				<div>
					<p class="text-xs font-medium text-gray-700 mb-2 leading-snug">
						Recaudo domicilio (fees, COP) — Total:
						<span class="text-amber-900 font-semibold tabular-nums">{{
							formatCop(totalBarFees)
						}}</span>,
						{{ feeDriverPercentLabel }}:
						<span class="text-amber-900 font-semibold tabular-nums">{{
							formatCop(driverShareFromTotal(totalBarFees))
						}}</span>
					</p>
					<DashboardHorizontalBarChart
						:labels="barLabels"
						:datasets="horizontalBarFeeStackedDatasets"
						y-format="currency"
						stacked
						compact-stacked-tooltip
						:stacked-segment-labels="[feeDriverPercentLabel, feeRestPercentLabel]"
					/>
				</div>
			</div>
			<div v-else>
				<p class="text-xs font-medium text-gray-700 mb-2 leading-snug">
					Dispersión — Entregas (periodo):
					<span class="text-emerald-800 font-semibold tabular-nums">{{
						formatInt(totalScatterDeliveries)
					}}</span>
					· Recaudo fees total:
					<span class="text-amber-900 font-semibold tabular-nums">{{ formatCop(totalScatterFees) }}</span>,
					{{ feeDriverPercentLabel }}:
					<span class="text-amber-900 font-semibold tabular-nums">{{
						formatCop(driverShareFromTotal(totalScatterFees))
					}}</span>
				</p>
				<DashboardDeliveryScatterChart
					:points="scatterPoints"
					x-axis-label="Tiempo medio entrega (min)"
					y-axis-label="Pedidos entregados (periodo)"
				/>
			</div>
		</BaseCard>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import DashboardGaugeCard from './DashboardGaugeCard.vue';
import DashboardHorizontalBarChart from './DashboardHorizontalBarChart.vue';
import DashboardDeliveryScatterChart from './DashboardDeliveryScatterChart.vue';
import DashboardSegmentedTabs from './DashboardSegmentedTabs.vue';
import DashboardLineChart from './DashboardLineChart.vue';
import DashboardPeriodFilter from './DashboardPeriodFilter.vue';
import { formatTooltipCurrency } from './chartFormat';
import { getBranchSeriesColor } from './chartColors';
import type { DeliveryBranchOption, DeliverymanEfficiencyRow } from './operation.types';
import type { DashboardPeriodValue } from '@/utils/dashboardPeriodPresets';
import { DELIVERY_FEE_DRIVER_SHARE } from '@/constants/deliveryFeeShare';

const period = defineModel<DashboardPeriodValue>('period', { required: true });
const branchId = defineModel<number | null>('branchId', { required: true });
const deliveryEvolutionDriverId = defineModel<number | 'all'>('deliveryEvolutionDriverId', {
	required: true,
});

const props = withDefaults(
	defineProps<{
		/** Si es false, el filtro de sucursal vive fuera (p. ej. sidebar global). */
		showBranchFilter?: boolean;
		branchOptions: DeliveryBranchOption[];
		avgPrepMinutes: number;
		avgDeliveryMinutes: number;
		deliverymen: DeliverymanEfficiencyRow[];
		evolutionLabels: string[];
		evolutionData: number[];
		evolutionFeeData: number[];
	}>(),
	{ showBranchFilter: true },
);

function onBranchChange(e: Event) {
	const v = (e.target as HTMLSelectElement).value;
	branchId.value = v === '' ? null : Number(v);
}

function onDeliveryEvolutionDriverChange(e: Event) {
	const v = (e.target as HTMLSelectElement).value;
	deliveryEvolutionDriverId.value = v === 'all' ? 'all' : Number(v);
}

watch(
	() => props.deliverymen.map((d) => d.id).join(','),
	() => {
		const sel = deliveryEvolutionDriverId.value;
		if (sel !== 'all' && !props.deliverymen.some((d) => d.id === sel)) {
			deliveryEvolutionDriverId.value = 'all';
		}
	},
);

const deliveryViz = ref<string>('bars');

const deliveryVizTabs = [
	{ value: 'bars', label: 'Barras' },
	{ value: 'scatter', label: 'Dispersión' },
];

const feeDriverPercentLabel = `${Math.round(DELIVERY_FEE_DRIVER_SHARE * 100)}%`;
const feeRestPercentLabel = `${100 - Math.round(DELIVERY_FEE_DRIVER_SHARE * 100)}%`;

function sumNumbers(values: number[]): number {
	return values.reduce((a, b) => a + b, 0);
}

function formatInt(n: number): string {
	return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
}

function formatCop(n: number): string {
	return formatTooltipCurrency(n);
}

/** Parte del domiciliario sobre el total de fees (redondeo por peso). */
function driverShareFromTotal(totalFees: number): number {
	return Math.round(totalFees * DELIVERY_FEE_DRIVER_SHARE);
}

const totalEvolutionDeliveries = computed(() => sumNumbers(props.evolutionData));
const totalEvolutionFees = computed(() => sumNumbers(props.evolutionFeeData));

const sortedDeliverymen = computed(() =>
	[...props.deliverymen].sort((a, b) => b.deliveredCount - a.deliveredCount),
);

const totalBarDeliveries = computed(() =>
	sumNumbers(sortedDeliverymen.value.map((d) => d.deliveredCount)),
);

const totalBarFees = computed(() =>
	sumNumbers(sortedDeliverymen.value.map((d) => d.deliveryFeeTotal)),
);

const totalScatterDeliveries = computed(() => totalBarDeliveries.value);
const totalScatterFees = computed(() => totalBarFees.value);

const deliveriesDatasetLabel = computed(() => {
	const id = deliveryEvolutionDriverId.value;
	if (id === 'all') return 'Entregas';
	const d = props.deliverymen.find((x) => x.id === id);
	return d ? `Entregas (${d.name})` : 'Entregas';
});

const evolutionLineDatasets = computed(() => {
	const pal = getBranchSeriesColor(0);
	return [
		{
			label: deliveriesDatasetLabel.value,
			data: [...props.evolutionData],
			borderColor: pal.border,
			backgroundColor: pal.area,
		},
	];
});

const evolutionFeeLineDatasets = computed(() => {
	const pal = getBranchSeriesColor(2);
	return [
		{
			label: 'Fees envío',
			data: [...props.evolutionFeeData],
			borderColor: pal.border,
			backgroundColor: pal.area,
		},
	];
});

const barLabels = computed(() => sortedDeliverymen.value.map((d) => d.name));

const horizontalBarDataset = computed(() => [
	{
		label: 'Entregados',
		data: sortedDeliverymen.value.map((d) => d.deliveredCount),
		backgroundColor: 'rgba(5, 120, 90, 0.85)',
	},
]);

const horizontalBarFeeStackedDatasets = computed(() => {
	const pDriver: number[] = [];
	const pRest: number[] = [];
	for (const d of sortedDeliverymen.value) {
		const t = d.deliveryFeeTotal;
		const driver = Math.round(t * DELIVERY_FEE_DRIVER_SHARE);
		pDriver.push(driver);
		pRest.push(t - driver);
	}
	return [
		{
			label: `${feeDriverPercentLabel} (domiciliario)`,
			data: pDriver,
			backgroundColor: 'rgba(180, 120, 20, 0.92)',
			stack: 'fees',
		},
		{
			label: `${feeRestPercentLabel} (resto)`,
			data: pRest,
			backgroundColor: 'rgba(100, 116, 139, 0.82)',
			stack: 'fees',
		},
	];
});

const scatterPoints = computed(() =>
	sortedDeliverymen.value.map((d) => ({
		x: d.avgDeliveryMinutes,
		y: d.deliveredCount,
		name: d.name,
		deliveryFeeTotal: d.deliveryFeeTotal,
	})),
);
</script>
