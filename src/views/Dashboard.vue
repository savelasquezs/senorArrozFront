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

        <router-view />
    </MainLayout>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth'
import MainLayout from '@/components/layout/MainLayout.vue'

const authStore = useAuthStore()
</script>