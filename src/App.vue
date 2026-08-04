<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <component
        :is="Component"
        :key="route.path.startsWith('/branches/')
          ? route.fullPath
          : `${route.fullPath}:${branchContext.revision}`"
      />
    </router-view>
    <DialogHost />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import DialogHost from '@/components/ui/DialogHost.vue'

const authStore = useAuthStore()
const branchContext = useBranchContextStore()

onMounted(() => {
  // Initialize authentication state on app load
  authStore.initializeAuth()
})
</script>

<style>
/* Global styles can go here */
</style>
