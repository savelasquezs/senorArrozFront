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
					<div v-if="hasPermission(item.roles, item) && item.children?.length" class="space-y-1">
						<button
							type="button"
							:class="[
								navItemActive(item)
									? 'bg-emerald-600 text-white hover:bg-emerald-700'
									: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
								'group flex w-full items-center px-3 py-2 text-sm font-medium rounded-xl transition-colors gap-3',
							]"
							@click="toggleNavGroup(item.name)"
						>
							<component :is="item.icon" class="h-4 w-4 flex-shrink-0" />
							<span class="text-sm flex-1 text-left">{{ item.name }}</span>
							<ChevronDownIcon v-if="expandedGroups[item.name]" class="h-4 w-4" />
							<ChevronRightIcon v-else class="h-4 w-4" />
						</button>
						<div v-if="expandedGroups[item.name]" class="ml-6 space-y-1">
							<router-link
								v-for="child in visibleChildren(item)"
								:key="child.name"
								:to="child.to"
								:class="[
									navChildActive(child)
										? 'bg-emerald-50 text-emerald-700'
										: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
									'block rounded-lg px-3 py-1.5 text-sm transition-colors',
								]"
								@click="$emit('close')"
							>
								{{ child.name }}
							</router-link>
						</div>
					</div>
					<router-link v-else-if="hasPermission(item.roles, item)" :to="item.to" :class="[
						navItemActive(item)
							? 'bg-emerald-600 text-white hover:bg-emerald-700'
							: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
						'group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-colors gap-3',
					]" @click="$emit('close')">
						<component :is="item.icon" class="h-4 w-4 flex-shrink-0" />
						<span class="text-sm flex-1">{{ item.name }}</span>
						<span
							v-if="item.requiresWhatsApp && whatsappStore.unreadTotal > 0"
							class="min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white"
							title="Conversaciones sin leer"
						>
							{{ unreadBadgeText }}
						</span>
					</router-link>
				</template>
			</nav>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useDeliveryStore } from '@/store/delivery';
import { useWhatsAppStore } from '@/store/whatsapp';
import { integrationApi } from '@/services/MainAPI/integrationApi';
import type { RappiConnection } from '@/types/integrations';
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
	ChatBubbleLeftRightIcon,
	ChevronDownIcon,
	ChevronRightIcon,
} from '@heroicons/vue/24/outline';
import { UserRole } from '@/types/auth';

interface Props {
	isOpen: boolean;
}
const emit = defineEmits<{ close: [] }>();
const props = defineProps<Props>();
const authStore = useAuthStore();
const whatsappStore = useWhatsAppStore();
const route = useRoute();

type NavItem = {
	name: string;
	to: string;
	icon: typeof HomeIcon;
	roles: string[];
	/** Si true, solo activo en ruta exacta (evita marcar "Gastos" en /expenses/menu-attribution). */
	exactPath?: boolean;
	requiresWhatsApp?: boolean;
	children?: NavChild[];
};

type NavChild = {
	name: string;
	to: string;
	section?: string;
	roles?: string[];
};

function visibleChildren(item: NavItem): NavChild[] {
	return (item.children ?? []).filter(child => !child.roles || child.roles.includes(authStore.userRole || ''));
}

function navItemActive(item: NavItem): boolean {
	const p = route.path;
	if (item.children?.length) {
		return p === item.to || p.startsWith(item.to + '/') || item.children.some(navChildActive);
	}
	if (item.exactPath) return p === item.to;
	return p === item.to || p.startsWith(item.to + '/');
}

function navChildActive(child: NavChild): boolean {
	if (route.path !== child.to.split('?')[0]) return false;
	if (!child.section) return !route.query.section;
	return route.query.section === child.section;
}
const deliveryStore = useDeliveryStore();
const router = useRouter();
const expandedGroups = ref<Record<string, boolean>>({});
const rappiConnection = ref<RappiConnection | null>(null);
const rappiPending = ref(0);

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

const currentBranchDetailId = computed(() => {
	const match = route.path.match(/^\/branches\/(\d+)/);
	return match?.[1] ?? null;
});

const branchMenuBase = computed(() => {
	const branchId = currentBranchDetailId.value ?? authStore.user?.branchId;
	return branchId ? `/branches/${branchId}` : '/branches';
});

