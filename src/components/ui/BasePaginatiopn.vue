<!-- src/components/ui/BasePagination.vue -->
<template>
	<div class="flex items-center justify-between bg-white px-4 py-3 sm:px-6">
		<!-- Mobile version -->
		<div class="flex flex-1 justify-between sm:hidden">
			<button
				@click="goToPrevious"
				:disabled="isFirstPage"
				class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Anterior
			</button>
			<button
				@click="goToNext"
				:disabled="isLastPage"
				class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Siguiente
			</button>
		</div>

		<!-- Desktop version -->
		<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
			<!-- Results info -->
			<div>
				<p class="text-sm text-gray-700">
					Mostrando
					<span class="font-medium">{{ startItem }}</span>
					-
					<span class="font-medium">{{ endItem }}</span>
					de
					<span class="font-medium">{{ total }}</span>
					resultados
				</p>
			</div>

			<!-- Pagination buttons -->
			<div>
				<nav
					class="isolate inline-flex -space-x-px rounded-md shadow-sm"
					aria-label="Paginación"
				>
					<!-- Previous button -->
					<button
						@click="goToPrevious"
						:disabled="isFirstPage"
						class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<ChevronLeftIcon class="h-5 w-5" />
						<span class="sr-only">Anterior</span>
					</button>

					<!-- Page numbers -->
					<template v-for="page in visiblePages" :key="page">
						<button
							v-if="page !== '...'"
							@click="goToPage(page as number)"
							:class="[
								page === currentPage
									? 'relative z-10 inline-flex items-center bg-green-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
									: 'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0',
							]"
						>
							{{ page }}
						</button>
						<span
							v-else
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
						>
							...
						</span>
					</template>

					<!-- Next button -->
					<button
						@click="goToNext"
						:disabled="isLastPage"
						class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<ChevronRightIcon class="h-5 w-5" />
						<span class="sr-only">Siguiente</span>
					</button>
				</nav>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';

interface Props {
	currentPage: number;
	total: number;
	perPage: number;
	maxVisiblePages?: number;
}

const props = withDefaults(defineProps<Props>(), {
	maxVisiblePages: 7,
});

const emit = defineEmits<{
	'update:currentPage': [page: number];
	change: [page: number];
}>();

const totalPages = computed(() => Math.ceil(props.total / props.perPage));

const isFirstPage = computed(() => props.currentPage === 1);
const isLastPage = computed(() => props.currentPage === totalPages.value);

const startItem = computed(() => {
	if (props.total === 0) return 0;
	return (props.currentPage - 1) * props.perPage + 1;
});

const endItem = computed(() => {
	return Math.min(props.currentPage * props.perPage, props.total);
});

const visiblePages = computed(() => {
	const total = totalPages.value;
	const current = props.currentPage;
	const max = props.maxVisiblePages;

	if (total <= max) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}

	const half = Math.floor(max / 2);
	let start = Math.max(current - half, 1);
	let end = Math.min(start + max - 1, total);

	if (end - start < max - 1) {
		start = Math.max(end - max + 1, 1);
	}

	const pages: (number | string)[] = [];

	if (start > 1) {
		pages.push(1);
		if (start > 2) {
			pages.push('...');
		}
	}

	for (let i = start; i <= end; i++) {
		pages.push(i);
	}

	if (end < total) {
		if (end < total - 1) {
			pages.push('...');
		}
		pages.push(total);
	}

	return pages;
});

const goToPage = (page: number) => {
	if (page >= 1 && page <= totalPages.value && page !== props.currentPage) {
		emit('update:currentPage', page);
		emit('change', page);
	}
};

const goToPrevious = () => {
	if (!isFirstPage.value) {
		goToPage(props.currentPage - 1);
	}
};

const goToNext = () => {
	if (!isLastPage.value) {
		goToPage(props.currentPage + 1);
	}
};
</script>
