<template>
	<div class="space-y-3">
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
	</div>
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
import DashboardDateRangeFilter from './DashboardDateRangeFilter.vue';

const props = defineProps<{
	modelValue: [Date, Date];
}>();

const emit = defineEmits<{
	'update:modelValue': [value: [Date, Date]];
}>();

const dateRangeModel = computed({
	get: () => props.modelValue,
	set: (v: [Date, Date]) => emit('update:modelValue', v),
});

function sameCalendarDay(a: Date, b: Date): boolean {
	return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isSingleDayRange(range: [Date, Date]): boolean {
	return sameCalendarDay(range[0], range[1]);
}

const isTodayPreset = computed(() => {
	const r = props.modelValue;
	if (!isSingleDayRange(r)) return false;
	const today = startOfDay(new Date());
	return sameCalendarDay(r[0], today);
});

const isYesterdayPreset = computed(() => {
	const r = props.modelValue;
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

const isThisMonthPreset = computed(() => rangesEqual(props.modelValue, defaultDateRangeThisMonth()));

const isLastMonthPreset = computed(() => rangesEqual(props.modelValue, defaultDateRangeLastMonth()));

const isThisFortnightPreset = computed(() =>
	rangesEqual(props.modelValue, defaultDateRangeThisFortnight()),
);

const isLastFortnightPreset = computed(() =>
	rangesEqual(props.modelValue, defaultDateRangeLastFortnight()),
);

const isThisYearPreset = computed(() => rangesEqual(props.modelValue, defaultDateRangeThisYear()));

const isLastYearPreset = computed(() => rangesEqual(props.modelValue, defaultDateRangeLastYear()));

function applyToday() {
	emit('update:modelValue', defaultDateRangeToday());
}

function applyYesterday() {
	emit('update:modelValue', defaultDateRangeYesterday());
}

function applyThisMonth() {
	emit('update:modelValue', defaultDateRangeThisMonth());
}

function applyLastMonth() {
	emit('update:modelValue', defaultDateRangeLastMonth());
}

function applyThisFortnight() {
	emit('update:modelValue', defaultDateRangeThisFortnight());
}

function applyLastFortnight() {
	emit('update:modelValue', defaultDateRangeLastFortnight());
}

function applyThisYear() {
	emit('update:modelValue', defaultDateRangeThisYear());
}

function applyLastYear() {
	emit('update:modelValue', defaultDateRangeLastYear());
}

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
</script>