const branchSectionChildren = computed<NavChild[]>(() => {
	const base = branchMenuBase.value;
	if (base === '/branches') {
		return [{ name: 'Listado', to: '/branches' }];
	}
	return [
		{ name: 'Info general', to: `${base}?section=general`, section: 'general' },
		{ name: 'WhatsApp e IA', to: `${base}?section=whatsapp-ai`, section: 'whatsapp-ai' },
		{ name: 'Bancos y apps', to: `${base}?section=banks-apps`, section: 'banks-apps' },
		{ name: 'Apps', to: `${base}?section=integration-apps`, section: 'integration-apps' },
		{ name: 'Factura electrónica', to: `${base}?section=electronic-invoicing`, section: 'electronic-invoicing' },
		{ name: 'Integraciones de pago', to: `${base}?section=payment-integrations`, section: 'payment-integrations' },
		{ name: 'Gastos', to: `${base}?section=expenses`, section: 'expenses' },
		{ name: 'Fidelizacion', to: `${base}?section=loyalty`, section: 'loyalty' },
		{ name: 'Codigos promo', to: `${base}?section=discount-codes`, section: 'discount-codes' },
		{ name: 'Impresion', to: `${base}?section=printing`, section: 'printing' },
	];
});

function toggleNavGroup(name: string) {
	expandedGroups.value = {
		...expandedGroups.value,
		[name]: !expandedGroups.value[name],
	};
}

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
		children: branchSectionChildren.value,
	},
	{
		name: 'Mi sucursal',
		to: `/branches/${authStore.user?.branchId}`,
		icon: BriefcaseIcon,
		roles: ['Admin'],
		children: branchSectionChildren.value,
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
		roles: ['Superadmin', 'Admin', 'Cashier'],
		children: [
			{ name: 'Operación diaria', to: '/deliverymen', roles: ['Admin', 'Cashier'] },
			{ name: 'Revisión seguimiento', to: '/delivery-incidents', roles: ['Superadmin', 'Admin'] },
			{ name: 'Alertas seguimiento', to: '/delivery-alerts', roles: ['Superadmin', 'Admin'] },
		],
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
		roles: ['Superadmin', 'Admin', 'Cashier'],
		exactPath: true,
	},
	...(rappiConnection.value?.ready ? [{
		name: 'Apps',
		to: '/integrations/apps',
		icon: ShoppingBagIcon,
		roles: ['Superadmin', 'Admin', 'Cashier'],
		children: [{ name: rappiPending.value > 0 ? `Rappi (${rappiPending.value})` : 'Rappi', to: `/integrations/apps/rappi${rappiConnection.value.branchId ? `?branchId=${rappiConnection.value.branchId}` : ''}` }],
	}] : []),
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
		name: 'WhatsApp',
		to: '/whatsapp',
		icon: ChatBubbleLeftRightIcon,
		roles: ['Superadmin', 'Admin', 'Cashier'],
		requiresWhatsApp: true,
		exactPath: true,
	},
	{
		name: 'Movimientos Bancos',
		to: '/bank-transfers',
		icon: ArrowsRightLeftIcon,
		roles: ['Superadmin', 'Admin'],
	},
]);

const hasPermission = (roles: string[], item?: NavItem): boolean => {
	if (!roles.includes(authStore.userRole || '')) return false;
	if (item?.requiresWhatsApp) return whatsappStore.enabled;
	return true;
};

const unreadBadgeText = computed(() =>
	whatsappStore.unreadTotal > 99 ? '99+' : String(whatsappStore.unreadTotal),
);

function loadWhatsAppStatus() {
	if (!authStore.isAuthenticated) return;
	const role = authStore.userRole;
	if (!role || !['Superadmin', 'Admin', 'Cashier'].includes(role)) return;
	void whatsappStore.ensureStatus();
}

async function loadIntegrationStatus() {
	if (!authStore.isAuthenticated || !['Superadmin', 'Admin', 'Cashier'].includes(authStore.userRole || '')) return;
	const routeBranch = currentBranchDetailId.value ? Number(currentBranchDetailId.value) : null;
	const branchId = authStore.isSuperadmin ? routeBranch : authStore.user?.branchId;
	if (!branchId) { rappiConnection.value = null; return; }
	try { const result = await integrationApi.getOperationalStatus(branchId); rappiConnection.value = result.data.rappi ?? null; rappiPending.value = result.data.pending; }
	catch { rappiConnection.value = null; rappiPending.value = 0; }
}

onMounted(() => { loadWhatsAppStatus(); void loadIntegrationStatus(); });

watch(() => authStore.isAuthenticated, loadWhatsAppStatus);
watch(() => [authStore.isAuthenticated, route.path, route.query.section], () => void loadIntegrationStatus());

watch(
	() => route.path,
	(path) => {
		if (path.startsWith('/branches')) {
			expandedGroups.value = {
				...expandedGroups.value,
				Sucursales: true,
				'Mi sucursal': true,
			};
		}
		if (path === '/deliverymen' || path.startsWith('/delivery-incidents') || path.startsWith('/delivery-alerts')) {
			expandedGroups.value = {
				...expandedGroups.value,
				'Gestión Domiciliarios': true,
			};
		}
	},
	{ immediate: true },
);
</script>
