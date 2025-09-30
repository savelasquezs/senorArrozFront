<template>
	<div class="space-y-1">
		<!-- Label -->
		<label v-if="label" :for="inputId" class="block text-sm font-medium text-gray-700">
			{{ label }}
			<span v-if="required" class="text-red-500 ml-1">*</span>
		</label>

		<!-- Input wrapper -->
		<div class="relative">
			<input :id="inputId" :type="type" v-model="inputValue" :placeholder="placeholder" :required="required"
				:disabled="disabled" :class="inputClasses" @blur="onBlur" @focus="onFocus" :minlength="minlength"
				:maxlength="maxlength" />
			<div v-if="$slots.icon"
				class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
				<slot name="icon" />
			</div>
		</div>

		<!-- Error & Hint -->
		<p v-if="error" class="text-sm text-red-600">{{ error }}</p>
		<p v-else-if="hint" class="text-sm text-gray-500">{{ hint }}</p>
	</div>
</template>

<script setup lang="ts">
import { computed, useSlots, useId } from 'vue';

interface Props {
	// Aceptamos string | number | null para modelValue
	modelValue: string | number | null;
	type?: string;
	label?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	error?: string;
	hint?: string;
	minlength?: number;
	maxlength?: number;
}

const props = withDefaults(defineProps<Props>(), {
	type: 'text',
	required: false,
	disabled: false,
	minlength: 0,
	maxlength: 100,
});

const emit = defineEmits<{
	(e: 'update:modelValue', value: string | number | null): void;
	(e: 'blur', event: FocusEvent): void;
	(e: 'focus', event: FocusEvent): void;
}>();

const inputId = useId();
const slots = useSlots();

/**
 * inputValue es siempre string para el input HTML, pero en su setter
 * convertimos y emitimos string | number | null según props.type.
 */
const inputValue = computed({
	get: () => (props.modelValue === undefined || props.modelValue === null) ? '' : String(props.modelValue),
	set: (val: string) => {
		if (props.type === 'number') {
			// '' => null, otherwise Number(...)
			const parsed = val === '' ? null : Number(val);
			// Si Number(...) es NaN lo enviamos como null
			emit('update:modelValue', typeof parsed === 'number' && Number.isNaN(parsed) ? null : parsed);
		} else {
			emit('update:modelValue', val);
		}
	}
});

const inputClasses = computed(() => {
	const base =
		'block w-full px-3 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 sm:text-sm transition-colors';
	const hasIcon = !!slots.icon ? 'pl-10' : '';

	if (props.error) {
		return `${base} ${hasIcon} border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500`;
	}

	return `${base} ${hasIcon} border-gray-300 focus:ring-[#009966] focus:border-[#009966]`;
});

function onBlur(e: FocusEvent) {
	emit('blur', e);
}
function onFocus(e: FocusEvent) {
	emit('focus', e);
}
</script>
