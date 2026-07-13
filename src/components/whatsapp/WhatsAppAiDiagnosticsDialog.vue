<template>
  <BaseDialog
    :model-value="modelValue"
    title="Actividad de la IA"
    size="2xl"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-4">
      <div class="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-700">
          <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold" :class="realtimeClasses">
            <span class="h-2 w-2 rounded-full" :class="realtimeDotClass" />
            {{ realtimeLabel }}
          </span>
          <span v-if="connectionState !== 'connected'">El estado se sigue actualizando cada 15 segundos.</span>
          <span v-if="connectionError" class="text-red-700">{{ connectionError }}</span>
        </div>
        <BaseButton size="sm" variant="secondary" :loading="loading" @click="$emit('refresh')">
          Actualizar
        </BaseButton>
      </div>

      <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
        {{ error }}
      </div>

      <BaseLoading v-if="loading && !diagnostics" text="Consultando actividad de la IA..." />

      <template v-if="diagnostics">
        <section class="rounded-xl border p-4" :class="diagnosticsToneClasses.surface">
          <div class="flex items-start gap-3">
            <CpuChipIcon class="mt-0.5 h-6 w-6 shrink-0" :class="diagnosticsToneClasses.text" />
            <div class="min-w-0">
              <h3 class="font-semibold" :class="diagnosticsToneClasses.text">{{ diagnostics.title || 'Estado de la IA' }}</h3>
              <p class="mt-1 text-sm" :class="diagnosticsToneClasses.text">{{ diagnostics.summary || 'Sin detalle adicional.' }}</p>
              <p class="mt-1 text-xs font-medium opacity-75" :class="diagnosticsToneClasses.text">
                Sucursal #{{ diagnostics.branchId }}
                <span v-if="diagnostics.conversationId"> · Conversación #{{ diagnostics.conversationId }}</span>
              </p>
            </div>
          </div>
        </section>

        <dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div class="rounded-lg border border-gray-200 p-3">
            <dt class="text-xs font-medium text-gray-500">Agente</dt>
            <dd class="mt-1 font-semibold text-gray-900">{{ diagnostics.isActive ? aiValueLabel(diagnostics.agentStatus) : 'Inactivo' }}</dd>
            <dd class="mt-0.5 text-xs text-gray-500">{{ diagnostics.isVerified ? 'Configuración verificada' : 'Sin verificar' }}</dd>
          </div>
          <div class="rounded-lg border border-gray-200 p-3">
            <dt class="text-xs font-medium text-gray-500">Proveedor / modelo</dt>
            <dd class="mt-1 truncate font-semibold text-gray-900" :title="providerModel">{{ providerModel }}</dd>
          </div>
          <div class="rounded-lg border border-gray-200 p-3">
            <dt class="text-xs font-medium text-gray-500">Atención</dt>
            <dd class="mt-1 font-semibold text-gray-900">{{ attentionLabel }}</dd>
          </div>
          <div class="rounded-lg border border-gray-200 p-3">
            <dt class="text-xs font-medium text-gray-500">Pendientes</dt>
            <dd class="mt-1 text-lg font-semibold text-gray-900">{{ diagnostics.pendingCount }}</dd>
          </div>
          <div class="rounded-lg border border-gray-200 p-3">
            <dt class="text-xs font-medium text-gray-500">Fallidos (24 h)</dt>
            <dd class="mt-1 text-lg font-semibold" :class="diagnostics.failedCountLast24Hours ? 'text-red-700' : 'text-gray-900'">
              {{ diagnostics.failedCountLast24Hours }}
            </dd>
          </div>
          <div class="rounded-lg border border-gray-200 p-3">
            <dt class="text-xs font-medium text-gray-500">Última actividad</dt>
            <dd class="mt-1 font-semibold text-gray-900">{{ formatDate(diagnostics.lastActivityAt) }}</dd>
          </div>
        </dl>

        <section>
          <div class="mb-2 flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-gray-900">Mensajes recientes</h3>
            <span class="text-xs text-gray-500">{{ recentMessages.length }} registros</span>
          </div>

          <div v-if="recentMessages.length" class="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
            <article
              v-for="processing in recentMessages"
              :key="`${processing.conversationId}-${processing.messageId}`"
              class="rounded-lg border p-3"
              :class="processingClasses(processing).surface"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="h-2 w-2 rounded-full" :class="processingClasses(processing).dot" />
                    <p class="text-sm font-semibold" :class="processingClasses(processing).text">
                      {{ processing.title || aiValueLabel(processing.status) }}
                    </p>
                    <span class="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold" :class="processingClasses(processing).text">
                      {{ aiValueLabel(processing.status) }}
                    </span>
                  </div>
                  <p v-if="processing.detail" class="mt-1 whitespace-pre-wrap break-words text-sm" :class="processingClasses(processing).text">
                    {{ processing.detail }}
                  </p>
                </div>
                <time class="shrink-0 text-[11px] text-gray-500">{{ formatDate(processing.statusChangedAt) }}</time>
              </div>

              <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
                <span>Mensaje #{{ processing.messageId }}</span>
                <span v-if="processing.maxAttempts > 0">Intento {{ processing.attempts }}/{{ processing.maxAttempts }}</span>
                <span v-if="processing.httpStatusCode">HTTP {{ processing.httpStatusCode }}</span>
                <span v-if="processing.errorCategory">{{ aiValueLabel(processing.errorCategory) }}</span>
                <span v-if="processing.nextRetryAt">Próximo intento: {{ formatDate(processing.nextRetryAt) }}</span>
              </div>

              <details v-if="processing.technicalDetail" class="mt-2 text-xs text-gray-700">
                <summary class="cursor-pointer font-semibold">Detalle técnico</summary>
                <pre class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-gray-900 p-2 text-[11px] text-gray-100">{{ processing.technicalDetail }}</pre>
              </details>
            </article>
          </div>
          <div v-else class="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            Aún no hay actividad de IA registrada para este alcance.
          </div>
        </section>
      </template>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CpuChipIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import type { WhatsAppAiDiagnostics, WhatsAppAiProcessing } from '@/types/whatsapp'
