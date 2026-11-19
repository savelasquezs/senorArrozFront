<template>
  <BaseTooltip :icon="CpuChipIcon" :label="title + ' · Ver actividad de IA'" :text="description"
    :button-class="toneClasses.badge" compact action @activate="$emit('open')" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CpuChipIcon } from '@heroicons/vue/24/outline'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import type { WhatsAppAiDiagnostics, WhatsAppAiProcessing } from '@/types/whatsapp'
import {
  aiDiagnosticsTone,
  aiProcessingTone,
  aiToneClasses,
  isAiProcessingPending,
} from '@/utils/whatsappAiDiagnostics'

const props = defineProps<{
  diagnostics?: WhatsAppAiDiagnostics | null
  processing?: WhatsAppAiProcessing | null
  error?: string | null
  answered?: boolean
}>()

defineEmits<{ open: [] }>()

const toneRank = { danger: 5, warning: 4, info: 3, neutral: 2, success: 1 }
const visibleProcessing = computed(() => {
  if (!props.processing) return null
  const processingTone = aiProcessingTone(props.processing)
  const diagnosticsTone = aiDiagnosticsTone(props.diagnostics)
  return toneRank[processingTone] >= toneRank[diagnosticsTone] ? props.processing : null
})
const tone = computed(() => {
  if (props.error) return 'danger' as const
  const status = visibleProcessing.value
  const diagnostic = aiDiagnosticsTone(props.diagnostics)
  if (diagnostic === 'danger' || aiProcessingTone(status) === 'danger') return 'danger'
  if (status && status.status !== 'sent' && isAiProcessingPending(status)) return 'warning'
  if (props.answered) return 'success'
  return diagnostic === 'warning' && props.diagnostics?.attentionMode === 'ai' ? 'warning' : 'neutral'
})
const toneClasses = computed(() => aiToneClasses[tone.value])
const title = computed(() =>
  props.error ? 'No se pudo consultar el estado de la IA'
    : tone.value === 'success' ? 'Respondido por IA'
      : visibleProcessing.value?.title || props.diagnostics?.title || 'Sin respuesta de IA',
)
const detail = computed(() => visibleProcessing.value?.detail || props.diagnostics?.summary || props.error || '')
const description = computed(() => [
  title.value, detail.value,
  props.answered && tone.value !== 'success' ? 'La IA ya respondió en esta conversación.' : '',
  visibleProcessing.value?.willRetry ? `Intento ${visibleProcessing.value.attempts}/${visibleProcessing.value.maxAttempts}` : '',
].filter(Boolean).join('\n'))
</script>
