<template>
	<BaseDateRangePicker
		:model-value="pickerRange"
		:label="label"
		:max-date="maxDate"
		:min-date="minDate"
		:teleport="teleport"
		:auto-apply="autoApply"
		:format="format"
		:variant="variant"
		@update:model-value="onUpdate"
	/>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseDateRangePicker from '@/components/ui/BaseDateRangePicker.vue'
import { defaultBusinessCalendar } from '@/utils/datetime'

const props = withDefaults(
	defineProps<{
		fromDate: string | null | undefined
		toDate: string | null | undefined
		label?: string
		maxDate?: Date
		minDate?: Date
		teleport?: string | boolean | HTMLElement
		autoApply?: boolean
		format?: string
		variant?: 'default' | 'compact'
	}>(),
	{
		label: '',
		teleport: true,
		autoApply: true,
		format: 'dd/MM/yyyy',
		variant: 'default',
	},
)

const emit = defineEmits<{
	'update:fromDate': [value: string]
	'update:toDate': [value: string]
	change: [value: { fromDate: string; toDate: string }]
}>()

function parseYmd(value: string | null | undefined): Date | null {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
	const [year, month, day] = value.split('-').map(Number)
	return new Date(year, month - 1, day)
}

const pickerRange = computed<[Date, Date] | null>(() => {
	const from = parseYmd(props.fromDate)
	const to = parseYmd(props.toDate)
	if (!from || !to) return null
	return from <= to ? [from, to] : [to, from]
})

function onUpdate(range: [Date, Date]) {
	const fromDate = defaultBusinessCalendar.formatYmd(range[0])
	const toDate = defaultBusinessCalendar.formatYmd(range[1])
	emit('update:fromDate', fromDate)
	emit('update:toDate', toDate)
	emit('change', { fromDate, toDate })
}
</script>
