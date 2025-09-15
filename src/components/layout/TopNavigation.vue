<template>
    <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
            <!-- Mobile menu button -->
            <button type="button"
                class="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
                @click="$emit('toggleSidebar')">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <!-- Breadcrumb -->
            <nav class="hidden lg:flex" aria-label="Breadcrumb">
                <ol class="flex items-center space-x-4">
                    <li v-for="(breadcrumb, index) in breadcrumbs" :key="breadcrumb.name">
                        <div class="flex items-center">
                            <svg v-if="index > 0" class="flex-shrink-0 h-5 w-5 text-gray-300 mr-4" fill="currentColor"
                                viewBox="0 0 20 20">
                                <path fill-rule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clip-rule="evenodd" />
                            </svg>
                            <router-link :to="breadcrumb.to" :class="[
                                index === breadcrumbs.length - 1
                                    ? 'text-gray-500'
                                    : 'text-gray-700 hover:text-gray-900',
                                'text-sm font-medium'
                            ]">
                                {{ breadcrumb.name }}
                            </router-link>
                        </div>
                    </li>
                </ol>
            </nav>

            <!-- Right side -->
            <div class="flex items-center space-x-4">
                <!-- Branch selector (for superadmin) -->
                <div v-if="authStore.isSuperadmin" class="hidden lg:block">
                    <select class="text-sm border-gray-300 rounded-md">
                        <option>{{ authStore.branchName }}</option>
                        <!-- Add other branches here -->
                    </select>
                </div>

                <!-- User menu -->
                <div class="relative" ref="userMenuRef">
                    <button type="button"
                        class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        @click="userMenuOpen = !userMenuOpen">
                        <div class="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center">
                            <span class="text-sm font-medium text-white">
                                {{authStore.userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}}
                            </span>
                        </div>
                        <span class="ml-2 text-sm font-medium text-gray-700">{{ authStore.userName }}</span>
                        <svg class="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <!-- User dropdown -->
                    <div v-if="userMenuOpen"
                        class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div class="py-1">
                            <router-link to="/profile"
                                class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                @click="userMenuOpen = false">
                                <svg class="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Mi perfil
                            </router-link>
                            <button @click="handleLogout"
                                class="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <svg class="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

defineEmits<{
    toggleSidebar: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement>()

const breadcrumbs = computed(() => {
    const pathSegments = route.path.split('/').filter(Boolean)
    const crumbs = []

    let currentPath = ''
    for (const segment of pathSegments) {
        currentPath += `/${segment}`
        // You can customize breadcrumb names here
        const name = segment.charAt(0).toUpperCase() + segment.slice(1)
        crumbs.push({ name, to: currentPath })
    }

    return crumbs
})

const handleLogout = async () => {
    try {
        await authStore.logout()
        await router.push('/login')
    } catch (error) {
        console.error('Logout error:', error)
    }
}

// Close user menu when clicking outside
const handleClickOutside = (event: Event) => {
    if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
        userMenuOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>