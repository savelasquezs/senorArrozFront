<template>
  <div v-if="displayLines.length" class="min-w-0" :title="tooltipText">
    <div class="space-y-0.5 text-[11px] leading-tight text-gray-600">
      <div
        v-for="(line, idx) in displayLines"
        :key="idx"
        :class="line === overflowLabel ? 'text-gray-400' : 'line-clamp-2 break-words'"
      >
        {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderLineSummary } from '@/types/order'

const overflowLabel = '....'

const props = withDefaults(defineProps<{
  lines?: OrderLineSummary[] | null
  maxLines?: number
}>(), {
  maxLines: 2,
})

const displayLines = computed(() => {
  const lines = props.lines ?? []
  if (lines.length === 0) return []

  const formatted = lines.map((line) => `${line.productName} × ${line.quantity}`)
  if (formatted.length <= props.maxLines) return formatted

  return [...formatted.slice(0, props.maxLines), overflowLabel]
})

const tooltipText = computed(() => {
  return (props.lines ?? [])
    .map((line) => `${line.productName} × ${line.quantity}`)
    .join('\n')
})
</script>
