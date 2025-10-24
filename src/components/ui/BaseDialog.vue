<template>
	<Teleport to="body">
		<Transition name="dialog">
			<div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
				<!-- Backdrop -->
				<div class="fixed inset-0 bg-black/50 transition-opacity" @click="closeDialog" />

				<!-- Dialog -->
				<div class="relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto"
					:class="sizeClasses" @click.stop>
					<!-- Header -->
					<div v-if="$slots.header || title" class="flex items-center justify-between p-6 pb-0">
						<div class="flex items-center">
							<component v-if="icon" :is="icon" class="w-5 h-5 mr-2" :class="iconColorClass" />
							<slot name="header">
								<h3 class="text-lg font-semibold text-gray-900">
									{{ title }}
								</h3>
							</slot>
						</div>
						<button v-if="showCloseButton" @click="closeDialog"
							class="text-gray-400 hover:text-gray-500 transition-colors" type="button">
							<XMarkIcon class="w-5 h-5" />
						</button>
					</div>

					<!-- Content -->
					<div class="p-6">
						<slot />
					</div>

					<!-- Footer -->
					<div v-if="$slots.footer" class="flex justify-end gap-3 p-6 pt-0">
						<slot name="footer" />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

interface Props {
	modelValue: boolean;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
	icon?: any;
	iconVariant?: 'primary' | 'danger' | 'warning' | 'success';
	showCloseButton?: boolean;
	closeOnBackdrop?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	size: 'md',
	showCloseButton: true,
	closeOnBackdrop: true,
});

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const sizeClasses = computed(() => {
	const sizes = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		'2xl': 'max-w-2xl',
		'3xl': 'max-w-3xl',
		'4xl': 'max-w-4xl',
		'5xl': 'max-w-5xl',
		'6xl': 'max-w-6xl',
		'7xl': 'max-w-7xl',
	};
	return sizes[props.size];
});

const iconColorClass = computed(() => {
	const variants = {
		primary: 'text-green-600',
		danger: 'text-red-600',
		warning: 'text-yellow-600',
		success: 'text-green-600',
	};
	return variants[props.iconVariant || 'primary'];
});

const closeDialog = () => {
	if (props.closeOnBackdrop) {
		emit('update:modelValue', false);
	}
};
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
	opacity: 0;
}

.dialog-enter-active .relative,
.dialog-leave-active .relative {
	transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from .relative,
.dialog-leave-to .relative {
	transform: scale(0.95);
	opacity: 0;
}
</style>
