<template>
  <template v-for="(segment, index) in segments" :key="`${index}-${segment.text}`">
    <a
      v-if="safeHref(segment.href)"
      :href="safeHref(segment.href)!"
      target="_blank"
      rel="noreferrer"
      class="text-emerald-700 underline underline-offset-2"
    >
      <span :class="segmentClasses(segment)">{{ segment.text }}</span>
    </a>
    <span v-else :class="segmentClasses(segment)">{{ segment.text }}</span>
  </template>
</template>

<script setup lang="ts">
import type { BlogRichText } from '@/types/blogPublishing'

defineProps<{ segments: BlogRichText[] }>()

function safeHref(value?: string | null): string | null {
  if (!value) return null
  if (value.startsWith('/')) return value
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function segmentClasses(segment: BlogRichText) {
  return [
    segment.bold ? 'font-semibold' : '',
    segment.italic ? 'italic' : '',
    segment.underline ? 'underline' : '',
    segment.strikethrough ? 'line-through' : '',
    segment.code ? 'rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em]' : '',
  ]
}
</script>
