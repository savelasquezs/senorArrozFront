<template>
	<div class="space-y-6">
		<div
			v-if="showKpiStrip"
			class="grid grid-cols-2 gap-3 lg:grid-cols-4"
		>
			<div
				class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
				role="status"
			>
				<p class="text-xs font-medium text-gray-500">Entregas (periodo)</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-emerald-900">
					{{ formatInt(totalEvolutionDeliveries) }}
				</p>
			</div>
			<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" role="status">
				<p class="text-xs font-medium text-gray-500">Recaudo fees</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-amber-900">
					{{ formatCop(totalEvolutionFees) }}
				</p>
			</div>
			<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" role="status">
				<p class="text-xs font-medium text-gray-500">Fees / ventas</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-violet-900">
					{{ formatFeeToSalesPercent(periodFeeToSalesPercent) }}
				</p>
			</div>
			<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" role="status">
				<p class="text-xs font-medium text-gray-500">Ticket medio (seriación)</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-gray-900">
					{{ formatCop(avgTicketFromEvolution) }}
				</p>
			</div>
		</div>

		<div
			class="grid grid-cols-1 gap-4"
			:class="showPrepTimeGauge ? 'md:grid-cols-2' : 'md:grid-cols-1 md:max-w-xl'"
		>
			<DashboardGaugeCard
				v-if="showPrepTimeGauge"
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

		<BaseCard :title="cardTitle" :padding="'md'">
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
					<strong v-if="showDriverFilter" class="ml-1">Domiciliario</strong>
					<template v-if="showDriverFilter">
						(solo entregas): filtra datos al repartidor elegido; la lista depende de la sucursal.
					</template>
				</p>
				<p v-else class="text-xs text-gray-500">
					<template v-if="showDriverFilter">
						<strong>Domiciliario</strong> (solo entregas): la sucursal la define el panel lateral del
						dashboard (superadmin). Esta lista reacciona a ese filtro.
					</template>
					<template v-else> Tus métricas de entregas en el rango seleccionado. </template>
				</p>
				<p class="text-xs text-gray-600 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
					<strong class="text-gray-800">Rango de fechas</strong>
					<template v-if="dateRangeFromSidebar">
						(mismo que <em>Periodo</em> en el panel lateral):
					</template>
					<span class="tabular-nums text-gray-900">{{ formattedDateRange }}</span>
				</p>
			</div>

			<div class="mb-6">
				<h3 class="text-sm font-semibold text-gray-800 mb-1">Evolución en el periodo</h3>
				<p class="text-xs text-gray-500 mb-3">
					Misma granularidad (horas, días, semanas o meses) para entregas, recaudo por costo de
					domicilio y el porcentaje fees / ventas (ventas = total pedidos en el bucket, alineado al
					filtro del API). El % del periodo usa suma fees / suma ventas del rango según el servidor.
				</p>
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div class="min-h-[200px] sm:min-h-[240px]">
						<div class="mb-2 space-y-2">
							<div v-if="showDriverFilter" class="w-full sm:max-w-xs">
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
					<div class="min-h-[200px] sm:min-h-[240px] lg:col-span-1">
						<p class="text-xs font-medium text-gray-700 mb-2 leading-snug">
							Fees envío vs ventas — Periodo:
							<span class="text-violet-900 font-semibold tabular-nums">{{
								formatFeeToSalesPercent(periodFeeToSalesPercent)
							}}</span>
							<span class="text-gray-500 font-normal"> (histórico por bucket)</span>
						</p>
						<p v-if="!hasFeeToSalesEvolution" class="text-xs text-gray-500 italic py-6">
							No hay ventas por bucket para calcular el histórico (respuesta sin
							<span class="font-mono text-[11px]">evolutionSalesTotals</span> o todo en cero).
						</p>
						<DashboardLineChart
							v-else
							:labels="evolutionLabels"
							:datasets="evolutionFeeToSalesPercentDatasets"
							y-format="percent"
							variant="area"
						/>
					</div>
				</div>
			</div>

			<template v-if="showTeamBlock">
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
			</template>
		</BaseCard>

		<BaseCard
			v-if="routeMetrics != null"
			title="Rutas y SLA"
			:padding="'md'"
			class="border-t border-gray-100 pt-2"
		>
			<p class="text-xs text-gray-500 mb-4">
				Métricas por <strong class="text-gray-700">ruta cerrada</strong> (consolidación Google + buffers vs tiempo
				real). Misma escala temporal que la evolución de entregas arriba. Respeta sucursal y filtro de domiciliario.
			</p>

			<div
				v-if="routeMetrics.completedRoutesCount === 0"
				class="rounded-lg border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600"
			>
				No hay rutas completadas en este periodo con los filtros actuales.
			</div>

			<template v-else>
				<div class="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
					<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" role="status">
						<p class="text-xs font-medium text-gray-500">Rutas cerradas</p>
						<p class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
							{{ formatInt(routeMetrics.completedRoutesCount) }}
						</p>
					</div>
					<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" role="status">
						<p class="text-xs font-medium text-gray-500">A tiempo (SLA)</p>
						<p class="mt-1 text-lg font-semibold tabular-nums text-emerald-800">
							{{
								routeMetrics.routesWithSlaDataCount > 0
									? formatPercentValue(routeMetrics.periodOnTimePercent)
									: '—'
							}}
						</p>
						<p class="text-[10px] text-gray-400 mt-0.5">
							{{ formatInt(routeMetrics.routesWithSlaDataCount) }} con dato
						</p>
					</div>
					<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" role="status">
						<p class="text-xs font-medium text-gray-500">Retraso (% rutas)</p>
						<p class="mt-1 text-lg font-semibold tabular-nums text-rose-800">
							{{
								routeMetrics.routesWithSlaDataCount > 0
									? formatPercentValue(routeMetrics.periodDelayedPercent)
									: '—'
							}}
						</p>
					</div>
					<div class="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" role="status">
						<p class="text-xs font-medium text-gray-500">Distancia acum.</p>
						<p class="mt-1 text-lg font-semibold tabular-nums text-cyan-900">
							{{ formatKm(routeMetrics.totalDistanceKm) }}
						</p>
						<p class="text-[10px] text-gray-400 mt-0.5">
							Prom. real {{ formatMinutes1(routeMetrics.avgActualRouteMinutes) }} · meta
							{{ formatMinutes1(routeMetrics.avgMetaRouteMinutes) }}
						</p>
					</div>
				</div>

				<p
					v-if="routeMetrics.avgDelayMinutesWhenDelayed > 0"
					class="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4"
				>
					Retraso medio cuando hubo demora:
					<strong class="tabular-nums">{{ formatMinutes1(routeMetrics.avgDelayMinutesWhenDelayed) }} min</strong>
					(solo rutas con tiempo &gt; meta).
				</p>

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					<div class="min-h-[200px] sm:min-h-[240px]">
						<p class="text-xs font-medium text-gray-700 mb-2">Rutas completadas por bucket</p>
						<DashboardLineChart
							:labels="routeChartLabels"
							:datasets="routeCountDatasets"
							y-format="number"
							variant="area"
						/>
					</div>
					<div class="min-h-[200px] sm:min-h-[240px]">
						<p class="text-xs font-medium text-gray-700 mb-2">Evolución % dentro de SLA / retrasos</p>
						<DashboardLineChart
							:labels="routeChartLabels"
							:datasets="routeSlaPercentDatasets"
							y-format="percent"
							variant="area"
						/>
					</div>
					<div class="min-h-[200px] sm:min-h-[240px]">
						<p class="text-xs font-medium text-gray-700 mb-2">Tiempo real medio por ruta (min)</p>
						<DashboardLineChart
							:labels="routeChartLabels"
							:datasets="routeActualMinutesDatasets"
							y-format="number"
							variant="area"
						/>
					</div>
					<div class="min-h-[200px] sm:min-h-[240px]">
						<p class="text-xs font-medium text-gray-700 mb-2">Retraso medio en bucket (min, solo demoradas)</p>
						<DashboardLineChart
							:labels="routeChartLabels"
							:datasets="routeDelayMinutesDatasets"
							y-format="number"
							variant="area"
						/>
					</div>
				</div>

				<div v-if="showRouteSlaByDriver" class="mb-8 pb-6 border-b border-gray-100">
					<p class="text-xs text-gray-500 mb-2 max-w-xl">
						<strong>SLA por domiciliario:</strong> % de rutas cerradas dentro de meta en el periodo (solo quien
						completó al menos una ruta).
					</p>
					<DashboardHorizontalBarChart
						:labels="routeSlaBarLabels"
						:datasets="routeSlaBarDatasets"
						y-format="number"
					/>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-1">Historial reciente de rutas</h3>
					<p class="text-xs text-gray-500 mb-3">
						Últimas {{ routeHistoryRows.length }} cerradas en el periodo.
						<span class="text-gray-400"> · Clic en una fila para ver direcciones.</span>
					</p>
					<div class="overflow-x-auto max-h-[min(24rem,50vh)] overflow-y-auto rounded-lg border border-gray-200">
						<table class="min-w-full text-xs text-left">
							<thead class="sticky top-0 bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
								<tr>
									<th class="px-3 py-2">Cierre</th>
									<th class="px-3 py-2">Domiciliario</th>
									<th class="px-3 py-2 text-right">Real</th>
									<th class="px-3 py-2 text-right">Meta</th>
									<th class="px-3 py-2 text-right">Δ min</th>
									<th class="px-3 py-2 text-center">SLA</th>
									<th class="px-3 py-2 text-right">Dist km</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100 bg-white">
								<tr
									v-for="row in routeHistoryRows"
									:key="row.id"
									role="button"
									tabindex="0"
									class="hover:bg-emerald-50/80 cursor-pointer select-none"
									@click="openRouteStopsModal(row)"
									@keydown.enter.prevent="openRouteStopsModal(row)"
								>
									<td class="px-3 py-2 tabular-nums text-gray-800 whitespace-nowrap">
										{{ formatRouteClosedAt(row.completedAtUtc) }}
									</td>
									<td class="px-3 py-2 text-gray-700">{{ row.deliverymanName }}</td>
									<td class="px-3 py-2 text-right tabular-nums text-gray-800">
										{{ formatSecondsAsMin(row.actualDurationSeconds) }}
									</td>
									<td class="px-3 py-2 text-right tabular-nums text-gray-600">
										{{ formatSecondsAsMin(row.metaDurationSeconds) }}
									</td>
									<td class="px-3 py-2 text-right tabular-nums">
										<span
											v-if="row.varianceSeconds != null && row.varianceSeconds > 0"
											class="text-rose-700"
											>+{{ formatMinutes1(row.varianceSeconds / 60) }}</span
										>
										<span v-else-if="row.varianceSeconds != null && row.varianceSeconds <= 0" class="text-emerald-700"
											>{{ formatMinutes1(row.varianceSeconds / 60) }}</span
										>
										<span v-else class="text-gray-400">—</span>
									</td>
									<td class="px-3 py-2 text-center">
										<span
											v-if="row.metSla === true"
											class="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 font-medium"
											>Sí</span
										>
										<span
											v-else-if="row.metSla === false"
											class="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-rose-800 font-medium"
											>No</span
										>
										<span v-else class="text-gray-400">—</span>
									</td>
									<td class="px-3 py-2 text-right tabular-nums text-gray-700">
										{{ formatKm(row.totalDistanceMeters / 1000) }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<BaseDialog
					:model-value="routeStopsModalOpen"
					:title="routeStopsModalTitle"
					size="lg"
					@update:model-value="onRouteStopsDialogToggle"
				>
					<div v-if="routeStopsSelectedRow" class="space-y-3 text-sm text-gray-700">
						<p class="text-xs text-gray-500">
							{{ routeStopsSelectedRow.deliverymanName }} ·
							{{ formatRouteClosedAt(routeStopsSelectedRow.completedAtUtc) }}
						</p>
						<div v-if="routeStopsLoading" class="py-6 text-center text-gray-500">Cargando paradas…</div>
						<p v-else-if="routeStopsError" class="text-red-600 text-sm">{{ routeStopsError }}</p>
						<ul v-else-if="routeStopsList.length" class="space-y-3 border border-gray-100 rounded-lg divide-y divide-gray-100 bg-white">
							<li
								v-for="s in routeStopsList"
								:key="`${s.orderId}-${s.stopSequence}`"
								class="px-3 py-2.5"
							>
								<div class="flex items-baseline justify-between gap-2">
									<span class="font-semibold text-gray-900">Pedido #{{ s.orderId }}</span>
									<span class="text-xs text-gray-400 tabular-nums">Parada {{ s.stopSequence }}</span>
								</div>
								<p v-if="s.customerName" class="text-xs text-gray-600 mt-0.5">{{ s.customerName }}</p>
								<p class="text-sm text-gray-800 mt-1">{{ formatStopAddress(s) }}</p>
							</li>
						</ul>
						<p v-else class="text-gray-500 text-sm py-2">No hay paradas registradas para esta ruta.</p>
					</div>
					<template #footer>
						<div class="flex justify-end">
							<button
								type="button"
								class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
								@click="closeRouteStopsModal"
							>
								Cerrar
							</button>
						</div>
					</template>
				</BaseDialog>
			</template>
		</BaseCard>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import { dashboardApi } from '@/services/MainAPI/dashboardApi';
import type { DashboardDeliveryRouteStopsApiResponse } from '@/services/MainAPI/dashboardApi';
import DashboardGaugeCard from './DashboardGaugeCard.vue';
import DashboardHorizontalBarChart from './DashboardHorizontalBarChart.vue';
import DashboardDeliveryScatterChart from './DashboardDeliveryScatterChart.vue';
import DashboardSegmentedTabs from './DashboardSegmentedTabs.vue';
import DashboardLineChart from './DashboardLineChart.vue';
import { formatTooltipCurrency } from './chartFormat';
import { getBranchSeriesColor } from './chartColors';
import type { DeliveryBranchOption, DeliverymanEfficiencyRow } from './operation.types';
import { DELIVERY_FEE_DRIVER_SHARE } from '@/constants/deliveryFeeShare';
import type {
	DashboardRouteHistoryItem,
	DeliveryRouteDashboardMetrics,
} from '@/services/MainAPI/dashboardSectionApi';

const branchId = defineModel<number | null>('branchId', { required: true });
const deliveryEvolutionDriverId = defineModel<number | 'all'>('deliveryEvolutionDriverId', {
	required: true,
});

const props = withDefaults(
	defineProps<{
		showBranchFilter?: boolean;
		showPrepTimeGauge?: boolean;
		/** Mostrar selector de domiciliario (desactivar en vista “solo yo”). */
		showDriverFilter?: boolean;
		/** Tarjetas resumen encima de medidores. */
		showKpiStrip?: boolean;
		/** Si true, el texto del rango menciona el sidebar del dashboard. */
		dateRangeFromSidebar?: boolean;
		cardTitle?: string;
		/** Barras y dispersión entre domiciliarios (se ocultan con un solo repartidor o si es false). */
		showTeamComparisonCharts?: boolean;
		branchOptions: DeliveryBranchOption[];
		dateRange: [Date, Date];
		avgPrepMinutes: number;
		avgDeliveryMinutes: number;
		deliverymen: DeliverymanEfficiencyRow[];
		evolutionLabels: string[];
		evolutionData: number[];
		evolutionFeeData: number[];
		evolutionSalesTotals: number[];
		periodFeeToSalesPercent: number;
		/** Métricas de rutas cerradas (`delivery_route`); null si el API no las envía. */
		routeMetrics?: DeliveryRouteDashboardMetrics | null;
	}>(),
	{
		showBranchFilter: true,
		showPrepTimeGauge: false,
		showDriverFilter: true,
		showKpiStrip: true,
		dateRangeFromSidebar: true,
		cardTitle: 'Eficiencia por domiciliario',
		showTeamComparisonCharts: true,
		routeMetrics: null,
	},
);

const formattedDateRange = computed(() => {
	const [a, b] = props.dateRange;
	const opts: Intl.DateTimeFormatOptions = {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	};
	return `${a.toLocaleDateString('es-CO', opts)} — ${b.toLocaleDateString('es-CO', opts)}`;
});

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

function formatFeeToSalesPercent(p: number): string {
	if (!Number.isFinite(p)) return '—';
	return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(p)} %`;
}

const hasFeeToSalesEvolution = computed(() => {
	const sales = props.evolutionSalesTotals;
	if (!sales.length) return false;
	const n = Math.min(sales.length, props.evolutionFeeData.length, props.evolutionLabels.length);
	for (let i = 0; i < n; i++) {
		if ((sales[i] ?? 0) > 0) return true;
	}
	return false;
});

const evolutionFeeToSalesPercentDatasets = computed(() => {
	const fees = props.evolutionFeeData;
	const sales = props.evolutionSalesTotals;
	const n = Math.min(fees.length, sales.length, props.evolutionLabels.length);
	const data: (number | null)[] = [];
	for (let i = 0; i < n; i++) {
		const s = sales[i] ?? 0;
		const f = fees[i] ?? 0;
		if (s <= 0) data.push(null);
		else data.push(Math.round((10000 * f) / s) / 100);
	}
	const pal = getBranchSeriesColor(3);
	return [
		{
			label: '% Fees / ventas',
			data,
			borderColor: pal.border,
			backgroundColor: pal.area,
		},
	];
});

function driverShareFromTotal(totalFees: number): number {
	return Math.round(totalFees * DELIVERY_FEE_DRIVER_SHARE);
}

const totalEvolutionDeliveries = computed(() => sumNumbers(props.evolutionData));
const totalEvolutionFees = computed(() => sumNumbers(props.evolutionFeeData));

const totalSalesFromEvolution = computed(() => sumNumbers(props.evolutionSalesTotals));

const avgTicketFromEvolution = computed(() => {
	const d = totalEvolutionDeliveries.value;
	if (d <= 0) return 0;
	return Math.round(totalSalesFromEvolution.value / d);
});

const sortedDeliverymen = computed(() =>
	[...props.deliverymen].sort((a, b) => b.deliveredCount - a.deliveredCount),
);

const showTeamBlock = computed(
	() => props.showTeamComparisonCharts && sortedDeliverymen.value.length > 1,
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

function formatPercentValue(n: number): string {
	if (!Number.isFinite(n)) return '—';
	return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(n)} %`;
}

