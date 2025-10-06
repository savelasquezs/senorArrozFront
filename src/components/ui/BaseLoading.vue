<!-- src/components/ui/BaseLoading.vue -->
<template>
	<div :class="containerClasses">
		<div :class="spinnerClasses">
			<div
				class="animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
			/>
		</div>
		<p v-if="text" :class="textClasses">{{ text }}</p>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
	size?: 'sm' | 'md' | 'lg' | 'xl';
	variant?: 'primary' | 'secondary' | 'white';
	text?: string;
	overlay?: boolean;
	fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	size: 'md',
	variant: 'primary',
});

const containerClasses = computed(() => {
	const baseClasses = 'flex flex-col items-center justify-center';

	if (props.fullscreen) {
		return `${baseClasses} fixed inset-0 z-50 bg-white bg-opacity-90`;
	}

	if (props.overlay) {
		return `${baseClasses} absolute inset-0 bg-white bg-opacity-90 z-10`;
	}

	return `${baseClasses} py-8`;
});

const spinnerClasses = computed(() => {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8',
		xl: 'h-12 w-12',
	};

	const variantClasses = {
		primary: 'text-green-600',
		secondary: 'text-gray-500',
		white: 'text-white',
	};

	return [sizeClasses[props.size], variantClasses[props.variant]].join(' ');
});

const textClasses = computed(() => {
	const sizeClasses = {
		sm: 'text-xs mt-1',
		md: 'text-sm mt-2',
		lg: 'text-base mt-3',
		xl: 'text-lg mt-4',
	};

	return `${sizeClasses[props.size]} text-gray-600`;
});
</script>
