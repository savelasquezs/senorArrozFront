<!-- src/components/layout/MainLayout.vue -->
<template>
	<div class="h-screen bg-gray-50 flex">
		<!-- Sidebar -->
		<Sidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

		<!-- Main content -->
		<div :class="mainContentClasses" class="flex flex-col flex-1 min-w-0">
			<!-- Top navigation -->
			<TopNavigation @toggle-sidebar="sidebarOpen = !sidebarOpen" />

			<!-- Page content -->
			<main class="flex-1 overflow-x-hidden bg-gray-50"
				:class="[{ 'px-6': !noCard }, noCard ? 'overflow-hidden' : 'overflow-y-auto']">
				<div :class="noCard ? 'h-full' : 'max-w-7xl mx-auto h-full flex flex-col'">
					<!-- Page header -->


					<!-- Page content wrapper -->
					<div v-if="!noCard" class="bg-white shadow-sm rounded-2xl p-6 border border-gray-200 flex-1">
						<slot />
					</div>

					<!-- Direct content (sin card) -->
					<slot v-else />
				</div>
			</main>
		</div>

		<!-- Mobile sidebar overlay -->
		<div v-if="sidebarOpen" class="fixed inset-0 z-40 lg:hidden" @click="sidebarOpen = false">
			<div class="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
		</div>

		<!-- Toast Container -->
		<div class="fixed top-4 right-4 z-50 space-y-2 w-80 max-w-full">
			<Toast v-for="toast in toasts" :key="toast.id" :toast="toast" @close="removeToast(toast.id)" />
		</div>

	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopNavigation from '@/components/layout/TopNavigation.vue';
import Toast from '@/components/ui/Toast.vue';
import { useToast } from '@/composables/useToast';

interface Props {
	pageTitle?: string;
	noCard?: boolean; // ✅ Nuevo prop para mostrar contenido sin el card wrapper
}

const props = defineProps<Props>();
const route = useRoute();
const { toasts, removeToast } = useToast();

const sidebarOpen = ref(false);

const mainContentClasses = computed(() => [
	'flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out',
	sidebarOpen.value ? 'ml-64' : 'ml-0'
]);

const pageTitle = computed(() => {
	return props.pageTitle || (route.meta.title as string) || '';
});
</script>
