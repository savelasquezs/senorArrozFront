<template>
	<nav class="hidden lg:flex" aria-label="Breadcrumb">
		<ol class="flex items-center space-x-3">
			<li v-for="(breadcrumb, index) in breadcrumbs" :key="breadcrumb.name">
				<div class="flex items-center">
					<svg
						v-if="index > 0"
						class="flex-shrink-0 h-4 w-4 text-gray-300 mr-3"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
					<router-link
						:to="breadcrumb.to"
						:class="[
							index === breadcrumbs.length - 1
								? 'text-gray-500'
								: 'text-gray-700 hover:text-emerald-600',
							'text-sm font-medium',
						]"
					>
						{{ breadcrumb.name }}
					</router-link>
				</div>
			</li>
		</ol>
	</nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const breadcrumbs = computed(() => {
	const pathSegments = route.path.split('/').filter(Boolean);
	let currentPath = '';
	return pathSegments.map((segment) => {
		currentPath += `/${segment}`;
		return {
			name: segment.charAt(0).toUpperCase() + segment.slice(1),
			to: currentPath,
		};
	});
});
</script>
