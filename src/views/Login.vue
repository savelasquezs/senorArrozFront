<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4 sm:px-6 lg:px-8">
    <BaseLoading v-if="authStore.isLoading" fullscreen size="lg" text="Iniciando sesión..." />
    <div class="max-w-md w-full space-y-8">
      <div class="text-center mb-8"><img :src="displayLogoUrl" alt="Señor Arroz" class="mx-auto h-16 w-auto object-contain" /><h1 class="mt-4 text-3xl font-bold text-gray-900">Sistema Señor Arroz</h1><p class="mt-2 text-gray-600">Gestión integral de restaurantes</p></div>
      <LoginForm />
      <div class="text-center"><a :href="DELIVERY_APP_PLAY_STORE_URL" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Instalar app de domiciliarios en Google Play</a></div>
      <div class="text-center"><p class="text-sm text-gray-500">© {{ currentYear }} Señor Arroz. Todos los derechos reservados.</p></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import LoginForm from '@/components/auth/LoginForm.vue';
import BaseLoading from '@/components/ui/BaseLoading.vue';
import { DELIVERY_APP_PLAY_STORE_URL } from '@/constants/deliveryApp';
const authStore = useAuthStore();
const currentYear = computed(() => new Date().getFullYear());
const displayLogoUrl = computed(() => (import.meta.env.VITE_LOGO_URL as string | undefined) || '/favicon.png');
// El guard del router resuelve una única redirección, incluido el enlace del correo.
</script>
