<template>
  <ul class="space-y-1.5" aria-label="Recordatorios">
    <li v-for="item in items" :key="item.reminder.id" class="task-row group flex items-start gap-2 rounded-xl border px-3 py-2.5"
      :class="item.isChecked ? 'border-transparent bg-emerald-50/60' : 'border-transparent hover:border-slate-100 hover:bg-slate-50'">
      <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-3 py-1">
        <span class="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <input type="checkbox" class="peer h-5 w-5 cursor-pointer appearance-none rounded-[7px] border-[1.5px] border-slate-300 bg-white transition-all checked:border-emerald-600 checked:bg-emerald-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-wait"
            :checked="item.isChecked" :disabled="disabled || busyIds.includes(item.reminder.id)" :aria-label="item.reminder.title"
            @change="emit('check', item.reminder.id, ($event.target as HTMLInputElement).checked)" />
          <CheckIcon class="check-glyph pointer-events-none absolute h-3.5 w-3.5 text-white" :class="item.isChecked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'" aria-hidden="true" />
        </span>
        <span class="min-w-0">
          <span class="task-title block text-[13px] font-medium leading-5" :class="item.isChecked ? 'text-slate-400 line-through decoration-emerald-300' : 'text-slate-700'">{{ item.reminder.title }}</span>
          <span v-if="item.reminder.responsible === 'admin' || item.reminder.condition" class="mt-0.5 block text-[10px] leading-4 text-slate-400">
            {{ item.reminder.responsible === 'admin' ? 'Administración' : 'Si corresponde' }}{{ item.reminder.responsible === 'admin' && item.reminder.condition ? ' · Si corresponde' : '' }}
          </span>
        </span>
      </label>
      <BaseTooltip :label="`Ayuda: ${item.reminder.title}`" :text="item.reminder.description + (item.reminder.condition ? '\n\n' + item.reminder.condition : '')" />
    </li>
  </ul>
</template>
<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'
import type { ChecklistItem } from '@/types/operationalChecklist'
withDefaults(defineProps<{ items: ChecklistItem[]; busyIds: number[]; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ check: [id: number, checked: boolean] }>()
</script>
<style scoped>
.task-row,.task-title,.check-glyph { transition: background-color .2s ease, color .2s ease, transform .18s ease, opacity .18s ease, border-color .2s ease; }
@media (prefers-reduced-motion: reduce) { .task-row,.task-title,.check-glyph,input { transition: none; } }
</style>
