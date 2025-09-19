<!-- src/components/LoginForm.vue -->
<template>
    <BaseCard class="w-full max-w-md mx-auto" padding="lg" shadow="lg">
      <template #header>
        <div class="text-center">
          <div class="mx-auto h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <svg class="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Señor Arroz</h2>
          <p class="mt-2 text-sm text-gray-600">Ingresa a tu cuenta</p>
        </div>
      </template>
  
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div v-if="authStore.error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error de autenticación</h3>
              <p class="mt-1 text-sm text-red-700">{{ authStore.error }}</p>
            </div>
          </div>
        </div>
  
        <BaseInput
          v-model="form.email"
          label="Correo electrónico"
          type="email"
          placeholder="tu-email@ejemplo.com"
          required
          :error="errors.email"
          @blur="validateEmail"
        >
          <template #icon>
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </template>
        </BaseInput>
  
        <BaseInput
          v-model="form.password"
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          required
          :error="errors.password"
          @blur="validatePassword"
        >
          <template #icon>
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </template>
        </BaseInput>
  
        <div class="flex items-center justify-between">
          <label class="flex items-center">
            <input
              v-model="form.rememberMe"
              type="checkbox"
              class="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <span class="ml-2 block text-sm text-gray-900">Recordarme</span>
          </label>

          <router-link to="/forgot-password" class="text-sm text-orange-600 hover:text-orange-500">
            ¿Olvidaste tu contraseña?
          </router-link>
        </div>
  
        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          full-width
          :loading="authStore.isLoading"
          loading-text="Iniciando sesión..."
          :disabled="!isFormValid"
        >
          Iniciar Sesión
        </BaseButton>
      </form>
    </BaseCard>
  </template>
  
  <script setup lang="ts">
  import { reactive, ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/store/auth'
  import BaseCard from '@/components/ui/BaseCard.vue'
  import BaseInput from '@/components/ui/BaseInput.vue'
  import BaseButton from '@/components/ui/BaseButton.vue'
  
  const router = useRouter()
  const authStore = useAuthStore()
  
  const form = reactive({
    email: '',
    password: '',
    rememberMe: false
  })
  
  const errors = ref({
    email: '',
    password: ''
  })
  
  const isFormValid = computed(() => {
    return form.email && form.password && !errors.value.email && !errors.value.password
  })
  
  const validateEmail = () => {
    errors.value.email = ''
    if (!form.email) {
      errors.value.email = 'El correo electrónico es requerido'
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.value.email = 'El correo electrónico no es válido'
    }
  }
  
  const validatePassword = () => {
    errors.value.password = ''
    if (!form.password) {
      errors.value.password = 'La contraseña es requerida'
    } else if (form.password.length < 6) {
      errors.value.password = 'La contraseña debe tener al menos 6 caracteres'
    }
  }
  
  const handleSubmit = async () => {
    // Clear previous errors
    authStore.clearError()
    
    // Validate form
    validateEmail()
    validatePassword()
    
    if (!isFormValid.value) {
      return
    }
  
    try {
      await authStore.login({
        email: form.email,
        password: form.password
      })
      
      // Redirect based on user role
      const redirectPath = getRedirectPath(authStore.userRole)
      await router.push(redirectPath)
    } catch (error) {
      // Error is already handled in the store
      console.error('Login failed:', error)
    }
  }
  
  const getRedirectPath = (role: string | null): string => {
    switch (role) {
      case 'superadmin':
        return '/dashboard/global'
      case 'admin':
        return '/dashboard/branch'
      case 'cashier':
        return '/orders'
      case 'kitchen':
        return '/kitchen'
      case 'deliveryman':
        return '/delivery'
      default:
        return '/dashboard'
    }
  }
  
  onMounted(() => {
    // Clear any existing auth errors
    authStore.clearError()
    
    // Pre-fill form for development
    if (import.meta.env.DEV) {
      form.email = 'santyvano@outlook.com'
      // Don't pre-fill password for security
    }
  })
  </script>