function formatKm(k: number): string {
	if (!Number.isFinite(k)) return '—';
	return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(k)} km`;
}

function formatMinutes1(n: number): string {
	if (!Number.isFinite(n)) return '—';
	return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(n);
}

function formatRouteClosedAt(iso: string | null): string {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
	} catch {
		return iso;
	}
}

function formatSecondsAsMin(sec: number | null): string {
	if (sec == null) return '—';
	return formatMinutes1(sec / 60);
}

const routeStopsModalOpen = ref(false);
const routeStopsSelectedRow = ref<DashboardRouteHistoryItem | null>(null);
const routeStopsLoading = ref(false);
const routeStopsError = ref('');
const routeStopsList = ref<DashboardDeliveryRouteStopsApiResponse['stops']>([]);

const routeStopsModalTitle = computed(() =>
	routeStopsSelectedRow.value ? `Ruta #${routeStopsSelectedRow.value.id}` : 'Ruta',
);

function formatStopAddress(s: DashboardDeliveryRouteStopsApiResponse['stops'][0]): string {
	const t = (s.addressText || '').trim();
	const snap = (s.addressSnapshotText || '').trim();
	if (t) return t;
	if (snap) return snap;
	return '—';
}

function closeRouteStopsModal() {
	routeStopsModalOpen.value = false;
	routeStopsSelectedRow.value = null;
	routeStopsList.value = [];
	routeStopsError.value = '';
	routeStopsLoading.value = false;
}

