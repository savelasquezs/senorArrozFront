<template>
  <div id="app">
    <div v-if="recoveryTarget" role="alert" class="fixed inset-x-3 top-3 z-[100] mx-auto max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg">
      <p class="font-medium text-amber-950">No se pudo abrir la pantalla</p>
      <p class="mt-1 text-sm text-amber-900">{{ online ? 'Puede haber una nueva versión. Recarga cuando hayas guardado tus cambios.' : 'Sin conexión. Conservamos esta pantalla; vuelve a intentarlo al recuperar la red.' }}</p>
      <div class="mt-3 flex gap-2">
        <button type="button" :disabled="!online" class="rounded-lg bg-amber-900 px-4 py-2 text-white disabled:opacity-50" @click="retryNavigation">Recargar y abrir</button>
        <button type="button" class="rounded-lg border border-amber-400 px-4 py-2" @click="recoveryTarget = ''">Seguir aquí</button>
      </div>
    </div>
    <router-view v-slot="{ Component, route }">
      <component
        :is="Component"
        :key="route.meta.requiresAuth ? `${authStore.user?.id}:${authStore.userRole}:${branchContext.revision}` : route.path"
      />
    </router-view>
    <DialogHost />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import DialogHost from '@/components/ui/DialogHost.vue'
import { CHUNK_RECOVERY_EVENT } from '@/utils/chunkRecovery'
import { safeReturnPath } from '@/helpers/employeeAccountAccess'

const authStore = useAuthStore()
const branchContext = useBranchContextStore()
const recoveryTarget = ref('')
const online = ref(navigator.onLine)
function offerRecovery(event: Event) {
  recoveryTarget.value = safeReturnPath((event as CustomEvent<{ target: string }>).detail?.target) || window.location.pathname
  online.value = navigator.onLine
}
function updateOnline() { online.value = navigator.onLine }
function retryNavigation() { if (online.value && recoveryTarget.value) window.location.assign(recoveryTarget.value) }

onMounted(() => {
  // Initialize authentication state on app load
  authStore.initializeAuth()
  window.addEventListener(CHUNK_RECOVERY_EVENT, offerRecovery)
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
})
onUnmounted(() => {
  window.removeEventListener(CHUNK_RECOVERY_EVENT, offerRecovery)
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<style>
/* Global styles can go here */
</style>
