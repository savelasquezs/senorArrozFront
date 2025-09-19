<template>
  <BaseCard class="w-full max-w-md mx-auto">
    <template #header>
      <h2 class="text-xl font-bold text-gray-800">Restablecer contraseña</h2>
    </template>
    
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Ingresa tu nueva contraseña para restablecer tu cuenta.
      </p>
      
      <BaseInput
        v-model="form.newPassword"
        label="Nueva contraseña"
        type="password"
        placeholder="Ingresa tu nueva contraseña"
        :error="errors.newPassword"
        @blur="validateNewPassword"
      />
      
      <BaseInput
        v-model="form.confirmPassword"
        label="Confirmar contraseña"
        type="password"
        placeholder="Confirma tu nueva contraseña"
        :error="errors.confirmPassword"
        @blur="validateConfirmPassword"
      />
      
      <div v-if="authStore.error" class="p-3 bg-red-100 text-red-700 rounded-md text-sm">
        {{ authStore.error }}
      </div>
      
      <div v-if="successMessage" class="p-3 bg-green-100 text-green-700 rounded-md text-sm">
        {{ successMessage }}
      </div>
    </div>
    
    <template #footer>
      <BaseButton 
        @click="handleSubmit" 
        :loading="authStore.isLoading"
        :disabled="!isFormValid || authStore.isLoading"
        fullWidth
      >
        Restablecer contraseña
      </BaseButton>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Estado del formulario
const form = reactive({
  token: '',
  email: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = reactive({
  newPassword: '',
  confirmPassword: ''
})

const successMessage = ref('')
const tokenValid = ref(true)

// Obtener token y email de la URL
onMounted(() => {
  const token = route.query.token as string
  const email = route.query.email as string
  
  if (!token || !email) {
    tokenValid.value = false
    authStore.error = 'Enlace de restablecimiento inválido o expirado'
    return
  }
  
  form.token = token
  form.email = email
})

// Validaciones
const validateNewPassword = () => {
  errors.newPassword = ''
  
  if (!form.newPassword) {
    errors.newPassword = 'La nueva contraseña es requerida'
  } else if (form.newPassword.length < 6) {
    errors.newPassword = 'La contraseña debe tener al menos 6 caracteres'
  }
  
  // Si la confirmación ya fue ingresada, validar que coincidan
  if (form.confirmPassword) {
    validateConfirmPassword()
  }
}

const validateConfirmPassword = () => {
  errors.confirmPassword = ''
  
  if (!form.confirmPassword) {
    errors.confirmPassword = 'La confirmación de contraseña es requerida'
  } else if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden'
  }
}

const isFormValid = computed(() => {
  return tokenValid.value && 
         form.token && 
         form.email && 
         form.newPassword && 
         form.confirmPassword && 
         !errors.newPassword && 
         !errors.confirmPassword
})

// Envío del formulario
const handleSubmit = async () => {
  // Limpiar mensajes previos
  authStore.clearError()
  successMessage.value = ''
  
  // Validar formulario
  validateNewPassword()
  validateConfirmPassword()
  
  if (!isFormValid.value) {
    return
  }

  try {
    await authStore.resetPassword({
      token: form.token,
      email: form.email,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword
    })
    
    successMessage.value = 'Contraseña restablecida correctamente'
    
    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error) {
    // El error ya se maneja en el store
  }
}
</script>