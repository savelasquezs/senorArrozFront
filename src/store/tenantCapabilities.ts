import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { tenantContextApi } from '@/services/platformApi'
import type { TenantContext } from '@/types/saas'

export const useTenantCapabilitiesStore = defineStore('tenantCapabilities', () => {
  const context = ref<TenantContext | null>(null)
  const loading = ref(false)
  const modules = computed(() => new Set(context.value?.modules ?? []))
  const addons = computed(() => new Set(context.value?.addons ?? []))
  async function initialize(force = false) { if (context.value && !force) return; loading.value = true; try { context.value = await tenantContextApi.get() } finally { loading.value = false } }
  function hasModule(code?: string) { return !code || modules.value.has(code) }
  function hasAddon(code?: string) { return !code || addons.value.has(code) }
  function reset() { context.value = null }
  return { context, loading, modules, addons, initialize, hasModule, hasAddon, reset }
})
