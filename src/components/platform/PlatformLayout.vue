<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 lg:flex">
    <aside class="border-b border-white/10 bg-slate-950/95 p-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div class="mb-8 flex items-center gap-3">
        <div class="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 font-black text-slate-950">SA</div>
        <div><p class="text-xs uppercase tracking-[.25em] text-amber-300">Control SaaS</p><h1 class="font-semibold">Plataforma</h1></div>
      </div>
      <nav class="grid gap-2 sm:grid-cols-5 lg:grid-cols-1">
        <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white" active-class="bg-amber-400 !text-slate-950 font-semibold">{{ item.label }}</RouterLink>
      </nav>
      <div class="mt-8 border-t border-white/10 pt-5 text-sm text-slate-400">
        <p class="truncate text-slate-200">{{ platform.user?.name }}</p><p class="truncate text-xs">{{ platform.user?.email }}</p>
        <button class="mt-4 text-amber-300 hover:text-amber-200" @click="signOut">Cerrar sesión</button>
      </div>
    </aside>
    <main class="min-w-0 flex-1 p-5 lg:p-10"><RouterView /></main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePlatformStore } from '@/store/platform'
const router = useRouter(); const platform = usePlatformStore()
const items = [{ to: '/platform/clients', label: 'Clientes' }, { to: '/platform/plans', label: 'Planes' }, { to: '/platform/settings', label: 'Configuración' }, { to: '/platform/audit', label: 'Auditoría' }, { to: '/platform/devices', label: 'Dispositivos' }]
async function signOut() { await platform.logout(); await router.push('/platform/login') }
</script>
