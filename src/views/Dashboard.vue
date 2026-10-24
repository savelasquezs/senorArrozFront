<template>
    <MainLayout no-card hide-quick-order>
        <div class="h-full overflow-y-auto p-2">
            <div v-if="authStore.userRole === UserRole.SUPERADMIN && route.query.section !== 'domicilios'" class="mb-5 flex justify-end">
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
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { UserRole } from '@/types/auth'
import MainLayout from '@/components/layout/MainLayout.vue'
import GlobalDashboard from '@/views/dashboard/GlobalDashboard.vue'
import AdminDashboard from '@/views/dashboard/AdminDashboard.vue'

const authStore = useAuthStore()
const route = useRoute()
</script>