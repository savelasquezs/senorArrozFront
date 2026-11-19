<template>
  <ul class="space-y-1">
    <li v-for="label in labels" :key="label.key" class="flex items-center gap-1 rounded-xl border p-1"
      :class="applied?.includes(label.key) ? 'border-emerald-200 bg-emerald-50/60' : 'border-transparent hover:bg-slate-50'">
      <component :is="label.editable && canAssign ? 'label' : 'div'"
        class="relative flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 focus-within:ring-2 focus-within:ring-emerald-600"
        :class="{ 'cursor-pointer': label.editable && canAssign && !busy }">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg" :class="inboxLabelColor(label.key, label.color)">
          <TagIcon class="h-4 w-4" aria-hidden="true" />
        </span>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800" :title="label.name">{{ label.name }}</span>
        <input v-if="label.editable && canAssign" type="checkbox" class="h-4 w-4 shrink-0 accent-emerald-700"
          :aria-label="label.name" :checked="applied?.includes(label.key)" :disabled="busy" @change="emit('toggle', label.key, $event)" />
        <span v-else-if="!label.editable" class="shrink-0 text-[10px] font-medium text-slate-600">Automática</span>
      </component>
      <div v-if="label.custom" class="flex shrink-0 items-center border-l border-slate-200 pl-1">
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-white hover:text-emerald-800 focus-visible:outline-emerald-600 disabled:opacity-50"
          :disabled="busy" :aria-label="`Editar ${label.name}`" title="Editar etiqueta" @click="emit('edit', label)">
          <PencilSquareIcon class="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-rose-100 hover:text-rose-800 focus-visible:outline-rose-600 disabled:opacity-50"
          :disabled="busy" :aria-label="`Borrar ${label.name}`" title="Borrar etiqueta" @click="emit('remove', label)">
          <TrashIcon class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { PencilSquareIcon, TagIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { WhatsAppInboxLabel } from '@/types/whatsapp'
import { inboxLabelColor } from '@/utils/whatsappInbox'

defineProps<{ labels: WhatsAppInboxLabel[]; applied?: string[]; canAssign?: boolean; busy?: boolean }>()
const emit = defineEmits<{
  toggle: [key: string, event: Event]
  edit: [label: WhatsAppInboxLabel]
  remove: [label: WhatsAppInboxLabel]
}>()
</script>
