<template>
	<div class="flex flex-col gap-3 min-w-0">
		<div class="flex flex-wrap gap-2">
			<button
				v-for="opt in presetOptions"
				:key="opt.id"
				type="button"
				class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border"
				:class="
					modelValue.presetId === opt.id
						? 'bg-emerald-700 text-white border-emerald-700'
						: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
				"
				@click="selectPreset(opt.id)"
			>
				{{ opt.label }}
			</button>
			<button
				type="button"
				class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border"
				:class="
					modelValue.presetId === 'custom'
						? 'bg-emerald-700 text-white border-emerald-700'
						: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
				"
				@click="selectCustomMode"
			>
				Rango de fechas
			</button>
		</div>
		<div
			v-if="modelValue.presetId === 'custom'"
			class="flex flex-col sm:flex-row sm:items-end gap-3"
		>
			<DashboardDateRangeFilter
				:model-value="modelValue.range"
				label="Desde — hasta"
				@update:model-value="onCustomRange"
			/>
		</div>
		<p v-else class="text-xs text-gray-500">
			Periodo:
			<strong>{{ formattedRange }}</strong>
		</p>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DashboardDateRangeFilter from './DashboardDateRangeFilter.vue';
import {
	DASHBOARD_PERIOD_PRESET_OPTIONS,
	getDateRangeForPreset,
	type DashboardPeriodPresetId,
	type DashboardPeriodValue,
} from '@/utils/dashboardPeriodPresets';

const props = defineProps<{
	modelValue: DashboardPeriodValue;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: DashboardPeriodValue];
}>();

const presetOptions = DASHBOARD_PERIOD_PRESET_OPTIONS;

/** Último rango elegido manualmente (para reabrir “Rango” con el mismo intervalo). */
const lastCustomRange = ref<[Date, Date] | null>(null);

const formattedRange = computed(() => {
	const [a, b] = props.modelValue.range;
	const same = a.getTime() === b.getTime();
	const f = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
	return same ? f(a) : `${f(a)} — ${f(b)}`;
});

function emitValue(next: DashboardPeriodValue) {
	emit('update:modelValue', next);
}

function selectPreset(id: DashboardPeriodPresetId) {
	const range = getDateRangeForPreset(id, new Date(), lastCustomRange.value);
	emitValue({ presetId: id, range });
}

function selectCustomMode() {
	const base =
		lastCustomRange.value ??
		props.modelValue.range ??
		getDateRangeForPreset('this_month', new Date());
	lastCustomRange.value = [base[0], base[1]];
	emitValue({ presetId: 'custom', range: [base[0], base[1]] });
}

function onCustomRange(range: [Date, Date]) {
	lastCustomRange.value = [range[0], range[1]];
	emitValue({ presetId: 'custom', range });
}

watch(
	() => props.modelValue.presetId,
	(id) => {
		if (id === 'custom') {
			lastCustomRange.value = [props.modelValue.range[0], props.modelValue.range[1]];
		}
	},
	{ immediate: true },
);
</script>
