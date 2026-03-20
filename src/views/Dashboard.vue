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