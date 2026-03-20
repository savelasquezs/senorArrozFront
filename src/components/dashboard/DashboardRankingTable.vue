<template>
	<div class="overflow-x-auto -mx-1">
		<table class="min-w-full text-left text-xs sm:text-sm">
			<thead>
				<tr class="border-b border-gray-200">
					<th
						v-for="col in columns"
						:key="col.key"
						:class="[
							'py-2 pr-3 font-semibold text-gray-700 whitespace-nowrap',
							col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-900' : '',
						]"
						scope="col"
						@click="col.sortable === false ? undefined : toggleSort(col.key)"
					>
						<span class="inline-flex items-center gap-1">
							{{ col.label }}
							<template v-if="col.sortable !== false && sortKey === col.key">
								<ChevronUpIcon v-if="sortDir === 'asc'" class="w-4 h-4 text-emerald-600" />
								<ChevronDownIcon v-else class="w-4 h-4 text-emerald-600" />
							</template>
						</span>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="(row, idx) in sortedRows"
					:key="rowKey(row, idx)"
					class="border-b border-gray-50 hover:bg-gray-50/80"
				>
					<td
						v-for="col in columns"
						:key="col.key"
						class="py-2 pr-3 align-middle"
						:class="numericCol(col) ? 'text-right tabular-nums' : 'text-gray-900'"
					>
						<div v-if="col.miniBar && numericCol(col)" class="flex items-center justify-end gap-2">
							<span>{{ formatCell(row[col.key], col.format) }}</span>
							<DashboardMiniBar :value="Number(row[col.key])" :max="columnMax(col.key)" />
						</div>
						<template v-else>
							{{ formatCell(row[col.key], col.format) }}
						</template>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/20/solid';
import DashboardMiniBar from './DashboardMiniBar.vue';
import type { RankingColumn, RankingColumnFormat } from './DashboardRankingTable.types';

const props = withDefaults(
	defineProps<{
		columns: RankingColumn[];
		rows: Record<string, unknown>[];
		rowIdKey?: string;
		defaultSortKey?: string;
		defaultSortDir?: 'asc' | 'desc';
	}>(),
	{ defaultSortDir: 'desc' },
);

const sortKey = ref(props.defaultSortKey ?? props.columns[0]?.key ?? '');
const sortDir = ref<'asc' | 'desc'>(props.defaultSortDir ?? 'desc');

function rowKey(row: Record<string, unknown>, idx: number) {
	if (props.rowIdKey && row[props.rowIdKey] != null) return String(row[props.rowIdKey]);
	return String(idx);
}

function numericCol(col: RankingColumn) {
	return col.format && col.format !== 'text';
}

const numericMaxes = computed(() => {
	const maxes: Record<string, number> = {};
	for (const col of props.columns) {
		if (!col.miniBar) continue;
		let m = 0;
		for (const row of props.rows) {
			const v = Number(row[col.key]);
			if (!Number.isNaN(v)) m = Math.max(m, v);
		}
		maxes[col.key] = m;
	}
	return maxes;
});

function columnMax(key: string) {
	return numericMaxes.value[key] ?? 0;
}

function toggleSort(key: string) {
	if (sortKey.value === key) {
		sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
	} else {
		sortKey.value = key;
		sortDir.value = 'desc';
	}
}

const sortedRows = computed(() => {
	const key = sortKey.value;
	const dir = sortDir.value;
	const copy = [...props.rows];
	copy.sort((a, b) => {
		const va = a[key];
		const vb = b[key];
		if (typeof va === 'number' && typeof vb === 'number') {
			return dir === 'asc' ? va - vb : vb - va;
		}
		const sa = String(va ?? '');
		const sb = String(vb ?? '');
		return dir === 'asc' ? sa.localeCompare(sb, 'es') : sb.localeCompare(sa, 'es');
	});
	return copy;
});

function formatCell(val: unknown, format?: RankingColumnFormat) {
	if (val == null) return '—';
	switch (format) {
		case 'currency':
			return new Intl.NumberFormat('es-CO', {
				style: 'currency',
				currency: 'COP',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}).format(Number(val));
		case 'number':
			return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(val));
		case 'minutes':
			return `${Number(val)} min`;
		default:
			return String(val);
	}
}
</script>
