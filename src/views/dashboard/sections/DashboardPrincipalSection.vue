<template>
	<div class="space-y-6">
		<div
			v-if="loading"
			class="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
		>
			Cargando sección Principal…
		</div>
		<div
			v-else-if="error"
			class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
		>
			{{ error }}
		</div>
		<template v-else-if="kpis">
			<div
				class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 xl:gap-6"
			>
				<DashboardKpiCard
					title="Ventas totales"
					:value="kpis.totalSales"
					format="currency"
					:week-change-percent="kpis.totalSalesWeekChangePercent"
					:year-change-percent="kpis.totalSalesYearChangePercent"
					icon="currency"
				/>
				<DashboardKpiCard
					title="Pedidos"
					:value="kpis.ordersCount"
					format="number"
					:week-change-percent="kpis.ordersWeekChangePercent"
					:year-change-percent="kpis.ordersYearChangePercent"
					icon="orders"
				/>
				<DashboardKpiCard
					title="Ticket promedio"
					:value="kpis.avgTicket"
					format="currency"
					:week-change-percent="kpis.avgTicketWeekChangePercent"
					:year-change-percent="kpis.avgTicketYearChangePercent"
					icon="store"
				/>
				<DashboardKpiCard
					title="% cancelaciones"
					:value="kpis.cancellationRate"
					format="percent"
					:week-change-percent="kpis.cancellationRateWeekChangePercent"
					:year-change-percent="kpis.cancellationRateYearChangePercent"
					:higher-is-better="false"
					icon="chart"
				/>
			</div>

			<BaseCard title="Ventas vs gastos" :padding="'md'">
				<p class="text-xs text-gray-500 mb-4">
					Mismo rango de fechas y escala temporal que el panel lateral (día, mes o año). La barra de
					ventas se compara con los gastos apilados por categoría (hasta 8 categorías + «Otros»).
				</p>
				<div
					v-if="salesVsExpensesLoading"
					class="flex min-h-[200px] items-center justify-center text-sm text-gray-500"
				>
					Cargando gráfico…
				</div>
				<div
					v-else-if="salesVsExpensesError"
					class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
				>
					{{ salesVsExpensesError }}
				</div>
				<DashboardSalesVsExpensesBarChart
					v-else
					:labels="salesVsExpenses?.labels ?? []"
					:sales-cop="salesVsExpenses?.salesCop ?? []"
					:expense-categories="salesVsExpenses?.expenseCategories ?? []"
				/>
			</BaseCard>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4">
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

			<BaseCard title="Estados de pedidos (ahora)" :padding="'md'">
				<p class="text-xs text-gray-500 mb-4">
					Pipeline en curso: Tomado → En preparación → Listo → En camino. El bloque con más pedidos
					sugiere dónde mirar primero.
				</p>
				<DashboardOrderStatusKanban :counts="pipelineCounts ?? emptyPipelineCounts" />
			</BaseCard>

			<BaseCard title="Actividad Reciente">
				<div v-if="recentActivity.length === 0" class="py-6 text-center text-sm text-gray-500">
					Sin actividad reciente para el filtro actual.
				</div>
				<div v-else class="space-y-4">
					<div
						v-for="activity in recentActivity"
						:key="activity.id"
						class="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-0"
					>
						<div class="flex-shrink-0">
							<div
								class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"
							>
								<component
									:is="getActivityIcon(activity.type)"
									class="w-4 h-4 text-orange-600"
								/>
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm text-gray-900">{{ activity.description }}</p>
							<p class="text-sm text-gray-500">{{ formatDate(activity.timestamp) }}</p>
						</div>
						<div class="text-sm text-gray-500">
							{{ activity.branch }}
						</div>
					</div>
				</div>
			</BaseCard>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import {
	DashboardGaugeCard,
	DashboardKpiCard,
	DashboardOrderStatusKanban,
} from '@/components/dashboard';
import DashboardSalesVsExpensesBarChart from '@/components/dashboard/DashboardSalesVsExpensesBarChart.vue';
import type { OrderPipelineStatusCounts } from '@/components/dashboard/operation.types';
import type { KpiState, ActivityItem } from '@/views/dashboard/mock/dashboardMockCore';
import type { DashboardPrincipalSalesVsExpensesApiResponse } from '@/services/MainAPI/dashboardApi';

const emptyPipelineCounts: OrderPipelineStatusCounts = {
	taken: 0,
	in_preparation: 0,
	ready: 0,
	on_the_way: 0,
};

defineProps<{
	loading: boolean;
	error: string | null;
	kpis: KpiState | null;
	/** Desde `GET /api/dashboard/main` (ventana alineada a KPIs). */
	avgPrepMinutes: number;
	avgDeliveryMinutes: number;
	pipelineCounts: OrderPipelineStatusCounts | null;
	recentActivity: ActivityItem[];
	getActivityIcon: (type: string) => Component;
	formatDate: (date: Date) => string;
	salesVsExpensesLoading: boolean;
	salesVsExpensesError: string | null;
	salesVsExpenses: DashboardPrincipalSalesVsExpensesApiResponse | null;
}>();
</script>
