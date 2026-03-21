<template>
	<div class="w-full max-w-md min-w-0">
		<label class="block text-xs font-medium text-gray-600 mb-1">{{ label }}</label>
		<VueDatePicker
			:model-value="modelValue"
			range
			:max-date="maxDate"
			:min-date="minDate"
			:enable-time-picker="false"
			format="dd/MM/yyyy"
			auto-apply
			:clearable="false"
			:teleport="teleport"
			:locale="esLocale"
			class="w-full dashboard-date-range"
			@update:model-value="onUpdate"
		/>
	</div>
</template>

<script setup lang="ts">
import { VueDatePicker } from '@vuepic/vue-datepicker';
import { es } from 'date-fns/locale';
import '@vuepic/vue-datepicker/dist/main.css';

const esLocale = es;

withDefaults(
	defineProps<{
		modelValue: [Date, Date];
		label?: string;
		maxDate?: Date;
		minDate?: Date;
		teleport?: string | boolean | HTMLElement;
	}>(),
	{
		label: 'Periodo',
		teleport: true,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: [Date, Date]];
}>();

function onUpdate(v: Date[] | Date | null) {
	if (!v || !Array.isArray(v) || v.length !== 2 || !v[0] || !v[1]) return;
	const a = new Date(v[0]);
	const b = new Date(v[1]);
	a.setHours(0, 0, 0, 0);
	b.setHours(0, 0, 0, 0);
	if (a <= b) emit('update:modelValue', [a, b]);
	else emit('update:modelValue', [b, a]);
}
</script>

<style scoped>
:deep(.dashboard-date-range) {
	width: 100%;
}

:deep(.dp__main) {
	width: 100%;
}

:deep(.dp__input_wrap) {
	width: 100%;
}

:deep(.dp__input) {
	width: 100%;
	min-height: 2.5rem;
	border-radius: 0.5rem;
	border: 1px solid rgb(229 231 235);
	font-size: 0.875rem;
	padding: 0.375rem 0.75rem;
}
</style>
