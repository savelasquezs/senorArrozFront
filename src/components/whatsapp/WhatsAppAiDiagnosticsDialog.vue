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

        <section class="rounded-xl border border-gray-200 p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-gray-900">Uso y costo de IA</h3>
            <BaseButton size="sm" variant="secondary" :loading="usageLoading" @click="loadUsage">Aplicar filtros</BaseButton>
          </div>
          <div class="mb-3 grid gap-2 sm:grid-cols-4">
            <input v-model="usageFilters.from" type="date" aria-label="Fecha desde" class="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            <input v-model="usageFilters.to" type="date" aria-label="Fecha hasta" class="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            <input v-model.trim="usageFilters.provider" placeholder="Proveedor" aria-label="Proveedor" class="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            <input v-model.trim="usageFilters.model" placeholder="Modelo" aria-label="Modelo" class="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div v-if="usageError" role="alert" class="rounded-md bg-red-50 p-2 text-sm text-red-700">{{ usageError }}</div>
          <BaseLoading v-else-if="usageLoading && !usage" text="Consultando uso de IA..." />
          <template v-else-if="usage">
            <div v-if="usage.unpricedInvocations" class="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">Costo no disponible para {{ usage.unpricedInvocations }} invocación(es) sin precio configurado.</div>
            <dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div v-for="item in usageCards" :key="item.label" class="rounded-lg bg-gray-50 p-3"><dt class="text-xs text-gray-500">{{ item.label }}</dt><dd class="mt-1 font-semibold text-gray-900">{{ item.value }}</dd></div>
            </dl>
            <p class="mt-2 text-xs text-gray-500">La salida facturable normalmente coincide con la salida en OpenAI; en Gemini incluye la salida visible más los tokens de pensamiento.</p>
            <div class="mt-3 overflow-x-auto"><table class="min-w-full text-left text-xs"><thead><tr class="border-b"><th class="p-2">Proveedor / modelo</th><th class="p-2">Invocaciones</th><th class="p-2">Mensajes</th><th class="p-2">Tokens entrada</th><th class="p-2">Tokens salida</th><th class="p-2">Salida facturable</th><th class="p-2">Costo USD</th></tr></thead><tbody><tr v-for="row in usage.breakdown" :key="`${row.provider}-${row.model}`" class="border-b"><td class="p-2">{{ row.provider }} · {{ row.model }}</td><td class="p-2">{{ number(row.invocations) }}</td><td class="p-2">{{ number(row.messagesProcessed) }}</td><td class="p-2">{{ number(row.inputTokens) }}</td><td class="p-2">{{ number(row.outputTokens) }}</td><td class="p-2">{{ number(row.billableOutputTokens) }}</td><td class="p-2">{{ money(row.estimatedCostUsd) }}<span v-if="row.unpricedInvocations" class="ml-1 text-amber-700">*</span></td></tr></tbody></table></div>
            <div v-if="!usage.totalInvocations" class="mt-3 rounded-lg border border-dashed p-5 text-center text-sm text-gray-500">No hay registros de uso para este rango.</div>
            <div v-else class="mt-3 overflow-x-auto"><h4 class="mb-2 text-xs font-semibold text-gray-700">Uso diario (hora Colombia)</h4><table class="min-w-full text-left text-xs"><thead><tr class="border-b"><th class="p-2">Fecha</th><th class="p-2">Invocaciones</th><th class="p-2">Entrada</th><th class="p-2">Caché</th><th class="p-2">Salida</th><th class="p-2">Pensamiento</th><th class="p-2">Salida facturable</th><th class="p-2">Costo</th></tr></thead><tbody><tr v-for="day in usage.daily" :key="day.date" class="border-b"><td class="p-2">{{ day.date.slice(0,10) }}</td><td class="p-2">{{ number(day.invocations) }}</td><td class="p-2">{{ number(day.inputTokens) }}</td><td class="p-2">{{ number(day.cachedInputTokens) }}</td><td class="p-2">{{ number(day.outputTokens) }}</td><td class="p-2">{{ number(day.thinkingTokens) }}</td><td class="p-2">{{ number(day.billableOutputTokens) }}</td><td class="p-2">{{ money(day.estimatedCostUsd) }}</td></tr></tbody></table></div>
          </template>
        </section>
      </template>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CpuChipIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import type { WhatsAppAiDiagnostics, WhatsAppAiProcessing, WhatsAppAiUsage } from '@/types/whatsapp'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
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
const usage = ref<WhatsAppAiUsage | null>(null)
const usageLoading = ref(false)
const usageError = ref<string | null>(null)
function localDate(value: Date) { const y=value.getFullYear(); const m=String(value.getMonth()+1).padStart(2,'0'); const d=String(value.getDate()).padStart(2,'0'); return `${y}-${m}-${d}` }
const today = localDate(new Date())
const prior = new Date(); prior.setDate(prior.getDate()-29)
const monthAgo = localDate(prior)
const usageFilters = reactive({ from: monthAgo, to: today, provider: '', model: '' })
const usageCards = computed(() => usage.value ? [
  { label: 'Invocaciones', value: number(usage.value.totalInvocations) }, { label: 'Mensajes procesados', value: number(usage.value.incomingMessagesProcessed) },
  { label: 'Tokens de entrada', value: number(usage.value.inputTokens) }, { label: 'Tokens de salida', value: number(usage.value.outputTokens) },
  { label: 'Tokens en caché', value: number(usage.value.cachedInputTokens) }, { label: 'Tokens de pensamiento', value: number(usage.value.thinkingTokens) },
  { label: 'Salida facturable', value: number(usage.value.billableOutputTokens) },
  { label: 'Costo estimado', value: money(usage.value.estimatedCostUsd) }, { label: 'Llamadas / mensaje', value: usage.value.averageInvocationsPerMessage.toFixed(2) },
  { label: 'Latencia promedio', value: `${Math.round(usage.value.averageDurationMs)} ms` }, { label: 'Latencia p95', value: `${Math.round(usage.value.p95DurationMs)} ms` }, { label: 'Herramientas / mensaje', value: usage.value.averageToolCallsPerMessage.toFixed(2) }, { label: 'Tasa de errores', value: `${(usage.value.errorRate * 100).toFixed(1)}%` },
] : [])
let usageRequest = 0
async function loadUsage() { const branchId=props.diagnostics?.branchId; if (!branchId) return; if (!usageFilters.from || !usageFilters.to || usageFilters.from>usageFilters.to) { usageError.value='Selecciona un rango de fechas válido.'; return } const request=++usageRequest; try { usageLoading.value=true; usageError.value=null; const response=await whatsappApi.getAiUsage({branchId,fromDate:usageFilters.from,toDate:usageFilters.to,provider:usageFilters.provider||undefined,model:usageFilters.model||undefined}); if(request===usageRequest && props.diagnostics?.branchId===branchId) usage.value=response.data??null } catch(error:any) { if(request===usageRequest) usageError.value=error?.message||'No se pudo consultar el uso de IA.' } finally { if(request===usageRequest) usageLoading.value=false } }
const number = (value: number) => new Intl.NumberFormat('es-CO').format(value)
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(value)
watch(() => [props.modelValue, props.diagnostics?.branchId], ([open], old) => { if (old?.[1]!==props.diagnostics?.branchId) { usageRequest++; usage.value=null; usageError.value=null } if (open) void loadUsage() }, { immediate: true })
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
