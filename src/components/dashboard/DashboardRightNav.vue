<template>
	<aside
		class="flex w-full shrink-0 flex-col border-l border-gray-200 bg-white lg:sticky lg:top-0 lg:h-[calc(100vh-4rem)] lg:w-72 lg:min-w-[18rem] lg:max-w-[18rem]"
		aria-label="Navegación del dashboard"
	>
		<div class="border-b border-gray-100 p-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Secciones</p>
			<nav class="mt-2 flex flex-col gap-1" role="navigation">
				<button
					v-for="item in DASHBOARD_SECTION_NAV"
					:key="item.id"
					type="button"
					class="rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
					:class="
						modelValue === item.id
							? 'bg-emerald-700 text-white'
							: 'text-gray-700 hover:bg-gray-50'
					"
					@click="$emit('update:modelValue', item.id)"
				>
					{{ item.label }}
				</button>
			</nav>
		</div>
		<div v-if="showGlobalFilters" class="border-b border-gray-100 p-3 space-y-3">
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Periodo</p>
				<div class="mt-1.5 grid grid-cols-2 gap-1.5" role="group" aria-label="Accesos rápidos de fecha">
					<button
						type="button"
						class="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
						:class="
							isTodayPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyToday"
					>
						Hoy
					</button>
					<button
						type="button"
						class="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
						:class="
							isYesterdayPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyYesterday"
					>
						Ayer
					</button>
					<button
						type="button"
						class="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
						:class="
							isThisMonthPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyThisMonth"
					>
						Este mes
					</button>
					<button
						type="button"
						class="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
						:class="
							isLastMonthPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyLastMonth"
					>
						Mes pasado
					</button>
					<button
						type="button"
						title="Esta quincena (1–15 o 16–fin de mes)"
						class="rounded-md border px-1.5 py-1 text-[10px] font-medium leading-tight transition-colors"
						:class="
							isThisFortnightPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyThisFortnight"
					>
						Esta quincena
					</button>
					<button
						type="button"
						title="Quincena pasada"
						class="rounded-md border px-1.5 py-1 text-[10px] font-medium leading-tight transition-colors"
						:class="
							isLastFortnightPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyLastFortnight"
					>
						Quincena pasada
					</button>
					<button
						type="button"
						class="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
						:class="
							isThisYearPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyThisYear"
					>
						Este año
					</button>
					<button
						type="button"
						class="rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
						:class="
							isLastYearPreset
								? 'border-emerald-600 bg-emerald-50 text-emerald-900'
								: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
						"
						@click="applyLastYear"
					>
						Año pasado
					</button>
				</div>
				<DashboardDateRangeFilter
					v-model="dateRangeModel"
					class="mt-2"
					label="Desde / hasta"
					:max-date="maxSelectableDate"
					:min-date="minSelectableDate"
					teleport="body"
				/>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Escala</p>
				<DashboardSegmentedTabs
					v-model="timeGranularityModel"
					class="mt-1.5 w-full"
					:options="granularityTabs"
					aria-label="Escala temporal global del dashboard"
				/>
			</div>
			<p class="text-[10px] leading-snug text-gray-500">
				Aplica a <strong>Principal</strong> (KPIs y tiempos), ventas, peso por categoría y gastos.
				<strong>Hora</strong>: último día del rango en ventas. Sin recargar la página.
			</p>
		</div>
		<div v-if="showBranchFilter" class="mt-auto border-t border-gray-100 p-3">
			<label class="block text-xs font-medium text-gray-600 mb-1" for="dashboard-global-branch"
				>Sucursal</label
			>
			<select
				id="dashboard-global-branch"
				class="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
				:value="branchId === null ? '' : String(branchId)"
				@change="onBranchChange"
			>
				<option value="">Todas las sucursales</option>
				<option v-for="b in branchOptions" :key="b.id" :value="String(b.id)">
					{{ b.name }}
				</option>
			</select>
			<p class="mt-2 text-[11px] leading-snug text-gray-500">
				Aplica a métricas y listados de la pantalla según cada sección.
			</p>
		</div>
	</aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
	defaultDateRangeToday,
	defaultDateRangeYesterday,
	defaultDateRangeThisMonth,
	defaultDateRangeLastMonth,
	defaultDateRangeThisFortnight,
	defaultDateRangeLastFortnight,
	defaultDateRangeThisYear,
	defaultDateRangeLastYear,
	startOfDay,
} from './dashboardDateUtils';
import { DASHBOARD_SECTION_NAV } from '@/views/dashboard/dashboardSectionIds';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import type { DeliveryBranchOption } from './operation.types';
import DashboardDateRangeFilter from './DashboardDateRangeFilter.vue';
import DashboardSegmentedTabs from './DashboardSegmentedTabs.vue';
import {
	DASHBOARD_TIME_GRANULARITY_TABS,
	type DashboardTimeGranularity,
} from '@/views/dashboard/dashboardGlobalFilters';

