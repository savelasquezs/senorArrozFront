<template>
    <div :class="sidebarClasses">
        <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <!-- Logo -->
            <div class="flex items-center flex-shrink-0 px-4 mb-8">
                <img v-if="logoUrl" :src="logoUrl" alt="Señor Arroz" class="h-8 w-auto" />
                <div v-else class="flex items-center">
                    <span class="text-2xl mr-2">🍚</span>
                    <span class="text-white font-bold text-lg">Señor Arroz</span>
                </div>
            </div>

            <!-- Navigation -->
            <nav class="mt-5 flex-1 px-2 space-y-1">
                <template v-for="item in navigationItems" :key="item.name">
                    <router-link v-if="hasPermission(item.roles)" :to="item.to" :class="[
                        $route.path === item.to || $route.path.startsWith(item.to + '/')
                            ? 'bg-orange-700 text-white'
                            : 'text-orange-100 hover:bg-orange-600 hover:text-white',
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                    ]" @click="$emit('close')">
                        <component :is="item.icon" class="mr-3 h-5 w-5 flex-shrink-0" />
                        {{ item.name }}
                    </router-link>
                </template>
            </nav>
        </div>

        <!-- User info -->
        <div class="flex-shrink-0 flex border-t border-orange-700 p-4">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-orange-700 flex items-center justify-center">
                        <span class="text-sm font-medium text-white">
                            {{authStore.userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}}
                        </span>
                    </div>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-white">{{ authStore.userName }}</p>
                    <p class="text-xs text-orange-200">{{ authStore.userRole }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth'

// Icons (you can use Heroicons or any icon library)
import {
    HomeIcon,
    ClipboardDocumentListIcon,
    UsersIcon,
    CubeIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    ChartBarIcon,
    CogIcon,
    TruckIcon
} from '@heroicons/vue/24/outline'

interface Props {
    isOpen: boolean
}


defineEmits<{
    close: []
}>()
const props = defineProps<Props>()
const authStore = useAuthStore()

const logoUrl = computed(() => import.meta.env.VITE_LOGO_URL || null)

const sidebarClasses = computed(() => [
    'fixed inset-y-0 left-0 z-50 w-64 bg-orange-600 overflow-y-auto lg:static lg:inset-0',
    'transform transition-transform duration-300 ease-in-out lg:translate-x-0',
    props.isOpen ? 'translate-x-0' : '-translate-x-full'
])

const navigationItems = computed(() => {
    const items = [
        {
            name: 'Dashboard',
            to: '/dashboard',
            icon: HomeIcon,
            roles: ['Superadmin', 'Admin']
        },
        {
            name: 'Pedidos',
            to: '/orders',
            icon: ClipboardDocumentListIcon,
            roles: ['Superadmin', 'Admin', 'Cashier']
        },
        {
            name: 'Cocina',
            to: '/kitchen',
            icon: CogIcon,
            roles: ['Kitchen']
        },
        {
            name: 'Domicilios',
            to: '/delivery',
            icon: TruckIcon,
            roles: ['Deliveryman']
        },
        {
            name: 'Clientes',
            to: '/customers',
            icon: UsersIcon,
            roles: ['Superadmin', 'Admin', 'Cashier']
        },
        {
            name: 'Productos',
            to: '/products',
            icon: CubeIcon,
            roles: ['Superadmin', 'Admin']
        },
        {
            name: 'Gastos',
            to: '/expenses',
            icon: CurrencyDollarIcon,
            roles: ['Superadmin', 'Admin']
        },
        {
            name: 'Usuarios',
            to: '/users',
            icon: UserGroupIcon,
            roles: ['Superadmin', 'Admin']
        },
        {
            name: 'Reportes',
            to: '/reports',
            icon: ChartBarIcon,
            roles: ['Superadmin', 'Admin', 'Cashier']
        },
        {
            name: 'Caja',
            to: '/cash-register',
            icon: CurrencyDollarIcon,
            roles: ['Superadmin', 'Admin', 'Cashier']
        }
    ]

    return items
})

const hasPermission = (roles: string[]): boolean => {
    return roles.includes(authStore.userRole || '')
}
</script>