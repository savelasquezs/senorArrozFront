<template>
	<BaseCard :padding="'md'" :shadow="'sm'" class="h-full overflow-hidden">
		<div class="flex flex-col gap-2 sm:gap-2">
			<div class="flex items-start gap-2 min-w-0">
				<div
					v-if="showIcon"
					class="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm"
					aria-hidden="true"
				>
					<component :is="iconComponent" class="w-3.5 h-3.5 text-white" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-[10px] sm:text-[11px] font-medium text-gray-500 leading-tight truncate">
						{{ title }}
					</p>
					<p
						class="mt-0.5 text-xs sm:text-sm font-bold tracking-tight text-gray-900 tabular-nums leading-snug truncate"
						:title="formattedValue"
					>
						{{ formattedValue }}
					</p>
				</div>
			</div>

			<div v-if="hasAnyComparison" class="pt-1.5 border-t border-gray-100">
				<div
					class="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[9px] sm:text-[10px] min-w-0"
				>
					<div
						v-if="isPresent(weekChangePercent)"
						class="flex flex-1 min-w-0 items-center gap-0.5 sm:gap-1"
					>
						<component
							:is="trendIcon(weekChangePercent)"
							class="w-3 h-3 shrink-0"
							:class="trendColorClass(weekChangePercent)"
						/>
						<span
							class="font-semibold tabular-nums shrink-0"
							:class="trendColorClass(weekChangePercent)"
						>
							{{ formatDelta(weekChangePercent) }}
						</span>
						<span class="text-gray-500 truncate">semana pasada</span>
					</div>
					<div
						v-if="isPresent(yearChangePercent)"
						class="flex flex-1 min-w-0 items-center gap-0.5 sm:gap-1 justify-end"
					>
						<component
							:is="trendIcon(yearChangePercent)"
							class="w-3 h-3 shrink-0"
							:class="trendColorClass(yearChangePercent)"
						/>
						<span
							class="font-semibold tabular-nums shrink-0"
							:class="trendColorClass(yearChangePercent)"
						>
							{{ formatDelta(yearChangePercent) }}
						</span>
						<span class="text-gray-500 truncate">año pasado</span>
					</div>
				</div>
			</div>
			<div v-else class="pt-1.5 border-t border-gray-100 text-[9px] sm:text-[10px] text-gray-400">
				Sin comparación disponible
			</div>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ArrowRightIcon,
	BuildingStorefrontIcon,
	ClipboardDocumentListIcon,
	CurrencyDollarIcon,
	ChartBarIcon,
} from '@heroicons/vue/24/outline';
import type { DashboardKpiIcon } from './kpi.types';

interface Props {
	title: string;
	value: number | string;
	format?: 'currency' | 'number' | 'percent';
	/** % variación vs mismo día la semana anterior */
	weekChangePercent?: number | null;
	/** % variación vs misma fecha el año anterior */
	yearChangePercent?: number | null;
	higherIsBetter?: boolean;
	icon?: DashboardKpiIcon;
}

const props = withDefaults(defineProps<Props>(), {
	format: 'number',
	weekChangePercent: null,
	yearChangePercent: null,
	higherIsBetter: true,
	icon: 'none',
});

const iconMap = {
	currency: CurrencyDollarIcon,
	orders: ClipboardDocumentListIcon,
	chart: ChartBarIcon,
	store: BuildingStorefrontIcon,
	none: ChartBarIcon,
};

const showIcon = computed(() => props.icon !== 'none');
const iconComponent = computed(() => iconMap[props.icon === 'none' ? 'chart' : props.icon]);

function isPresent(v: number | null | undefined): v is number {
	return v != null && !Number.isNaN(v);
}

const hasAnyComparison = computed(
	() => isPresent(props.weekChangePercent) || isPresent(props.yearChangePercent),
);

const formattedValue = computed(() => {
	if (typeof props.value === 'string') return props.value;

	switch (props.format) {
		case 'currency':
			return new Intl.NumberFormat('es-CO', {
				style: 'currency',
				currency: 'COP',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}).format(props.value);
		case 'percent':
			return (
				new Intl.NumberFormat('es-CO', {
					minimumFractionDigits: 1,
					maximumFractionDigits: 1,
				}).format(props.value) + ' %'
			);
		case 'number':
		default:
			return new Intl.NumberFormat('es-CO', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 2,
			}).format(props.value);
	}
});

function formatDelta(d: number) {
	const abs = new Intl.NumberFormat('es-CO', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	}).format(Math.abs(d));
	const sign = d > 0 ? '+' : d < 0 ? '-' : '';
	return `${sign}${abs} %`;
}

/** null = neutro (0), true = mejor, false = peor */
function isImprovement(delta: number): boolean | null {
	if (delta === 0) return null;
	if (props.higherIsBetter) return delta > 0;
	return delta < 0;
}

function trendColorClass(delta: number | null | undefined) {
	if (!isPresent(delta)) return 'text-gray-600';
	const imp = isImprovement(delta);
	if (imp === true) return 'text-emerald-600';
	if (imp === false) return 'text-red-600';
	return 'text-gray-600';
}

function trendIcon(delta: number | null | undefined) {
	if (!isPresent(delta)) return ArrowRightIcon;
	if (delta > 0) return ArrowUpIcon;
	if (delta < 0) return ArrowDownIcon;
	return ArrowRightIcon;
}
</script>