const props = withDefaults(
	defineProps<{
		modelValue: DashboardSectionId;
		branchId: number | null;
		branchOptions: DeliveryBranchOption[];
		showBranchFilter: boolean;
		/** Filtro global de fechas (compartido entre secciones). */
		dateRange: [Date, Date];
		timeGranularity: DashboardTimeGranularity;
		showGlobalFilters?: boolean;
	}>(),
	{ showGlobalFilters: true },
);

const emit = defineEmits<{
	'update:modelValue': [value: DashboardSectionId];
	'update:branchId': [value: number | null];
	'update:dateRange': [value: [Date, Date]];
	'update:timeGranularity': [value: DashboardTimeGranularity];
}>();

const dateRangeModel = computed({
	get: () => props.dateRange,
	set: (v: [Date, Date]) => emit('update:dateRange', v),
});

function sameCalendarDay(a: Date, b: Date): boolean {
	return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Rango de un solo día (inicio = fin en mismo día). */
function isSingleDayRange(range: [Date, Date]): boolean {
	return sameCalendarDay(range[0], range[1]);
}

const isTodayPreset = computed(() => {
	const r = props.dateRange;
	if (!isSingleDayRange(r)) return false;
	const today = startOfDay(new Date());
	return sameCalendarDay(r[0], today);
});

const isYesterdayPreset = computed(() => {
	const r = props.dateRange;
	if (!isSingleDayRange(r)) return false;
	const y = startOfDay(new Date());
	y.setDate(y.getDate() - 1);
	return sameCalendarDay(r[0], y);
});

function rangesEqual(a: [Date, Date], b: [Date, Date]): boolean {
	return (
		startOfDay(a[0]).getTime() === startOfDay(b[0]).getTime() &&
		startOfDay(a[1]).getTime() === startOfDay(b[1]).getTime()
	);
}

const isThisMonthPreset = computed(() =>
	rangesEqual(props.dateRange, defaultDateRangeThisMonth()),
);

const isLastMonthPreset = computed(() =>
	rangesEqual(props.dateRange, defaultDateRangeLastMonth()),
);

const isThisFortnightPreset = computed(() =>
	rangesEqual(props.dateRange, defaultDateRangeThisFortnight()),
);

const isLastFortnightPreset = computed(() =>
	rangesEqual(props.dateRange, defaultDateRangeLastFortnight()),
);

const isThisYearPreset = computed(() =>
	rangesEqual(props.dateRange, defaultDateRangeThisYear()),
);

const isLastYearPreset = computed(() =>
	rangesEqual(props.dateRange, defaultDateRangeLastYear()),
);

function applyToday() {
	emit('update:dateRange', defaultDateRangeToday());
}

function applyYesterday() {
	emit('update:dateRange', defaultDateRangeYesterday());
}

function applyThisMonth() {
	emit('update:dateRange', defaultDateRangeThisMonth());
}

function applyLastMonth() {
	emit('update:dateRange', defaultDateRangeLastMonth());
}

function applyThisFortnight() {
	emit('update:dateRange', defaultDateRangeThisFortnight());
}

function applyLastFortnight() {
	emit('update:dateRange', defaultDateRangeLastFortnight());
}

function applyThisYear() {
	emit('update:dateRange', defaultDateRangeThisYear());
}

function applyLastYear() {
	emit('update:dateRange', defaultDateRangeLastYear());
}

const timeGranularityModel = computed({
	get: () => props.timeGranularity,
	set: (v: string) => {
		if (v === 'day' || v === 'hour' || v === 'month' || v === 'year') {
			emit('update:timeGranularity', v);
		}
	},
});

const granularityTabs = DASHBOARD_TIME_GRANULARITY_TABS.map((x) => ({
	value: x.value,
	label: x.label,
}));

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

function onBranchChange(e: Event) {
	const v = (e.target as HTMLSelectElement).value;
	emit('update:branchId', v === '' ? null : Number(v));
}
</script>
