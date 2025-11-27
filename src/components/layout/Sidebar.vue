<template>
	<div :class="sidebarClasses">
		<div class="flex flex-col h-full">
			<div class="p-4">
				<div class="flex items-center gap-3 mb-6">
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

				<!-- Datos adicionales del usuario -->
				<div class="text-sm mb-4">
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
						$route.path === item.to || $route.path.startsWith(item.to + '/')
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
import { computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import {
	HomeIcon,
	UsersIcon,
	CubeIcon,
	CurrencyDollarIcon,
	UserGroupIcon,
	ChartBarIcon,
	CogIcon,
	TruckIcon,
	UserIcon,
	ShieldCheckIcon,
	BriefcaseIcon,
	ShoppingBagIcon,
} from '@heroicons/vue/24/outline';
import { UserRole } from '@/types/auth';

interface Props {
	isOpen: boolean;
}
defineEmits<{ close: [] }>();
const props = defineProps<Props>();
const authStore = useAuthStore();

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

const navigationItems = computed(() => [
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
	},
	{
		name: 'Usuarios',
		to: '/users',
		icon: UserGroupIcon,
		roles: ['Superadmin', 'Admin'],
	},
	{
		name: 'Reportes',
		to: '/reports',
		icon: ChartBarIcon,
		roles: ['Superadmin', 'Admin', 'Cashier'],
	},
	{
		name: 'Caja',
		to: '/cash-register',
		icon: CurrencyDollarIcon,
		roles: ['Superadmin', 'Admin', 'Cashier'],
	},
]);

const hasPermission = (roles: string[]): boolean =>
	roles.includes(authStore.userRole || '');
</script>
