<!-- src/views/Login.vue -->
<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4 sm:px-6 lg:px-8">
    <BaseLoading
      v-if="authStore.isLoading"
      fullscreen
      size="lg"
      text="Iniciando sesión..."
    />
    <div class="max-w-md w-full space-y-8">
      <div class="text-center mb-8">
        <img
          :src="displayLogoUrl"
          alt="Señor Arroz"
          class="mx-auto h-16 w-auto object-contain"
        />
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
import LoginForm from '@/components/auth/LoginForm.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

const router = useRouter()
const authStore = useAuthStore()

const currentYear = computed(() => new Date().getFullYear())
const displayLogoUrl = computed(
  () => (import.meta.env.VITE_LOGO_URL as string | undefined) || '/favicon.png'
)

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
      return '/dashboard'
    case 'Admin':
      return '/orders/new'
    case 'Cashier':
      return '/orders'
    case 'Kitchen':
      return '/orders' // Temporal: usar orders hasta que se cree kitchen
    case 'Deliveryman':
      return '/orders' // Temporal: usar orders hasta que se cree delivery
    default:
      return '/dashboard'
  }
}
</script>