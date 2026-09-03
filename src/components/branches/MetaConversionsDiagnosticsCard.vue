<template>
  <BaseCard title="Medición de compras web (Meta CAPI)">
    <BaseLoading v-if="loading" text="Consultando estado de Meta..." />

    <div v-else-if="diagnostics" class="space-y-5">
      <BaseAlert v-if="!diagnostics.configured" type="warning">
        Meta Conversions API todavía no está configurada en el backend. Los pedidos continúan funcionando normalmente, pero no se enviarán compras desde el servidor.
      </BaseAlert>
      <BaseAlert v-else-if="diagnostics.testMode" type="warning">
        Meta CAPI está en modo de prueba. Antes de pautar, elimina <code>META_CAPI_TEST_EVENT_CODE</code> del backend y vuelve a desplegar.
      </BaseAlert>
      <BaseAlert v-else-if="diagnostics.failed > 0" type="error">
        Meta CAPI está configurada, pero existen envíos fallidos. Revisa el último error antes de usar Purchase como señal principal de campaña.
      </BaseAlert>
      <BaseAlert v-else-if="diagnostics.processed === 0" type="info">
        La configuración de Meta CAPI está completa. Falta confirmar el primer Purchase real de servidor antes de considerarla validada en producción.
      </BaseAlert>
      <BaseAlert v-else type="success">
        Meta CAPI está configurada y ya existen compras confirmadas por el servidor en esta ventana.
      </BaseAlert>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-xl border border-gray-200 p-4">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Enviadas</span>
          <strong class="mt-1 block text-2xl text-green-700">{{ diagnostics.processed }}</strong>
        </article>
        <article class="rounded-xl border border-gray-200 p-4">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Pendientes</span>
          <strong class="mt-1 block text-2xl text-amber-700">{{ diagnostics.pending }}</strong>
        </article>
        <article class="rounded-xl border border-gray-200 p-4">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Fallidas</span>
          <strong class="mt-1 block text-2xl" :class="diagnostics.failed ? 'text-red-700' : 'text-gray-900'">{{ diagnostics.failed }}</strong>
        </article>
        <article class="rounded-xl border border-gray-200 p-4">
          <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Omitidas</span>
          <strong class="mt-1 block text-2xl text-gray-700">{{ diagnostics.ignored }}</strong>
          <span class="mt-1 block text-xs text-gray-500">Sin consentimiento o anteriores a la activación</span>
        </article>
      </div>

      <div class="grid gap-4 text-sm lg:grid-cols-2">
        <section class="rounded-xl bg-gray-50 p-4">
          <h3 class="font-semibold text-gray-900">Configuración</h3>
          <dl class="mt-3 space-y-2 text-gray-600">
            <div class="flex justify-between gap-4"><dt>Dataset / Pixel</dt><dd class="font-medium text-gray-900">{{ diagnostics.pixelId || 'No configurado' }}</dd></div>
            <div class="flex justify-between gap-4"><dt>Graph API</dt><dd class="font-medium text-gray-900">{{ diagnostics.graphApiVersion }}</dd></div>
            <div class="flex justify-between gap-4"><dt>Ventana</dt><dd class="font-medium text-gray-900">Últimos {{ diagnostics.windowDays }} días</dd></div>
          </dl>
        </section>

        <section class="rounded-xl bg-gray-50 p-4">
          <h3 class="font-semibold text-gray-900">Actividad reciente</h3>
          <p v-if="diagnostics.latestProcessed" class="mt-3 text-gray-600">
            Último envío: pedido <strong class="text-gray-900">#{{ diagnostics.latestProcessed.orderId }}</strong>
            <span v-if="diagnostics.latestProcessed.metaProcessedAt"> · {{ dateTime(diagnostics.latestProcessed.metaProcessedAt) }}</span>
          </p>
          <p v-else class="mt-3 text-gray-500">Todavía no hay compras enviadas a Meta en esta ventana.</p>

          <BaseAlert v-if="diagnostics.latestFailure" class="mt-3" type="error">
            Pedido #{{ diagnostics.latestFailure.orderId }} · {{ diagnostics.latestFailure.metaLastError || 'Falló el envío a Meta.' }}
            <span v-if="diagnostics.latestFailure.metaNextAttemptAt" class="mt-1 block text-xs">
              Próximo intento: {{ dateTime(diagnostics.latestFailure.metaNextAttemptAt) }}
            </span>
          </BaseAlert>
        </section>
      </div>

      <div class="flex justify-end">
        <BaseButton type="button" variant="outline" :loading="refreshing" @click="load(true)">
          Actualizar estado
        </BaseButton>
      </div>
    </div>

    <BaseAlert v-else type="error">
      {{ errorText || 'No fue posible consultar el estado de Meta CAPI.' }}
      <BaseButton class="mt-3" type="button" variant="outline" :loading="refreshing" @click="load(true)">Reintentar</BaseButton>
    </BaseAlert>
  </BaseCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { integrationApi } from '@/services/MainAPI/integrationApi'
import type { MetaConversionsDiagnostics } from '@/types/integrations'

const loading = ref(true)
const refreshing = ref(false)
const diagnostics = ref<MetaConversionsDiagnostics | null>(null)
const errorText = ref('')

const dateTime = (value: string) => new Date(value).toLocaleString('es-CO')

async function load(manual = false) {
  if (manual) refreshing.value = true
  else loading.value = true
  errorText.value = ''

  try {
    diagnostics.value = (await integrationApi.getMetaConversionsDiagnostics()).data
  } catch (error) {
    diagnostics.value = null
    errorText.value = error instanceof Error ? error.message : 'No fue posible consultar Meta CAPI.'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => void load())
</script>
