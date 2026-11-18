<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="shrink-0 overflow-x-auto border-b border-gray-100 bg-white px-2 pt-2">
      <div class="flex min-w-max gap-1" role="tablist" aria-label="Bandejas de WhatsApp">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeKey === tab.key"
          class="inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition-colors sm:text-sm"
          :class="activeKey === tab.key
            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
            : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          @click="selectTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.pendingOrders > 0"
            class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-900"
            :title="`${tab.pendingOrders} conversaciones sin pedido`">
            {{ tab.pendingOrders > 99 ? '99+' : tab.pendingOrders }} sin pedido
          </span>
          <span
            v-if="tab.unreadConversations > 0"
            class="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
            :title="`${tab.unreadConversations} conversaciones sin leer`"
          >
            {{ tab.unreadConversations > 99 ? '99+' : tab.unreadConversations }}
          </span>
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <slot :conversations="activeTab?.conversations ?? []" :active-key="activeKey" />
      <div
        v-if="!loading && (activeTab?.conversations.length ?? 0) === 0"
        class="p-6 text-center text-sm text-gray-500"
      >
        No hay conversaciones en esta bandeja.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WhatsAppInboxSection } from '@/utils/whatsappInbox'
import type { WhatsAppInboxKey, WhatsAppInboxSummary } from '@/types/whatsapp'
const props = withDefaults(defineProps<{
  sections: WhatsAppInboxSection[]; modelValue?: WhatsAppInboxKey;
  counts?: WhatsAppInboxSummary | null;
  selectedConversationId?: number | null; loading?: boolean; isSuperadmin?: boolean
}>(), { modelValue: 'free', loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: WhatsAppInboxKey] }>()
const activeKey = computed(() => props.modelValue)
const tabs = computed(() => props.sections.map(section => ({ ...section,
  pendingOrders: props.counts?.[section.key]?.pendingOrders ?? 0,
  unreadConversations: props.counts?.[section.key]?.unreadConversations ?? 0,
})))
const activeTab = computed(() => tabs.value.find(tab => tab.key === activeKey.value))
function selectTab(key: WhatsAppInboxKey) { emit('update:modelValue', key) }
</script>
