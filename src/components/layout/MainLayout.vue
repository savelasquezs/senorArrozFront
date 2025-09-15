<template>
    <div class="min-h-screen bg-gray-50 flex">
        <!-- Sidebar -->
        <Sidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

        <!-- Main content -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Top navigation -->
            <TopNavigation @toggle-sidebar="sidebarOpen = !sidebarOpen" />

            <!-- Page content -->
            <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-6 py-8">
                <div class="max-w-7xl mx-auto">
                    <!-- Page header -->
                    <div v-if="pageTitle || $slots.header" class="mb-8">
                        <slot name="header">
                            <div class="md:flex md:items-center md:justify-between">
                                <div class="flex-1 min-w-0">
                                    <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                                        {{ pageTitle }}
                                    </h2>
                                </div>
                                <div v-if="$slots.actions" class="mt-4 flex md:mt-0 md:ml-4">
                                    <slot name="actions" />
                                </div>
                            </div>
                        </slot>
                    </div>

                    <!-- Page content -->
                    <slot />
                </div>
            </main>
        </div>

        <!-- Mobile sidebar overlay -->
        <div v-if="sidebarOpen" class="fixed inset-0 z-40 lg:hidden" @click="sidebarOpen = false">
            <div class="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopNavigation from '@/components/layout/TopNavigation.vue'

interface Props {
    pageTitle?: string
}

const props = defineProps<Props>()
const route = useRoute()

const sidebarOpen = ref(false)

const pageTitle = computed(() => {
    return props.pageTitle || (route.meta.title as string) || ''
})
</script>