<template>
	<div :class="wrapperClass">
		<label v-if="label" class="mb-1 block text-xs font-medium text-gray-600">
			{{ label }}
		</label>
		<VueDatePicker
			:model-value="modelValue"
			range
			:max-date="maxDate"
			:min-date="minDate"
			:enable-time-picker="false"
			:format="format"
			:auto-apply="autoApply"
			:clearable="clearable"
			:teleport="teleport"
			:locale="esLocale"
			:class="['w-full base-date-range', `base-date-range--${variant}`]"
			@update:model-value="onUpdate"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { es } from 'date-fns/locale'
import '@vuepic/vue-datepicker/dist/main.css'
import { zonedDayFromPickerLocalDate } from '@/utils/datetime'

const esLocale = es

const props = withDefaults(
	defineProps<{
		modelValue: [Date, Date] | null
		label?: string
		maxDate?: Date
		minDate?: Date
		teleport?: string | boolean | HTMLElement
		clearable?: boolean
		autoApply?: boolean
		format?: string
		variant?: 'default' | 'compact'
	}>(),
	{
		label: '',
		teleport: true,
		clearable: false,
		autoApply: true,
		format: 'dd/MM/yyyy',
		variant: 'default',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: [Date, Date]]
}>()

const wrapperClass = computed(() =>
	props.variant === 'compact' ? 'min-w-[200px] max-w-[260px] flex-1' : 'w-full max-w-md min-w-0',
)

function onUpdate(v: Date[] | Date | null) {
	if (!v || !Array.isArray(v) || v.length !== 2 || !v[0] || !v[1]) return
	const a = zonedDayFromPickerLocalDate(new Date(v[0]))
	const b = zonedDayFromPickerLocalDate(new Date(v[1]))
	if (a <= b) emit('update:modelValue', [a, b])
	else emit('update:modelValue', [b, a])
}
</script>

<style scoped>
:deep(.base-date-range) {
	width: 100%;
}

:deep(.base-date-range .dp__main) {
	width: 100%;
}

:deep(.base-date-range .dp__input_wrap) {
	width: 100%;
}

:deep(.base-date-range .dp__input) {
	width: 100%;
	border: 1px solid rgb(229 231 235);
	padding-left: 2.25rem;
	padding-right: 2.25rem;
	line-height: 1.25rem;
}

:deep(.base-date-range--default .dp__input) {
	min-height: 2.5rem;
	border-radius: 0.5rem;
	font-size: 0.875rem;
	padding-top: 0.375rem;
	padding-bottom: 0.375rem;
}

:deep(.base-date-range--compact .dp__input) {
	min-height: 2rem;
	border-radius: 0.375rem;
	font-size: 0.75rem;
	padding-top: 0.25rem;
	padding-bottom: 0.25rem;
	padding-left: 2rem;
	padding-right: 2rem;
}

:deep(.base-date-range .dp__input_icon) {
	left: 0.625rem;
	top: 50%;
	transform: translateY(-50%);
	margin: 0;
}

:deep(.base-date-range .dp__clear_icon) {
	right: 0.625rem;
	top: 50%;
	transform: translateY(-50%);
	margin: 0;
}
</style>
