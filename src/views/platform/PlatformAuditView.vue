<template><section><header class="mb-8"><p class="text-xs uppercase tracking-[.25em] text-amber-300">Trazabilidad</p><h2 class="mt-2 text-3xl font-semibold">Auditoría</h2></header><div class="overflow-x-auto rounded-2xl border border-white/10 bg-white/5"><table class="w-full min-w-[900px] text-left text-sm"><thead class="bg-white/5 text-slate-400"><tr><th class="p-4">Fecha UTC</th><th class="p-4">Actor</th><th class="p-4">Acción</th><th class="p-4">Entidad</th><th class="p-4">Correlación</th></tr></thead><tbody><tr v-for="row in entries" :key="row.id" class="border-t border-white/10"><td class="p-4">{{ new Date(row.createdAt).toISOString() }}</td><td class="p-4">{{ row.actor }}</td><td class="p-4 text-amber-300">{{ row.action }}</td><td class="p-4">{{ row.entityType }} #{{ row.entityId }}</td><td class="p-4 text-xs text-slate-400">{{ row.correlationId }}</td></tr></tbody></table></div></section></template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { platformApi } from '@/services/platformApi'
import type { AuditEntry } from '@/types/saas'
const entries = ref<AuditEntry[]>([])
onMounted(async () => { entries.value = await platformApi.audit() })
</script>
