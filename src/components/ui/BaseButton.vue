<template>
	<button :type="type" :disabled="disabled || loading" :class="buttonClasses" @click="$emit('click', $event)">
		<!-- Loading state -->
		<span v-if="loading" class="flex items-center">
			<svg class="animate-spin -ml-1 mr-2 h-4 w-4" :class="loadingIconColor" xmlns="http://www.w3.org/2000/svg"
				fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
				</path>
			</svg>
			<span v-if="loadingText">{{ loadingText }}</span>
			<span v-else>
				<slot />
			</span>
		</span>

		<!-- Normal state -->
		<span v-else class="flex items-center">
			<!-- Icon (left side) -->
			<component v-if="icon" :is="icon" class="h-4 w-4" :class="iconClasses" />

			<!-- Text content -->
			<span v-if="$slots.default" :class="textClasses">
				<slot />
			</span>

			<!-- Right icon -->
			<component v-if="rightIcon" :is="rightIcon" class="h-4 w-4 ml-2" :class="iconClasses" />
		</span>
	</button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
	variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
	size?: 'sm' | 'md' | 'lg';
	type?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
	loading?: boolean;
	loadingText?: string;
	fullWidth?: boolean;
	icon?: any;
	rightIcon?: any;
}

const props = withDefaults(defineProps<Props>(), {
	variant: 'primary',
	size: 'md',
	type: 'button',
	disabled: false,
	loading: false,
	fullWidth: false,
});

defineEmits<{
	click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => {
	const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variants = {
		primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-sm hover:shadow-md',
		secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 shadow-sm hover:shadow-md',
		danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm hover:shadow-md',
		success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-sm hover:shadow-md',
		outline: 'border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-600 focus:ring-emerald-500 shadow-sm hover:shadow-md',
		ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-sm gap-1',
		md: 'px-4 py-2 text-sm gap-2',
		lg: 'px-6 py-3 text-base gap-2',
	};

	const width = props.fullWidth ? 'w-full' : '';

	return `${base} ${variants[props.variant]} ${sizes[props.size]} ${width}`;
});

const iconClasses = computed(() => {
	if (props.variant === 'outline') {
		return 'text-emerald-600';
	}
	if (props.variant === 'secondary' || props.variant === 'ghost') {
		return 'text-gray-600';
	}
	return 'text-white';
});

const textClasses = computed(() => {
	if (props.icon && props.rightIcon) {
		return 'mx-2';
	}
	if (props.icon || props.rightIcon) {
		return 'ml-2';
	}
	return '';
});

const loadingIconColor = computed(() => {
	if (props.variant === 'outline') {
		return 'text-emerald-600';
	}
	if (props.variant === 'secondary' || props.variant === 'ghost') {
		return 'text-gray-600';
	}
	return 'text-white';
});
</script>