import {
  aiDiagnosticsTone,
  aiProcessingTone,
  aiToneClasses,
  aiValueLabel,
  sortAiProcessing,
} from '@/utils/whatsappAiDiagnostics'

const props = defineProps<{
  modelValue: boolean
  diagnostics?: WhatsAppAiDiagnostics | null
  loading?: boolean
  error?: string | null
  connectionState?: string
  connectionError?: string | null
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  refresh: []
}>()

const recentMessages = computed(() => sortAiProcessing(props.diagnostics?.recentMessages ?? []))
const diagnosticsToneClasses = computed(() => aiToneClasses[aiDiagnosticsTone(props.diagnostics)])
const providerModel = computed(() => {
  const provider = props.diagnostics?.provider?.trim()
  const model = props.diagnostics?.model?.trim()
  if (provider && model) return `${provider} · ${model}`
  return provider || model || 'No informado'
})
const attentionLabel = computed(() => {
  const labels: Record<string, string> = {
    ai: 'Atendida por IA',
    human: 'Atendida por una persona',
    waitingforhuman: 'Esperando asesor',
    paused: 'IA pausada',
    closed: 'Conversación cerrada',
  }
  const key = String(props.diagnostics?.attentionMode ?? '').replace(/[\s_-]+/g, '').toLowerCase()
  return labels[key] || aiValueLabel(props.diagnostics?.attentionMode) || 'No informado'
})

const realtimeLabel = computed(() => ({
  connected: 'Actualización en vivo',
  connecting: 'Conectando en vivo',
  reconnecting: 'Reconectando en vivo',
  error: 'Falló la conexión en vivo',
  disconnected: 'Sin conexión en vivo',
}[props.connectionState || 'disconnected'] || 'Sin conexión en vivo'))
const realtimeClasses = computed(() => props.connectionState === 'connected'
  ? 'bg-emerald-100 text-emerald-800'
  : props.connectionState === 'connecting' || props.connectionState === 'reconnecting'
    ? 'bg-amber-100 text-amber-900'
    : 'bg-red-100 text-red-800')
const realtimeDotClass = computed(() => props.connectionState === 'connected'
  ? 'bg-emerald-500'
  : props.connectionState === 'connecting' || props.connectionState === 'reconnecting'
    ? 'animate-pulse bg-amber-500'
    : 'bg-red-500')

function processingClasses(processing: WhatsAppAiProcessing) {
  return aiToneClasses[aiProcessingTone(processing)]
}

function formatDate(value?: string | null) {
  if (!value) return 'Sin actividad'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
</script>
