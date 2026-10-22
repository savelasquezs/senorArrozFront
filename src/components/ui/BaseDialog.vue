<template>
	<Teleport to="body">
		<Transition name="dialog">
			<div
				v-if="modelValue"
				class="fixed inset-0 flex items-center justify-center"
				:class="[zClass, mobileFullScreen ? 'p-0 sm:p-4' : 'p-4']"
			>
				<!-- Backdrop -->
					<div class="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity" @click="closeOnBackdrop && closeDialog()" />

				<!-- Dialog -->
				<div
					ref="dialogElement"
					role="dialog"
					:aria-labelledby="title ? titleId : undefined"
					tabindex="-1"
					aria-modal="true"
					class="relative flex w-full flex-col overflow-hidden bg-white shadow-xl"
					:class="[sizeClasses, panelClass, mobileFullScreen ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl' : 'max-h-[90vh] rounded-2xl']"
					@click.stop
				>
					<!-- Header -->
					<div v-if="$slots.header || title" class="flex shrink-0 items-center justify-between p-6 pb-0">
						<div class="flex items-center">
							<component v-if="icon" :is="icon" class="w-5 h-5 mr-2" :class="iconColorClass" />
							<slot name="header">
								<h3 :id="titleId" class="text-lg font-semibold text-gray-900">
									{{ title }}
								</h3>
							</slot>
						</div>
						<button v-if="showCloseButton" @click="closeDialog" :disabled="!dismissible" aria-label="Cerrar diálogo"
							class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-emerald-600 disabled:opacity-40" type="button">
							<XMarkIcon class="w-5 h-5" />
						</button>
					</div>

					<!-- Content -->
					<div class="min-h-0 overflow-y-auto overscroll-contain p-6" :class="scrollBody ? 'flex-1' : undefined">
						<slot />
					</div>

					<!-- Footer -->
					<div v-if="$slots.footer" class="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
						<slot name="footer" />
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script lang="ts">
const dialogStack: symbol[] = [];
let previousBodyOverflow = '';
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

interface Props {
	modelValue: boolean;
	title?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
	icon?: any;
	iconVariant?: 'primary' | 'danger' | 'warning' | 'success';
	showCloseButton?: boolean;
	closeOnBackdrop?: boolean;
	dismissible?: boolean;
	initialFocus?: string;
	focusKey?: string | number;
	scrollBody?: boolean;
	mobileFullScreen?: boolean;
	/** Capa del overlay (p. ej. z-50 por defecto; z-[60] para diálogos anidados). */
	zClass?: string;
	/** Clase adicional para el panel del diálogo. */
	panelClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
	size: 'md',
	showCloseButton: true,
	closeOnBackdrop: true,
	dismissible: true,
	zClass: 'z-50',
});

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const titleId = useId();
const dialogElement = ref<HTMLElement | null>(null);
const dialogId = Symbol();
let opener: HTMLElement | null = null;
const isTop = () => dialogStack[dialogStack.length - 1] === dialogId;
const visible = (el: HTMLElement) => {
	if (el.closest('[hidden], [inert]')) return false;
	for (let parent: HTMLElement | null = el; parent; parent = parent.parentElement) {
		const style = getComputedStyle(parent);
		if (style.display === 'none' || style.visibility === 'hidden' || parent.tagName === 'DETAILS' && !parent.hasAttribute('open') && !parent.querySelector('summary')?.contains(el)) return false;
	}
	return true;
};
const controls = () => Array.from(dialogElement.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(visible);
function focusInside(event: FocusEvent) {
	if (props.modelValue && isTop() && !dialogElement.value?.contains(event.target as Node)) (controls()[0] ?? dialogElement.value)?.focus();
}
function handleKey(event: KeyboardEvent) {
	if (!props.modelValue || !isTop()) return;
	if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeDialog(); }
	if (event.key !== 'Tab') return;
	const elements = controls(), first = elements[0], last = elements[elements.length - 1];
	if (!first) { event.preventDefault(); dialogElement.value?.focus(); }
	else if (event.shiftKey && (document.activeElement === first || !dialogElement.value?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
	else if (!event.shiftKey && (document.activeElement === last || !dialogElement.value?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
}
function release() {
	const wasTop = isTop(), index = dialogStack.indexOf(dialogId);
	if (index < 0) return;
	dialogStack.splice(index, 1);
	document.removeEventListener('keydown', handleKey, true);
	document.removeEventListener('focusin', focusInside);
	if (!dialogStack.length) document.body.style.overflow = previousBodyOverflow;
	if (wasTop && opener?.isConnected) opener.focus();
}
async function focusInitial() {
	await nextTick();
	if (props.modelValue && isTop()) (dialogElement.value?.querySelector<HTMLElement>(props.initialFocus || '[autofocus], [data-autofocus], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? controls()[0] ?? dialogElement.value)?.focus();
}
watch(() => props.focusKey, focusInitial);
watch(() => props.modelValue, async open => {
	if (!open) { release(); return; }
	opener = document.activeElement as HTMLElement | null;
	if (!dialogStack.length) { previousBodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
	dialogStack.push(dialogId);
	document.addEventListener('keydown', handleKey, true);
	document.addEventListener('focusin', focusInside);
	await focusInitial();
}, { immediate: true });
onBeforeUnmount(release);

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
	if (props.dismissible) {
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
