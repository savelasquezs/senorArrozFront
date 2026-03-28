<template>
	<div :class="sidebarClasses">
		<div class="flex flex-col h-full">
			<div class="p-4">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
						<component :is="roleIcon" class="h-5 w-5 text-emerald-700" />
					</div>
					<div>
						<h2 class="text-lg text-emerald-600">{{ authStore.userName }}</h2>
						<p class="text-sm text-gray-500 capitalize">
							{{ authStore.userRole }}
						</p>
					</div>
				</div>

				<!-- Domiciliario: sucursal + historial (mobile-first) -->
				<div v-if="authStore.isDeliveryman" class="space-y-3 mb-4">
					<DeliverymanBranchSidebarBlock />
					<button
						type="button"
						class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
						@click="onDeliverymanMiHistorial"
					>
						<ClipboardDocumentListIcon class="w-4 h-4 shrink-0" />
						Mi historial
						<span
							v-if="deliveryStore.historyBadgeCount > 0"
							class="py-0.5 px-1.5 rounded-full text-xs bg-blue-200 text-blue-800"
						>
							{{ deliveryStore.historyBadgeCount }}
						</span>
					</button>
				</div>

				<!-- Datos adicionales del usuario (no duplicar sucursal del domiciliario) -->
				<div v-else class="text-sm mb-4">
					<p v-if="authStore.branchName" class="text-xs text-gray-500">
						{{ authStore.branchName }}
					</p>
				</div>

				<hr class="mb-4 border-gray-200" />
			</div>

			<!-- Navigation -->
			<nav class="flex-1 px-2 space-y-1">
				<template v-for="item in navigationItems" :key="item.name">
					<router-link v-if="hasPermission(item.roles)" :to="item.to" :class="[
						navItemActive(item)
							? 'bg-emerald-600 text-white hover:bg-emerald-700'
							: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
						'group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-colors gap-3',
					]" @click="$emit('close')">
						<component :is="item.icon" class="h-4 w-4 flex-shrink-0" />
						<span class="text-sm">{{ item.name }}</span>
					</router-link>
				</template>
			</nav>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useDeliveryStore } from '@/store/delivery';
import DeliverymanBranchSidebarBlock from '@/components/delivery/DeliverymanBranchSidebarBlock.vue';
import {
	HomeIcon,
	UsersIcon,
	CubeIcon,
	CurrencyDollarIcon,
	CogIcon,
	TruckIcon,
	UserIcon,
	ShieldCheckIcon,
	BriefcaseIcon,
	ShoppingBagIcon,
	BanknotesIcon,
	ArrowsRightLeftIcon,
	ClipboardDocumentListIcon,
} from '@heroicons/vue/24/outline';
import { UserRole } from '@/types/auth';

interface Props {
	isOpen: boolean;
}
const emit = defineEmits<{ close: [] }>();
const props = defineProps<Props>();
const authStore = useAuthStore();
const route = useRoute();

type NavItem = {
	name: string;
	to: string;
	icon: typeof HomeIcon;
	roles: string[];
	/** Si true, solo activo en ruta exacta (evita marcar "Gastos" en /expenses/menu-attribution). */
	exactPath?: boolean;
};

function navItemActive(item: NavItem): boolean {
	const p = route.path;
	if (item.exactPath) return p === item.to;
	return p === item.to || p.startsWith(item.to + '/');
}
const deliveryStore = useDeliveryStore();
const router = useRouter();

async function onDeliverymanMiHistorial() {
	emit('close');
	if (router.currentRoute.value.path !== '/delivery') {
		await router.push('/delivery');
		await nextTick();
	}
	deliveryStore.requestHistoryModalFromSidebar();
}

const sidebarClasses = computed(() => [
	'fixed inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r shadow-lg overflow-y-auto',
	'transform transition-transform duration-300 ease-in-out',
	props.isOpen ? 'translate-x-0' : '-translate-x-full',
]);

// Ícono dinámico según el rol
const roleIcon = computed(() => {
	switch (authStore.userRole) {
		case UserRole.SUPERADMIN:
			return ShieldCheckIcon;
		case UserRole.ADMIN:
			return BriefcaseIcon;
		case UserRole.CASHIER:
			return CurrencyDollarIcon;
		case UserRole.KITCHEN:
			return CogIcon;
		case UserRole.DELIVERYMAN:
			return TruckIcon;
		default:
			return UserIcon;
	}
});

const navigationItems = computed((): NavItem[] => [
	{
		name: 'Dashboard',
		to: '/dashboard',
		icon: HomeIcon,
		roles: ['Superadmin', 'Admin'],
	},
	{
		name: 'Sucursales',
		to: '/branches',
		icon: BriefcaseIcon,
		roles: ['Superadmin'],
	},
	{
		name: 'Mi sucursal',
		to: `/branches/${authStore.user?.branchId}`,
		icon: BriefcaseIcon,
		roles: ['Admin'],
	},
	{
		name: 'Pedidos',
		to: '/orders',
		icon: ShoppingBagIcon,
		roles: ['Superadmin', 'Admin', 'Cashier'],
	},
	{ name: 'Cocina', to: '/kitchen', icon: CogIcon, roles: ['Kitchen'] },
	{
		name: 'Domicilios',
		to: '/delivery',
		icon: TruckIcon,
		roles: ['Deliveryman'],
	},
	{
		name: 'Gestión Domiciliarios',
		to: '/deliverymen',
		icon: TruckIcon,
		roles: ['Admin', 'Cashier'],
	},
	{
		name: 'Clientes',
		to: '/customers',
		icon: UsersIcon,
		roles: ['Superadmin', 'Admin', 'Cashier'],
	},
	{
		name: 'Productos',
		to: '/products',
		icon: CubeIcon,
		roles: ['Superadmin', 'Admin'],
	},
	{
		name: 'Gastos',
		to: '/expenses',
		icon: CurrencyDollarIcon,
		roles: ['Superadmin', 'Admin'],
		exactPath: true,
	},
	{
		name: 'Imputación menú',
		to: '/expenses/menu-attribution',
		icon: CurrencyDollarIcon,
		roles: ['Superadmin', 'Admin'],
	},
	{
		name: 'Cuadre de Caja',
		to: '/cash-register',
		icon: BanknotesIcon,
		roles: ['Superadmin', 'Admin', 'Cashier'],
	},
	{
		name: 'Movimientos Bancos',
		to: '/bank-transfers',
		icon: ArrowsRightLeftIcon,
		roles: ['Superadmin', 'Admin'],
	},
]);

const hasPermission = (roles: string[]): boolean =>
	roles.includes(authStore.userRole || '');
</script>
