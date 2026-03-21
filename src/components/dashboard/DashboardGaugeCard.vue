<template>
	<BaseCard :padding="'md'" :shadow="'sm'" class="h-full">
		<div class="text-center">
			<h3 class="text-sm font-semibold text-gray-900 mb-1">{{ title }}</h3>
			<p v-if="description" class="text-[11px] text-gray-500 mb-2">{{ description }}</p>
			<DashboardGaugeDoughnut
				:value-minutes="valueMinutes"
				:scale-max="scaleMax"
				:green-max="greenMax"
				:yellow-max="yellowMax"
				:subtitle="subtitle"
			/>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
import DashboardGaugeDoughnut from './DashboardGaugeDoughnut.vue';

withDefaults(
	defineProps<{
		title: string;
		description?: string;
		valueMinutes: number;
		scaleMax?: number;
		greenMax?: number;
		yellowMax?: number;
		subtitle?: string;
	}>(),
	{ scaleMax: 60, greenMax: 30, yellowMax: 45, description: '', subtitle: '' },
);
</script>
