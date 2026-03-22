<template>
	<div
		class="inline-flex flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5"
		role="tablist"
		:aria-label="ariaLabel"
	>
		<button
			v-for="opt in options"
			:key="String(opt.value)"
			type="button"
			role="tab"
			:aria-selected="modelValue === opt.value"
			:class="[
				'px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors min-h-[2rem]',
				modelValue === opt.value
					? 'bg-white text-emerald-800 shadow-sm'
					: 'text-gray-600 hover:text-gray-900',
			]"
			@click="select(opt.value)"
		>
			{{ opt.label }}
		</button>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	modelValue: string;
	options: Array<{ value: string; label: string }>;
	ariaLabel?: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

function select(value: string) {
	emit('update:modelValue', value);
}
</script>
