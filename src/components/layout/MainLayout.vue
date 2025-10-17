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

		<!-- Floating Action Button (FAB) for Quick Order -->
		<button v-if="canTakeOrders && !isOrdersPage" @click="navigateToNewOrder"
			class="fixed bottom-6 right-6 z-40 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
			title="Nuevo Pedido">
			<PlusIcon class="w-6 h-6" />
			<span
				class="absolute right-full mr-3 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
				Nuevo Pedido
			</span>
		</button>

	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types/auth';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopNavigation from '@/components/layout/TopNavigation.vue';
import Toast from '@/components/ui/Toast.vue';
import { PlusIcon } from '@heroicons/vue/24/outline';
import { useToast } from '@/composables/useToast';

interface Props {
	pageTitle?: string;
	noCard?: boolean; // ✅ Nuevo prop para mostrar contenido sin el card wrapper
}

const props = defineProps<Props>();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { toasts, removeToast } = useToast();

const sidebarOpen = ref(false);

const mainContentClasses = computed(() => [
	'flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out',
	sidebarOpen.value ? 'ml-64' : 'ml-0'
]);

const pageTitle = computed(() => {
	return props.pageTitle || (route.meta.title as string) || '';
});

// Check if user can take orders
const canTakeOrders = computed(() => {
	const userRole = authStore.userRole;
	if (!userRole) return false;
	const allowedRoles = [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CASHIER];
	return allowedRoles.some(role => role === userRole);
});

// Check if we're on orders page (don't show FAB there)
const isOrdersPage = computed(() => {
	return route.path.startsWith('/orders');
});

// Navigate to new order
const navigateToNewOrder = () => {
	router.push('/orders/new');
};
</script>
