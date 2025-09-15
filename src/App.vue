<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()

onMounted(() => {
  // Initialize authentication state on app load
  authStore.initializeAuth()
})
</script>

<style>
/* Global styles can go here */
</style>