<!-- src/components/PasswordChangeForm.vue -->
<template>
  <BaseCard class="w-full max-w-md mx-auto" padding="lg" shadow="lg">
    <template #header>
      <div class="text-center">
        <div class="mx-auto h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <svg class="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900">Cambiar Contraseña</h2>
        <p class="mt-2 text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
      </div>
    </template>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div v-if="authStore.error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <p class="mt-1 text-sm text-red-700">{{ authStore.error }}</p>
          </div>
        </div>
      </div>

      <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-md p-4">
        <div class="flex">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">Éxito</h3>
            <p class="mt-1 text-sm text-green-700">{{ successMessage }}</p>
          </div>
        </div>
      </div>

      <BaseInput
        v-model="form.currentPassword"
        label="Contraseña actual"
        type="password"
        placeholder="••••••••"
        required
        :error="errors.currentPassword"
        @blur="validateCurrentPassword"
      >
        <template #icon>
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </template>
      </BaseInput>

      <BaseInput
        v-model="form.newPassword"
        label="Nueva contraseña"
        type="password"
        placeholder="••••••••"
        required
        :error="errors.newPassword"
        @blur="validateNewPassword"
      >
        <template #icon>
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </template>
      </BaseInput>

      <BaseInput
        v-model="form.confirmPassword"
        label="Confirmar nueva contraseña"
        type="password"
        placeholder="••••••••"
        required
        :error="errors.confirmPassword"
        @blur="validateConfirmPassword"
      >
        <template #icon>
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </template>
      </BaseInput>

      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        full-width
        :loading="authStore.isLoading"
        loading-text="Cambiando contraseña..."
        :disabled="!isFormValid"
      >
        Cambiar Contraseña
      </BaseButton>
    </form>
  </BaseCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const successMessage = ref('')

const isFormValid = computed(() => {
  return (
    form.currentPassword && 
    form.newPassword && 
    form.confirmPassword && 
    !errors.value.currentPassword && 
    !errors.value.newPassword && 
    !errors.value.confirmPassword
  )
})

const validateCurrentPassword = () => {
  errors.value.currentPassword = ''
  if (!form.currentPassword) {
    errors.value.currentPassword = 'La contraseña actual es requerida'
  } else if (form.currentPassword.length < 6) {
    errors.value.currentPassword = 'La contraseña debe tener al menos 6 caracteres'
  }
}

const validateNewPassword = () => {
  errors.value.newPassword = ''
  if (!form.newPassword) {
    errors.value.newPassword = 'La nueva contraseña es requerida'
  } else if (form.newPassword.length < 6) {
    errors.value.newPassword = 'La contraseña debe tener al menos 6 caracteres'
  } else if (form.newPassword === form.currentPassword) {
    errors.value.newPassword = 'La nueva contraseña debe ser diferente a la actual'
  }
  
  // Si la confirmación ya fue ingresada, validar que coincidan
  if (form.confirmPassword) {
    validateConfirmPassword()
  }
}

const validateConfirmPassword = () => {
  errors.value.confirmPassword = ''
  if (!form.confirmPassword) {
    errors.value.confirmPassword = 'La confirmación de contraseña es requerida'
  } else if (form.confirmPassword !== form.newPassword) {
    errors.value.confirmPassword = 'Las contraseñas no coinciden'
  }
}

const handleSubmit = async () => {
  // Limpiar mensajes previos
  authStore.clearError()
  successMessage.value = ''
  
  // Validar formulario
  validateCurrentPassword()
  validateNewPassword()
  validateConfirmPassword()
  
  if (!isFormValid.value) {
    return
  }

  try {
    await authStore.changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword
    })
    
    // Mostrar mensaje de éxito
    successMessage.value = 'Contraseña actualizada correctamente'
    
    // Limpiar formulario
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    
    // Esperar un momento para que el usuario vea el mensaje de éxito
    setTimeout(() => {
      // Redirigir al dashboard
      router.push('/dashboard')
    }, 1500)
  } catch (error) {
    // El error ya se maneja en el store
    console.error('Error al cambiar contraseña:', error)
  }
}
</script>