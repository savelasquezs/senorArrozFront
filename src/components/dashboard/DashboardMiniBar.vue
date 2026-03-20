<template>
	<div class="flex items-center gap-2 min-w-0">
		<div
			class="h-2 flex-1 max-w-[120px] rounded-full bg-gray-100 overflow-hidden shrink"
			role="presentation"
		>
			<div
				class="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
				:style="{ width: `${pct}%` }"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		/** Valor actual */
		value: number;
		/** Máximo del conjunto (barra llena = 100 %) */
		max: number;
	}>(),
	{ max: 0 },
);

const pct = computed(() => {
	if (props.max <= 0) return 0;
	return Math.min(100, Math.round((props.value / props.max) * 1000) / 10);
});
</script>
