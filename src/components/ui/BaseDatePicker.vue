<template>
	<div :class="wrapperClass">
		<label v-if="label" class="mb-1 block text-xs font-medium text-gray-600">
			{{ label }}
		</label>
		<VueDatePicker
			:model-value="pickerValue"
			:max-date="maxDate"
			:min-date="minDate"
			:enable-time-picker="false"
			:format="format"
			:auto-apply="autoApply"
			:clearable="clearable"
			:teleport="teleport"
			:locale="esLocale"
			:placeholder="placeholder"
			:disabled="disabled"
			:class="['w-full base-date-picker', `base-date-picker--${variant}`]"
			@update:model-value="onUpdate"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { es } from 'date-fns/locale'
import '@vuepic/vue-datepicker/dist/main.css'
import { defaultBusinessCalendar } from '@/utils/datetime'

const esLocale = es

const props = withDefaults(
	defineProps<{
		modelValue: string | null
		label?: string
		maxDate?: Date
		minDate?: Date
		teleport?: string | boolean | HTMLElement
		clearable?: boolean
		autoApply?: boolean
		format?: string
		placeholder?: string
		disabled?: boolean
		variant?: 'default' | 'compact'
	}>(),
	{
		label: '',
		teleport: true,
		clearable: false,
		autoApply: true,
		format: 'dd/MM/yyyy',
		placeholder: 'Seleccionar fecha',
		disabled: false,
		variant: 'default',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: string | null]
	change: [value: string | null]
}>()

const wrapperClass = computed(() =>
	props.variant === 'compact' ? 'min-w-[140px] max-w-[220px] flex-1' : 'w-full max-w-md min-w-0',
)

const pickerValue = computed<Date | null>(() => {
	if (!props.modelValue || !/^\d{4}-\d{2}-\d{2}$/.test(props.modelValue)) return null
	const [year, month, day] = props.modelValue.split('-').map(Number)
	return new Date(year, month - 1, day)
})

function onUpdate(value: Date | null) {
	if (!value) {
		emit('update:modelValue', null)
		emit('change', null)
		return
	}
	const zoned = defaultBusinessCalendar.zonedDayFromPickerLocalDate(new Date(value))
	const ymd = defaultBusinessCalendar.formatYmd(zoned)
	emit('update:modelValue', ymd)
	emit('change', ymd)
}
</script>

<style scoped>
:deep(.base-date-picker) {
	width: 100%;
}

:deep(.base-date-picker .dp__main),
:deep(.base-date-picker .dp__input_wrap) {
	width: 100%;
}

:deep(.base-date-picker .dp__input) {
	width: 100%;
	border: 1px solid rgb(209 213 219);
	padding-left: 2.25rem;
	padding-right: 2.25rem;
	line-height: 1.25rem;
}

:deep(.base-date-picker--default .dp__input) {
	min-height: 2.5rem;
	border-radius: 0.75rem;
	font-size: 0.875rem;
	padding-top: 0.5rem;
	padding-bottom: 0.5rem;
}

:deep(.base-date-picker--compact .dp__input) {
	min-height: 2rem;
	border-radius: 0.375rem;
	font-size: 0.75rem;
	padding-top: 0.25rem;
	padding-bottom: 0.25rem;
	padding-left: 2rem;
	padding-right: 2rem;
}

:deep(.base-date-picker .dp__input_icon) {
	left: 0.625rem;
	top: 50%;
	transform: translateY(-50%);
	margin: 0;
}

:deep(.base-date-picker .dp__clear_icon) {
	right: 0.625rem;
	top: 50%;
	transform: translateY(-50%);
	margin: 0;
}
</style>
