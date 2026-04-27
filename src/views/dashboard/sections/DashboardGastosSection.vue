<template>
	<div class="space-y-6">
		<div
			v-if="loading"
			class="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500"
		>
			Cargando Gastos…
		</div>
		<div
			v-else-if="error"
			class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
		>
			{{ error }}
		</div>
		<template v-else>
			<p class="text-[11px] text-gray-500 mb-3">
				El periodo y la escala de la serie están en el <strong>panel lateral</strong>.
			</p>
			<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
				<div class="min-w-[200px]">
					<label class="block text-xs font-medium text-gray-600 mb-1">Categoría (línea)</label>
					<select
						v-model.number="categorySelectValue"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
					>
						<option :value="0">Todas — total</option>
						<option v-for="c in categoryOptions" :key="c.id" :value="c.id">
							{{ c.name }}
						</option>
					</select>
				</div>
				<div v-if="filterCategoryId != null" class="min-w-[220px]">
					<label class="block text-xs font-medium text-gray-600 mb-1">Gasto (catálogo)</label>
					<select
						v-model.number="expenseSelectValue"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
						:disabled="expenseOptionsLoading"
					>
						<option :value="0">Todos en la categoría</option>
						<option v-for="e in expenseOptions" :key="e.id" :value="e.id">
							{{ e.name }}
						</option>
					</select>
				</div>
				<div v-if="filterCategoryId != null" class="min-w-[200px]">
					<label class="block text-xs font-medium text-gray-600 mb-1">Cuántas líneas mostrar (mayor importe)</label>
					<select
						v-model.number="topLinesLimit"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
					>
						<option v-for="n in topLineLimitOptions" :key="n" :value="n">
							{{ n === 500 ? 'Hasta 500 (máx.)' : `Top ${n}` }}
						</option>
					</select>
				</div>
			</div>

			<div v-if="payload?.summary" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-4">
				<BaseCard :padding="'md'" :shadow="'sm'">
					<p class="text-[11px] font-medium text-gray-500">Total gastado</p>
					<p class="mt-1 text-lg font-bold text-gray-900 tabular-nums">
						{{ formatCop(payload.summary.totalCop) }}
					</p>
					<p
						class="mt-2 text-[10px] flex items-center gap-1"
						:class="deltaClass(payload.summary.totalChangeFromPreviousPercent)"
					>
						<span class="font-semibold tabular-nums">
							{{ formatDeltaPercent(payload.summary.totalChangeFromPreviousPercent) }}
						</span>
						<span class="text-gray-500">vs periodo anterior</span>
					</p>
				</BaseCard>
				<BaseCard :padding="'md'" :shadow="'sm'">
					<p class="text-[11px] font-medium text-gray-500">Promedio diario</p>
					<p class="mt-1 text-lg font-bold text-gray-900 tabular-nums">
						{{ formatCop(Math.round(payload.summary.avgDailyCop)) }}
					</p>
				</BaseCard>
				<BaseCard :padding="'md'" :shadow="'sm'">
					<p class="text-[11px] font-medium text-gray-500">Comprobantes</p>
					<p class="mt-1 text-lg font-bold text-gray-900 tabular-nums">
						{{ payload.summary.headerCount }}
					</p>
				</BaseCard>
				<BaseCard :padding="'md'" :shadow="'sm'">
					<p class="text-[11px] font-medium text-gray-500">Ticket medio</p>
					<p class="mt-1 text-lg font-bold text-gray-900 tabular-nums">
						{{ formatCop(Math.round(payload.summary.avgTicketCop)) }}
					</p>
				</BaseCard>
			</div>

			<div
				v-if="filterCategoryId != null"
				class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
			>
				<div class="flex flex-wrap items-center justify-between gap-2 mb-2">
					<p class="text-sm font-medium text-gray-800">Mayores importes (por línea)</p>
					<p v-if="topLinesLoading" class="text-xs text-gray-500">Cargando…</p>
				</div>
				<p class="text-[11px] text-gray-500 mb-2">
					Mismas fechas y sucursal del panel. Orden: importe de línea descendente.
				</p>
				<div
					v-if="!topLinesLoading && topLines.length === 0"
					class="text-sm text-gray-500 py-4 text-center"
				>
					Sin líneas en este rango y filtros.
				</div>
				<div v-else class="overflow-x-auto -mx-1">
					<table class="min-w-full text-left text-xs text-gray-800">
						<thead>
							<tr class="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-500">
								<th class="py-2 pr-2">Factura</th>
								<th class="py-2 pr-2">Fecha</th>
								<th class="py-2 pr-2">Gasto (línea)</th>
								<th class="py-2 pr-2">Proveedor</th>
								<th class="py-2 pr-2 hidden sm:table-cell">Sucursal</th>
								<th class="py-2 text-right">Importe</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in topLines"
								:key="row.detailId"
								class="border-b border-gray-100 last:border-0"
							>
								<td class="py-1.5 pr-2 font-mono text-[11px]">#{{ row.headerId }}</td>
								<td class="py-1.5 pr-2 tabular-nums">
									{{ formatDateTimeCompact(row.headerCreatedAtUtc) }}
								</td>
								<td class="py-1.5 pr-2">{{ row.expenseName }}</td>
								<td class="py-1.5 pr-2">{{ row.supplierName || '—' }}</td>
								<td class="py-1.5 pr-2 hidden sm:table-cell">{{ row.branchName || '—' }}</td>
								<td class="py-1.5 text-right font-medium tabular-nums">
									{{ formatCurrency(row.lineCop) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<BaseCard title="Por categoría" :padding="'md'">
					<p class="text-xs text-gray-500 mb-3">Participación del periodo (importe por categoría).</p>
					<div
						v-if="!pieLabels.length"
						class="h-52 flex items-center justify-center text-sm text-gray-500"
					>
						Sin gastos en este rango.
					</div>
					<DashboardRevenueShareDonut
						v-else
						:labels="pieLabels"
						:values="pieValues"
						:percents="piePercents"
					/>
				</BaseCard>
				<BaseCard title="Evolución" :padding="'md'">
					<p class="text-xs text-gray-500 mb-2">
						{{ payload?.timeSeries?.seriesLabel ?? 'Serie' }}
						<span v-if="payload?.timeSeries" class="text-gray-400">
							·
							{{
								payload.timeSeries.granularity === 'month'
									? 'por mes'
									: payload.timeSeries.granularity === 'fortnight'
										? 'por quincena'
										: 'por día'
							}}
						</span>
					</p>
					<div
						class="relative min-h-[220px]"
						:class="{ 'opacity-60 pointer-events-none': seriesBusy }"
					>
						<div
							v-if="!lineLabels.length"
							class="h-52 flex items-center justify-center text-sm text-gray-500"
						>
							Sin puntos en la serie para este filtro.
						</div>
						<DashboardLineChart
							v-else
							:labels="lineLabels"
							:datasets="lineDatasets"
							y-format="currency"
							variant="area"
						/>
					</div>
				</BaseCard>
			</div>

			<div class="mt-8">
				<MenuCategoryCostingPanel :branch-id="branchId" :date-range="dateRange" />
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { DashboardLineChart, DashboardRevenueShareDonut } from '@/components/dashboard';
import MenuCategoryCostingPanel from '@/components/dashboard/MenuCategoryCostingPanel.vue';
import type { LineChartDataset } from '@/components/dashboard';
import { expenseCategoryApi } from '@/services/MainAPI/expenseCategoryApi';
import { expenseApi } from '@/services/MainAPI/expenseApi';
import type { Expense } from '@/types/expense';
import type {
	GastosDashboardPayload,
	GastosTopLineItem,
} from '@/composables/dashboard/useDashboardGastosSection';
import { formatCurrency, formatDateTimeCompact } from '@/composables/useFormatting';
import { defaultBusinessCalendar } from '@/utils/datetime';

const props = withDefaults(
	defineProps<{
		loading: boolean;
		seriesBusy: boolean;
		error: string | null | undefined;
		/** `null` hasta la primera carga exitosa. */
		payload: GastosDashboardPayload | null | undefined;
		branchId: number | null;
		dateRange: [Date, Date];
		topLines?: GastosTopLineItem[];
		topLinesLoading?: boolean;
	}>(),
	{
		topLines: () => [],
		topLinesLoading: false,
	},
);

const topLineLimitOptions = [5, 10, 15, 25, 50, 100, 500] as const;
const topLinesLimit = defineModel<number>('topLinesLimit', { default: 15 });

const branchId = computed(() => props.branchId);
const dateRange = computed(() => props.dateRange);

const filterCategoryId = defineModel<number | null>('filterCategoryId', { default: null });
const filterExpenseId = defineModel<number | null>('filterExpenseId', { default: null });

const categoryOptions = ref<Array<{ id: number; name: string }>>([]);
const expenseOptions = ref<Expense[]>([]);
const expenseOptionsLoading = ref(false);

const categorySelectValue = computed({
	get: () => (filterCategoryId.value == null ? 0 : filterCategoryId.value),
	set: (v: number) => {
		filterCategoryId.value = v === 0 ? null : v;
	},
});

const expenseSelectValue = computed({
	get: () => (filterExpenseId.value == null ? 0 : filterExpenseId.value),
	set: (v: number) => {
		filterExpenseId.value = v === 0 ? null : v;
	},
});

async function loadCategories() {
	try {
		const res = await expenseCategoryApi.getAllExpenseCategories();
		const list = res.data ?? [];
		categoryOptions.value = list.map((c) => ({ id: c.id, name: c.name }));
	} catch {
		categoryOptions.value = [];
	}
}

watch(
	() => filterCategoryId.value,
	async (catId) => {
		expenseOptions.value = [];
		if (catId == null) return;
		expenseOptionsLoading.value = true;
		try {
			const res = await expenseApi.getExpenses({
				categoryId: catId,
				page: 1,
				pageSize: 500,
				sortBy: 'name',
				sortOrder: 'asc',
			});
			expenseOptions.value = res.data?.items ?? [];
		} catch {
			expenseOptions.value = [];
		} finally {
			expenseOptionsLoading.value = false;
		}
	},
	{ immediate: true },
);

void loadCategories();

function formatCop(n: number) {
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n);
}

function formatDeltaPercent(p: number) {
	const sign = p > 0 ? '+' : '';
	return `${sign}${p.toFixed(1)} %`;
}

function deltaClass(p: number) {
	if (p > 0) return 'text-amber-700';
	if (p < 0) return 'text-emerald-700';
	return 'text-gray-600';
}

const pieLabels = computed(() => props.payload?.byCategory.map((s) => s.name) ?? []);
const pieValues = computed(() => props.payload?.byCategory.map((s) => s.totalCop) ?? []);
const piePercents = computed(() => props.payload?.byCategory.map((s) => s.percent) ?? []);

const lineLabels = computed(() => {
	const raw = props.payload?.timeSeries?.labels ?? [];
	return raw.map((l) => {
		if (/^\d{4}-\d{2}-\d{2}$/.test(l)) {
			return defaultBusinessCalendar.formatDayPaddedShortMonth(l);
		}
		if (/^\d{4}-\d{2}$/.test(l)) {
			return defaultBusinessCalendar.formatShortMonthYear(l);
		}
		return l;
	});
});

const lineDatasets = computed((): LineChartDataset[] => {
	const amounts = props.payload?.timeSeries?.amountsCop ?? [];
	const label = props.payload?.timeSeries?.seriesLabel ?? 'Gastos';
	return [
		{
			label,
			data: amounts.map((n) => Number(n)),
		},
	];
});
</script>
