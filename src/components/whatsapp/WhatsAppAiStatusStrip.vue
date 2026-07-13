<template>
  <div
    v-if="diagnostics || processing || error"
    class="flex items-start gap-2 border-b px-4 py-2 text-xs"
    :class="toneClasses.surface"
    role="status"
    aria-live="polite"
  >
    <CpuChipIcon class="mt-0.5 h-4 w-4 shrink-0" :class="toneClasses.text" />
    <div class="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
      <p class="font-semibold" :class="toneClasses.text">{{ title }}</p>
      <p v-if="detail" class="mt-0.5 truncate opacity-90 sm:mt-0" :class="toneClasses.text" :title="detail">
        {{ detail }}
      </p>
      <span v-if="visibleProcessing?.willRetry" class="mt-1 inline-flex shrink-0 rounded-full bg-white/70 px-2 py-0.5 font-semibold sm:mt-0">
        Intento {{ visibleProcessing.attempts }}/{{ visibleProcessing.maxAttempts }}
      </span>
    </div>
    <button
      type="button"
      class="shrink-0 font-semibold underline decoration-dotted underline-offset-2"
      :class="toneClasses.text"
      @click="$emit('open')"
    >
      Ver actividad
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CpuChipIcon } from '@heroicons/vue/24/outline'
import type { WhatsAppAiDiagnostics, WhatsAppAiProcessing } from '@/types/whatsapp'
import {
  aiDiagnosticsTone,
  aiProcessingTone,
  aiToneClasses,
} from '@/utils/whatsappAiDiagnostics'

const props = defineProps<{
  diagnostics?: WhatsAppAiDiagnostics | null
  processing?: WhatsAppAiProcessing | null
  error?: string | null
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
  if (visibleProcessing.value) return aiProcessingTone(visibleProcessing.value)
  return aiDiagnosticsTone(props.diagnostics)
})
const toneClasses = computed(() => aiToneClasses[tone.value])
const title = computed(() =>
  visibleProcessing.value?.title
  || props.diagnostics?.title
  || (props.error ? 'No se pudo consultar el estado de la IA' : 'Estado de IA'),
)
const detail = computed(() => visibleProcessing.value?.detail || props.diagnostics?.summary || props.error || '')
</script>
