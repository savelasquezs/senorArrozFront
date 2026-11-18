<template>
  <section class="rounded-lg border border-emerald-200 bg-emerald-50 p-4" aria-label="WhatsApp Coexistence">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 class="font-semibold text-gray-900">WhatsApp Business y sistema</h4>
        <p class="text-sm text-gray-700">{{ labels[status?.state ?? 'pending'] }}<span v-if="status?.displayPhoneNumber"> · {{ status.displayPhoneNumber }}</span></p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button v-if="status?.enabled" type="button" class="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50" :disabled="busy" @click="check">Comprobar línea</button>
        <button v-if="status?.pilotRecoveryAvailable" type="button" class="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50" :disabled="busy" @click="recoverPilot">Recuperar conexión de Santander</button>
        <button v-if="authorizing" type="button" class="rounded border bg-white px-3 py-2 text-sm" @click="cancelSignup">Cancelar intento</button>
        <button type="button" class="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50" :disabled="!ready || busy" @click="connect">{{ connectLabel }}</button>
      </div>
    </div>
    <label v-if="status?.configured" class="mt-3 block text-sm font-medium text-gray-700">Número que vas a conectar
      <input v-model="linePhone" type="tel" autocomplete="tel" placeholder="+57 300 123 4567" :disabled="busy" class="mt-1 w-full rounded border bg-white p-2" />
      <span class="mt-1 block text-xs font-normal">Incluye el código de país y selecciona este mismo número en Meta.</span>
    </label>
    <p v-if="status && !status.configured" class="mt-2 text-sm">La conexión guiada requiere configurar la aplicación de Meta en el servidor.</p>
    <p v-else class="mt-2 text-sm text-gray-700">Conserva la app Business en el celular. Meta verifica la elegibilidad del número durante la conexión.</p>
    <p v-if="authorizing" role="status" class="mt-2 text-sm text-gray-700">Continúa en la ventana de Meta. Si no se abrió, cancela el intento y vuelve a conectar.</p>
    <p v-if="status?.enabled" class="mt-2 text-xs text-gray-600">Historial: {{ syncLabel(status.historyStatus) }} · Contactos: {{ syncLabel(status.contactsStatus) }}</p>
    <div v-if="status?.enabled && status.pilotCallbackAvailable" class="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" class="rounded border bg-white px-3 py-2 text-sm" :disabled="busy" @click="setPilotCallback(true)">Activar webhook local</button>
      <button type="button" class="rounded border bg-white px-3 py-2 text-sm" :disabled="busy" @click="setPilotCallback(false)">Restaurar webhook de Santander</button>
      <span v-if="callbackActive !== null" role="status" class="text-sm">{{ callbackActive ? 'Webhook local activo' : 'Webhook alterno retirado' }}</span>
    </div>
    <p v-if="status?.state === 'syncing'" class="mt-2 text-sm">Mantén abierta la app Business mientras se sincroniza. Los mensajes importados no activan respuestas automáticas.</p>
    <p v-if="error || status?.error" role="alert" class="mt-2 text-sm text-red-700">{{ error || status?.error }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWhatsAppCoexistence } from '@/composables/useWhatsAppCoexistence'
const props = defineProps<{ branchId: number }>()
const { status, error, busy, ready, preparing, authorizing, linePhone, prepare, connect, cancelSignup, check, recoverPilot, callbackActive, setPilotCallback } = useWhatsAppCoexistence(props.branchId)
const connectLabel = computed(() => {
  if (authorizing.value) return 'Continúa en Meta'
  if (busy.value) return 'Conectando…'
  if (status.value?.configured && preparing.value && !error.value) return 'Cargando Meta…'
  return status.value?.enabled ? 'Reconectar con Meta' : 'Conectar con Meta'
})
const labels = { pending: 'Pendiente de conexión', connected: 'Conectada en coexistencia', syncing: 'Sincronizando', degraded: 'Requiere revisión', disconnected: 'Desconectada' }
const syncLabels: Record<string, string> = { not_started: 'Pendiente', requesting: 'Solicitando', requested: 'Solicitada', receiving: 'Recibiendo', received: 'Recibidos', completed: 'Completo', declined: 'No compartido', skipped: 'Omitida', failed: 'Requiere revisión' }
const syncLabel = (state: string) => syncLabels[state] ?? state
onMounted(prepare)
</script>
