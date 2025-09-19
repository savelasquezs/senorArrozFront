<template>
  <BaseCard class="w-full max-w-md mx-auto">
    <template #header>
      <h2 class="text-xl font-bold text-gray-800">Recuperar contraseña</h2>
    </template>
    
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      
      <BaseInput
        v-model="email"
        label="Correo electrónico"
        type="email"
        placeholder="correo@ejemplo.com"
        :error="errors.email"
        @blur="validateEmail"
      />
      
      <div v-if="authStore.error" class="p-3 bg-red-100 text-red-700 rounded-md text-sm">
        {{ authStore.error }}
      </div>
      
      <div v-if="successMessage" class="p-3 bg-green-100 text-green-700 rounded-md text-sm">
        {{ successMessage }}
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-between items-center">
        <router-link to="/login" class="text-sm text-blue-600 hover:underline">
          Volver al inicio de sesión
        </router-link>
        
        <BaseButton 
          @click="handleSubmit" 
          :loading="authStore.isLoading"
          :disabled="!isFormValid || authStore.isLoading"
        >
          Enviar enlace
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

// Estado del formulario
const email = ref('')
const errors = ref({
  email: ''
})
const successMessage = ref('')

// Validaciones
const validateEmail = () => {
  errors.value.email = ''
  
  if (!email.value) {
    errors.value.email = 'El correo electrónico es requerido'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = 'Ingresa un correo electrónico válido'
  }
}

const isFormValid = computed(() => {
  return email.value && !errors.value.email
})

// Envío del formulario
const handleSubmit = async () => {
  // Limpiar mensajes previos
  authStore.clearError()
  successMessage.value = ''
  
  // Validar formulario
  validateEmail()
  
  if (!isFormValid.value) {
    return
  }

  try {
    const response = await authStore.forgotPassword(email.value)
    successMessage.value = response.message
    email.value = '' // Limpiar el formulario
  } catch (error) {
    // El error ya se maneja en el store
  }
}
</script>