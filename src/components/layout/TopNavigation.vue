<template>
	<header
		class="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between"
	>
		<MobileMenuButton @toggle="$emit('toggleSidebar')" />
		<Breadcrumbs />
		<div class="flex items-center space-x-4">
			<BranchSelector
				v-if="authStore.isSuperadmin"
				:branch-name="authStore.branchName"
			/>
			<UserMenu />
		</div>
	</header>
</template>

<script setup lang="ts">
import MobileMenuButton from './MobileMenuButton.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import BranchSelector from './BranchSelector.vue';
import UserMenu from './UserMenu.vue';
import { useAuthStore } from '@/store/auth';

defineEmits<{ toggleSidebar: [] }>();
const authStore = useAuthStore();
</script>
