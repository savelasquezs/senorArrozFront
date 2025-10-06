<!-- src/views/Login.vue -->
<template>
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Brand logo or image can go here -->
        <div class="text-center mb-8">
          <img 
            v-if="logoUrl" 
            :src="logoUrl" 
            alt="Señor Arroz" 
            class="mx-auto h-16 w-auto"
          />
          <div v-else class="mx-auto h-16 w-16 bg-orange-600 rounded-full flex items-center justify-center mb-4">
            <span class="text-2xl font-bold text-white">🍚</span>
          </div>
          <h1 class="mt-4 text-3xl font-bold text-gray-900">Sistema Señor Arroz</h1>
          <p class="mt-2 text-gray-600">Gestión integral de restaurantes</p>
        </div>
  
        <!-- Login Form -->
        <LoginForm />
  
        <!-- Footer -->
        <div class="text-center">
          <p class="text-sm text-gray-500">
            © {{ currentYear }} Señor Arroz. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/store/auth'
  import LoginForm from '@/components/LoginForm.vue'
  
  const router = useRouter()
  const authStore = useAuthStore()
  
  const currentYear = computed(() => new Date().getFullYear())
  const logoUrl = computed(() => import.meta.env.VITE_LOGO_URL || null)
  
  onMounted(async () => {
    // If user is already authenticated, redirect to dashboard
    if (authStore.isAuthenticated) {
      const redirectPath = getRedirectPath(authStore.userRole)
      await router.replace(redirectPath)
    }
  })
  
  const getRedirectPath = (role: string | null): string => {
    switch (role) {
      case 'Superadmin':
        return '/dashboard/global'
      case 'Admin':
        return '/dashboard/branch'
      case 'Cashier':
        return '/orders'
      case 'Kitchen':
        return '/kitchen'
      case 'Deliveryman':
        return '/delivery'
      default:
        return '/dashboard'
    }
  }
  </script>