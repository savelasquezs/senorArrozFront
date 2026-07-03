<template>
	<BaseDateRangePicker
		:model-value="modelValue"
		:label="label"
		:max-date="maxDate"
		:min-date="minDate"
		:teleport="teleport"
		variant="default"
		@update:model-value="emit('update:modelValue', $event)"
	/>
</template>

<script setup lang="ts">
import BaseDateRangePicker from '@/components/ui/BaseDateRangePicker.vue';

withDefaults(
	defineProps<{
		modelValue: [Date, Date] | null;
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
</script>
