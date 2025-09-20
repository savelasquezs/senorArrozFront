<template>
	<div class="space-y-1">
		<!-- Label -->
		<label
			v-if="label"
			:for="inputId"
			class="block text-sm font-medium text-gray-700"
		>
			{{ label }}
			<span v-if="required" class="text-red-500 ml-1">*</span>
		</label>

		<!-- Input wrapper -->
		<div class="relative">
			<input
				:id="inputId"
				:type="type"
				:value="modelValue"
				:placeholder="placeholder"
				:required="required"
				:disabled="disabled"
				:class="inputClasses"
				@input="
					$emit('update:modelValue', ($event.target as HTMLInputElement).value)
				"
				@blur="$emit('blur', $event)"
				@focus="$emit('focus', $event)"
			/>
			<div
				v-if="$slots.icon"
				class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"
			>
				<slot name="icon" />
			</div>
		</div>

		<!-- Error & Hint -->
		<p v-if="error" class="text-sm text-red-600">{{ error }}</p>
		<p v-else-if="hint" class="text-sm text-gray-500">{{ hint }}</p>
	</div>
</template>

<script setup lang="ts">
import { computed, useId, useSlots } from 'vue';

interface Props {
	modelValue: string;
	type?: string;
	label?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	error?: string;
	hint?: string;
}

const props = withDefaults(defineProps<Props>(), {
	type: 'text',
	required: false,
	disabled: false,
});

defineEmits<{
	'update:modelValue': [value: string];
	blur: [event: FocusEvent];
	focus: [event: FocusEvent];
}>();

const inputId = useId();

const inputClasses = computed(() => {
	const base =
		'block w-full px-3 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 sm:text-sm transition-colors';
	const hasIcon = !!useSlots().icon ? 'pl-10' : '';

	if (props.error) {
		return `${base} ${hasIcon} border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500`;
	}

	return `${base} ${hasIcon} border-gray-300 focus:ring-[#009966] focus:border-[#009966]`;
});
</script>
