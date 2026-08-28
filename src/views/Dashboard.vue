<template>
    <MainLayout>
        <template #header>
            <div class="md:flex md:items-center md:justify-between">
                <div class="flex-1 min-w-0">
                    <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Dashboard
                    </h2>
                    <p class="mt-1 text-sm text-gray-500">
                        Bienvenido, {{ authStore.userName }}
                    </p>
                </div>
            </div>
        </template>

        <div v-if="authStore.userRole === UserRole.SUPERADMIN" class="mb-5 flex justify-end">
            <router-link
                to="/blog-seo"
                class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
                Blog / SEO
                <span aria-hidden="true">→</span>
            </router-link>
        </div>

        <GlobalDashboard v-if="authStore.userRole === UserRole.SUPERADMIN" />
        <AdminDashboard v-else-if="authStore.userRole === UserRole.ADMIN" />
        <div v-else class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
            Tu rol no tiene acceso a esta sección.
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth'
import { UserRole } from '@/types/auth'
import MainLayout from '@/components/layout/MainLayout.vue'
import GlobalDashboard from '@/views/dashboard/GlobalDashboard.vue'
import AdminDashboard from '@/views/dashboard/AdminDashboard.vue'

const authStore = useAuthStore()
</script>