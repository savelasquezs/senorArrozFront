<!-- src/components/ui/BaseBadge.vue -->
<template>
	<span :class="badgeClasses">
		<component v-if="icon" :is="icon" :class="iconClasses" />
		<slot />
	</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
	variant?:
		| 'default'
		| 'primary'
		| 'secondary'
		| 'success'
		| 'warning'
		| 'danger'
		| 'info';
	size?: 'sm' | 'md' | 'lg';
	icon?: any;
	outlined?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	variant: 'default',
	size: 'md',
	outlined: false,
});

const badgeClasses = computed(() => {
	const baseClasses = 'inline-flex items-center font-medium rounded-full';

	// Size classes
	const sizeClasses = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-0.5 text-sm',
		lg: 'px-3 py-1 text-base',
	};

	// Variant classes
	const variantClasses = props.outlined
		? {
				default: 'text-gray-800 bg-transparent border border-gray-300',
				primary: 'text-green-700 bg-transparent border border-green-300',
				secondary: 'text-gray-600 bg-transparent border border-gray-300',
				success: 'text-green-700 bg-transparent border border-green-300',
				warning: 'text-yellow-700 bg-transparent border border-yellow-300',
				danger: 'text-red-700 bg-transparent border border-red-300',
				info: 'text-blue-700 bg-transparent border border-blue-300',
		  }
		: {
				default: 'text-gray-800 bg-gray-100',
				primary: 'text-white bg-green-600',
				secondary: 'text-gray-600 bg-gray-100',
				success: 'text-green-800 bg-green-100',
				warning: 'text-yellow-800 bg-yellow-100',
				danger: 'text-red-800 bg-red-100',
				info: 'text-blue-800 bg-blue-100',
		  };

	return [
		baseClasses,
		sizeClasses[props.size],
		variantClasses[props.variant],
	].join(' ');
});

const iconClasses = computed(() => {
	const sizeClasses = {
		sm: 'w-3 h-3',
		md: 'w-4 h-4',
		lg: 'w-5 h-5',
	};

	return [sizeClasses[props.size], 'mr-1'].join(' ');
});
</script>
