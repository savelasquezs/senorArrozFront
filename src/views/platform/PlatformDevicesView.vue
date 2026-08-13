<template><section><header class="mb-8"><p class="text-xs uppercase tracking-[.25em] text-amber-300">Seguridad</p><h2 class="mt-2 text-3xl font-semibold">Dispositivos confiables</h2><p class="mt-2 text-slate-400">Los tokens se almacenan hasheados y expiran a los 30 días.</p></header><article v-for="device in devices" :key="device.publicId" class="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"><div><strong>{{ device.name }}</strong><p class="mt-1 text-xs text-slate-400">{{ device.ipAddress }} · último uso {{ new Date(device.lastUsedAt).toLocaleString() }}</p></div><button class="rounded-xl bg-red-400/10 px-4 py-2 text-sm text-red-200" @click="revoke(device.publicId)">Revocar</button></article></section></template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { platformApi } from '@/services/platformApi'
import type { TrustedDevice } from '@/types/saas'
const devices = ref<TrustedDevice[]>([])
async function load() { devices.value = await platformApi.devices() }
async function revoke(id: string) { await platformApi.revokeDevice(id); await load() }
onMounted(load)
</script>
