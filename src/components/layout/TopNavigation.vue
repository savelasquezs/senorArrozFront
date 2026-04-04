<template>
	<header class="bg-white border-b border-gray-200 shadow-sm px-6 py-2 flex items-center justify-between">
		<MobileMenuButton @toggle="$emit('toggleSidebar')" />
		<Breadcrumbs />
		<div class="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
			<BranchSelector v-if="authStore.isSuperadmin" :branch-name="authStore.branchName" />
			<template v-if="canAccessOrders">
				<RouterLink
					to="/orders"
					class="inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
				>
					Pedidos
				</RouterLink>
				<RouterLink
					to="/orders/new"
					title="Nuevo pedido"
					class="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
				>
					<PlusIcon class="w-4 h-4 shrink-0" />
					<span class="whitespace-nowrap">Nuevo pedido</span>
				</RouterLink>
			</template>
			<UserMenu />
		</div>
	</header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { PlusIcon } from '@heroicons/vue/24/outline';
import MobileMenuButton from './MobileMenuButton.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import BranchSelector from './BranchSelector.vue';
import UserMenu from './UserMenu.vue';
import { useAuthStore } from '@/store/auth';

defineEmits<{ toggleSidebar: [] }>();
const authStore = useAuthStore();

const canAccessOrders = computed(
	() => authStore.isSuperadmin || authStore.isAdmin || authStore.isCashier,
);
</script>