function onRouteStopsDialogToggle(open: boolean) {
	if (!open) closeRouteStopsModal();
}

async function openRouteStopsModal(row: DashboardRouteHistoryItem) {
	routeStopsSelectedRow.value = row;
	routeStopsModalOpen.value = true;
	routeStopsError.value = '';
	routeStopsList.value = [];
	routeStopsLoading.value = true;
	try {
		const res = await dashboardApi.getDeliveryRouteStops(row.id, branchId.value);
		routeStopsList.value = res.stops ?? [];
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'No se pudieron cargar las paradas';
		routeStopsError.value = msg;
	} finally {
		routeStopsLoading.value = false;
	}
}

const routeChartLabels = computed(() => {
	const rm = props.routeMetrics;
	if (!rm) return [];
	const n = rm.evolutionRoutesCompleted.length;
	const L = props.evolutionLabels;
	if (L.length >= n) return L.slice(0, n);
	return [...L, ...Array.from({ length: n - L.length }, (_, i) => `·${i + 1}`)];
});

const routeCountDatasets = computed(() => {
	const rm = props.routeMetrics;
	if (!rm) return [];
	const pal = getBranchSeriesColor(4);
	return [
		{
			label: 'Rutas cerradas',
			data: rm.evolutionRoutesCompleted.map((x) => x),
			borderColor: pal.border,
			backgroundColor: pal.area,
		},
	];
});

