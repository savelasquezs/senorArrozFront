<template>
	<div>
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
			<div
				v-for="col in columns"
				:key="col.key"
				:class="[
					'rounded-xl border bg-white p-3 sm:p-4 transition-shadow min-h-[5.5rem] flex flex-col justify-center',
					bottleneckKey === col.key
						? 'ring-2 ring-amber-400 border-amber-200 shadow-md'
						: 'border-gray-100 shadow-sm',
				]"
			>
				<p class="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">
					{{ col.label }}
				</p>
				<p
					class="text-2xl sm:text-3xl font-bold tabular-nums mt-1"
					:class="bottleneckKey === col.key ? 'text-amber-900' : 'text-gray-900'"
				>
					{{ counts[col.key] ?? 0 }}
				</p>
			</div>
		</div>
		<p v-if="bottleneckKey && bottleneckLabel" class="text-xs text-amber-800 mt-3 flex items-start gap-1.5">
			<span class="font-semibold shrink-0">Cuello de botella:</span>
			<span>
				<strong>{{ bottleneckLabel }}</strong> concentra la mayor carga ({{ maxCount }} pedidos). Revisa
				capacidad o cuellos previos.
			</span>
		</p>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderPipelineStatusCounts } from './operation.types';

const COLUMN_DEF = [
	{ key: 'taken' as const, label: 'Tomado' },
	{ key: 'in_preparation' as const, label: 'En preparación' },
	{ key: 'ready' as const, label: 'Listo' },
	{ key: 'on_the_way' as const, label: 'En camino' },
];

const props = defineProps<{
	counts: OrderPipelineStatusCounts;
}>();

const columns = COLUMN_DEF;

const maxCount = computed(() =>
	Math.max(
		props.counts.taken,
		props.counts.in_preparation,
		props.counts.ready,
		props.counts.on_the_way,
	),
);

/** Estatus con mayor conteo (empate → el último en orden de flujo para desempate visual). */
const bottleneckKey = computed(() => {
	const m = maxCount.value;
	if (m <= 0) return null;
	for (let i = COLUMN_DEF.length - 1; i >= 0; i--) {
		const k = COLUMN_DEF[i].key;
		if (props.counts[k] === m) return k;
	}
	return null;
});

const bottleneckLabel = computed(() => {
	const k = bottleneckKey.value;
	if (!k) return '';
	return COLUMN_DEF.find((c) => c.key === k)?.label ?? '';
});
</script>
