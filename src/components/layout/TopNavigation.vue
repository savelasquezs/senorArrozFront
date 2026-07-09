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
					v-if="canAccessWhatsApp"
					to="/whatsapp"
					title="WhatsApp"
					class="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
				>
					<ChatBubbleLeftRightIcon class="h-4 w-4" />
					<span
						v-if="whatsappStore.unreadTotal > 0"
						class="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white ring-2 ring-white"
					>
						{{ unreadBadgeText }}
					</span>
				</RouterLink>
				<button
					type="button"
					title="Promo del dia"
					class="relative inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors"
					:class="dailyPromotionActive
						? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
						: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'"
					@click="showDailyPromotionModal = true"
				>
					<GiftIcon class="h-4 w-4 shrink-0" />
					<span class="hidden whitespace-nowrap sm:inline">Promo del dia</span>
					<span
						v-if="dailyPromotionActive"
						class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
					/>
				</button>
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
		<DailyPromotionModal
			v-model="showDailyPromotionModal"
			:branch-id="activeBranchId"
			:readonly="!canEditDailyPromotion"
			@saved="reloadDailyPromotion"
		/>
	</header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ChatBubbleLeftRightIcon, GiftIcon, PlusIcon } from '@heroicons/vue/24/outline';
import MobileMenuButton from './MobileMenuButton.vue';
import Breadcrumbs from './Breadcrumbs.vue';
import BranchSelector from './BranchSelector.vue';
import UserMenu from './UserMenu.vue';
import DailyPromotionModal from '@/components/dailyPromotion/DailyPromotionModal.vue';
import { useAuthStore } from '@/store/auth';
import { useWhatsAppStore } from '@/store/whatsapp';
import { useDailyPromotionStore } from '@/store/dailyPromotion';

defineEmits<{ toggleSidebar: [] }>();
const authStore = useAuthStore();
const whatsappStore = useWhatsAppStore();
const dailyPromotionStore = useDailyPromotionStore();
const showDailyPromotionModal = ref(false);

const canAccessOrders = computed(
	() => authStore.isSuperadmin || authStore.isAdmin || authStore.isCashier,
);

const canAccessWhatsApp = computed(() => canAccessOrders.value && whatsappStore.enabled);

const canEditDailyPromotion = computed(() => authStore.isSuperadmin || authStore.isAdmin);

const activeBranchId = computed(() => authStore.branchId);

const dailyPromotionActive = computed(() =>
	dailyPromotionStore.hasActiveForBranch(activeBranchId.value),
);

const unreadBadgeText = computed(() =>
	whatsappStore.unreadTotal > 99 ? '99+' : String(whatsappStore.unreadTotal),
);

async function reloadDailyPromotion() {
	await dailyPromotionStore.loadActive(activeBranchId.value, true);
}

onMounted(() => {
	void reloadDailyPromotion();
});

watch(activeBranchId, () => {
	void reloadDailyPromotion();
});
</script>
