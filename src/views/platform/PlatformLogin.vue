<template>
  <main class="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100">
    <section class="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
      <div class="mb-8"><p class="text-xs uppercase tracking-[.3em] text-amber-300">Administración global</p><h1 class="mt-2 text-3xl font-semibold">Plataforma SaaS</h1><p class="mt-2 text-sm text-slate-400">Identidad independiente de la operación del restaurante.</p></div>
      <form class="space-y-5" @submit.prevent="submit">
        <template v-if="!challengeId">
          <label class="block text-sm">Correo<input v-model.trim="email" type="email" autocomplete="username" required class="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-amber-400" /></label>
          <label class="block text-sm">Contraseña<input v-model="password" type="password" autocomplete="current-password" required class="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-amber-400" /></label>
        </template>
        <template v-else>
          <p class="rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200">Enviamos un código de 6 dígitos. Es válido durante 10 minutos.</p>
          <label class="block text-sm">Código OTP<input v-model.trim="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required class="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-center text-2xl tracking-[.35em] outline-none focus:border-amber-400" /></label>
        </template>
        <p v-if="platform.error || localError" class="text-sm text-red-300">{{ localError || platform.error }}</p>
        <button :disabled="platform.loading" class="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">{{ challengeId ? 'Verificar dispositivo' : 'Continuar' }}</button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { usePlatformStore } from '@/store/platform'
const router = useRouter(); const platform = usePlatformStore(); const email = ref(''); const password = ref(''); const code = ref(''); const challengeId = ref(''); const localError = ref('')
async function submit() { localError.value = ''; try { if (!challengeId.value) { const result = await platform.login(email.value, password.value, navigator.userAgent); if (result.otpRequired) challengeId.value = result.challengeId || ''; else await router.push('/platform/clients') } else { await platform.verifyOtp(challengeId.value, code.value, navigator.userAgent); await router.push('/platform/clients') } } catch (e) { localError.value = e instanceof Error ? e.message : 'No fue posible validar el acceso' } }
</script>
