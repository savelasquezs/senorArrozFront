<template>
	<BaseCard class="overflow-hidden">
		<!-- Main content -->
		<div class="p-5">
			<div class="flex items-center">
				<!-- Icon wrapper -->
				<div class="flex-shrink-0">
					<div
						class="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md"
					>
						<component :is="iconComponent" class="w-5 h-5 text-white" />
					</div>
				</div>

				<!-- Title & value -->
				<div class="ml-5 w-0 flex-1">
					<dl>
						<dt class="text-sm font-medium text-gray-500 truncate">
							{{ title }}
						</dt>
						<dd class="text-2xl font-semibold text-gray-900">
							{{ formattedValue }}
						</dd>
					</dl>
				</div>
			</div>
		</div>

		<!-- Trend footer -->
		<div v-if="trend" class="bg-gray-50 px-5 py-3">
			<div class="text-sm">
				<span :class="trendClasses">
					<component :is="trendIcon" class="w-4 h-4 mr-1" />
					{{ trend }}
				</span>
				<span class="text-gray-500 ml-2">vs mes anterior</span>
			</div>
		</div>
	</BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from './BaseCard.vue';

// ✅ Mantenemos heroicons, ya están en tu proyecto
import {
	CurrencyDollarIcon,
	ClipboardDocumentListIcon,
	UsersIcon,
	BuildingStorefrontIcon,
	ArrowUpIcon,
	ArrowDownIcon,
} from '@heroicons/vue/24/outline';

interface Props {
	title: string;
	value: number | string;
	format?: 'currency' | 'number' | 'percentage';
	icon?: 'currency' | 'clipboard' | 'users' | 'store';
	trend?: string;
	trendDirection?: 'up' | 'down';
}

const props = withDefaults(defineProps<Props>(), {
	format: 'number',
	trendDirection: 'up',
});

const iconComponents = {
	currency: CurrencyDollarIcon,
	clipboard: ClipboardDocumentListIcon,
	users: UsersIcon,
	store: BuildingStorefrontIcon,
};

const iconComponent = computed(() => {
	return props.icon && iconComponents[props.icon]
		? iconComponents[props.icon]
		: ClipboardDocumentListIcon;
});

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

		case 'percentage':
			return `${props.value}%`;

		case 'number':
		default:
			return new Intl.NumberFormat('es-CO').format(props.value);
	}
});

const trendClasses = computed(() => {
	const baseClasses = 'flex items-center text-sm font-medium';

	if (props.trendDirection === 'up') {
		return `${baseClasses} text-emerald-600`;
	} else {
		return `${baseClasses} text-red-600`;
	}
});

const trendIcon = computed(() => {
	return props.trendDirection === 'up' ? ArrowUpIcon : ArrowDownIcon;
});
</script>