const routeSlaPercentDatasets = computed(() => {
	const rm = props.routeMetrics;
	if (!rm) return [];
	const pal1 = getBranchSeriesColor(0);
	const pal2 = getBranchSeriesColor(1);
	return [
		{
			label: '% dentro de SLA',
			data: rm.evolutionOnTimePercent.map((x) => x),
			borderColor: pal1.border,
			backgroundColor: pal1.area,
		},
		{
			label: '% con retraso',
			data: rm.evolutionDelayedPercent.map((x) => x),
			borderColor: pal2.border,
			backgroundColor: pal2.area,
		},
	];
});

const routeActualMinutesDatasets = computed(() => {
	const rm = props.routeMetrics;
	if (!rm) return [];
	const pal = getBranchSeriesColor(5);
	return [
		{
			label: 'Min. reales (prom.)',
			data: rm.evolutionAvgActualRouteMinutes.map((x) => x),
			borderColor: pal.border,
			backgroundColor: pal.area,
		},
	];
});

const routeDelayMinutesDatasets = computed(() => {
	const rm = props.routeMetrics;
	if (!rm) return [];
	const pal = getBranchSeriesColor(2);
	return [
		{
			label: 'Retraso prom. (min)',
			data: rm.evolutionAvgDelayMinutes.map((x) => x),
			borderColor: pal.border,
			backgroundColor: pal.area,
		},
	];
});

const routeSlaDrivers = computed(() =>
	sortedDeliverymen.value.filter(
		(d) => (d.routeCompletedCount ?? 0) > 0 && d.routeOnTimePercent != null,
	),
);

const showRouteSlaByDriver = computed(
	() => props.showTeamComparisonCharts && routeSlaDrivers.value.length > 0,
);

const routeSlaBarLabels = computed(() => routeSlaDrivers.value.map((d) => d.name));

const routeSlaBarDatasets = computed(() => [
	{
		label: '% rutas a tiempo',
		data: routeSlaDrivers.value.map((d) => d.routeOnTimePercent ?? 0),
		backgroundColor: 'rgba(5, 120, 90, 0.88)',
	},
]);

const routeHistoryRows = computed(() => props.routeMetrics?.recentRoutes ?? []);
</script>
