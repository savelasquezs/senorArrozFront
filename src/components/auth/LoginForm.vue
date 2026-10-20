<template>
  <BaseCard class="w-full max-w-md mx-auto" padding="lg" shadow="lg">
    <template #header><div class="text-center"><div class="mx-auto h-12 w-12 bg-[#FFF5F0] rounded-full flex items-center justify-center"><UserIcon class="h-6 w-6 text-[#E94E1B]" /></div></div></template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <BaseAlert v-if="authStore.error" type="error" :message="authStore.error" title="Error de autenticación" />
      <BaseInput v-model="form.email" label="Correo electrónico" type="email" placeholder="tu-email@ejemplo.com" required :error="errors.email" @blur="validateEmail"><template #icon><AtSymbolIcon class="h-5 w-5 text-gray-400" /></template></BaseInput>
      <PasswordInput v-model="form.password" label="Contraseña" placeholder="Tu contraseña" required :error="errors.password" @blur="validatePassword" />
      <div class="flex items-center justify-between"><label class="flex items-center"><input v-model="form.rememberMe" type="checkbox" class="h-4 w-4 text-[#E94E1B] focus:ring-[#E94E1B] border-gray-300 rounded" /><span class="ml-2 block text-sm text-gray-900">Recordarme</span></label><RouterLink to="/forgot-password" class="text-sm text-[#E94E1B] hover:text-[#D04417] font-medium transition-colors">¿Olvidaste tu contraseña?</RouterLink></div>
      <BaseButton type="submit" variant="primary" size="lg" full-width :loading="authStore.isLoading" loading-text="Iniciando sesión..." :disabled="!isFormValid || authStore.isLoading" class="bg-[#009639] hover:bg-[#007A30] focus:ring-[#009639]">Iniciar Sesión</BaseButton>
    </form>
  </BaseCard>
</template>
<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/composables/useToast';
import { accountHome, safeReturnPath } from '@/helpers/employeeAccountAccess';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import PasswordInput from '@/components/ui/PasswordInput.vue';
import { UserIcon, AtSymbolIcon } from '@heroicons/vue/24/outline';
const router = useRouter(), route = useRoute(), authStore = useAuthStore();
const { success, error: showError } = useToast();
const form = reactive({ email: '', password: '', rememberMe: false });
const errors = ref({ email: '', password: '' });
const isFormValid = computed(() => form.email && form.password && !errors.value.email && !errors.value.password);
function validateEmail() {
  errors.value.email = !form.email ? 'El correo electrónico es requerido' : /\S+@\S+\.\S+/.test(form.email) ? '' : 'El correo electrónico no es válido';
}
function validatePassword() { errors.value.password = !form.password ? 'La contraseña es requerida' : form.password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : ''; }
async function handleSubmit() {
  if (authStore.isLoading) return;
  authStore.clearError(); validateEmail(); validatePassword();
  if (!isFormValid.value) return;
  const target = safeReturnPath(route.query.redirect);
  try {
    await authStore.login({ email: form.email, password: form.password });
    success('Inicio de sesión exitoso', 3000, `Bienvenido ${authStore.user?.name || ''}`);
    await router.replace(target && router.resolve(target).matched.length ? target : accountHome(authStore.user));
  } catch (error: any) { showError('Error de autenticación', error.message || 'Credenciales incorrectas'); }
  finally { form.password = ''; }
}
onMounted(() => { authStore.clearError(); if (import.meta.env.DEV) form.email = 'santyvano@outlook.com'; });
onBeforeUnmount(() => { form.password = ''; });
</script>
