<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="shrink-0 border-b border-gray-100 bg-white px-1">
      <div class="flex flex-wrap" role="tablist" aria-label="Bandejas de WhatsApp">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeKey === tab.key"
          class="wa-tab"
          @click="selectTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span class="wa-tab-pending"
            :class="{ 'text-gray-500': !tab.pendingOrders }"
            :title="`${tab.pendingOrders} conversaciones sin pedido`">
            {{ tab.pendingOrders > 99 ? '99+' : tab.pendingOrders }}<span class="sr-only"> sin pedido</span>
          </span>
          <span
            v-if="tab.unreadConversations > 0"
            class="wa-tab-unread"
            :title="`${tab.unreadConversations} conversaciones sin leer`"
          >
            {{ tab.unreadConversations > 99 ? '99+' : tab.unreadConversations }}<span class="sr-only"> sin leer</span>
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

<style scoped>
.wa-tab {
  position: relative; display: inline-flex; flex: 1 1 auto; min-height: 1.9375rem;
  align-items: baseline; justify-content: center; gap: .1875rem; padding: .4375rem .1875rem;
  color: var(--wa-muted); white-space: nowrap; font-size: .6875rem; font-weight: 650; cursor: pointer;
}
.wa-tab[aria-selected="true"] { color: var(--wa-focus); background: var(--wa-selected); }
.wa-tab:hover { background: var(--wa-raised); }
.wa-tab::after {
  position: absolute; content: ''; inset: auto 0 0; height: 2px; background: var(--wa-focus);
  transform: scaleX(0); transition: transform 150ms cubic-bezier(.2, 0, .38, .9);
}
.wa-tab[aria-selected="true"]::after { transform: scaleX(1); }
.wa-tab-pending, .wa-tab-unread { font-size: .625rem; line-height: 1.15; font-variant-numeric: tabular-nums; }
.wa-tab-pending { color: var(--wa-warning); }
.wa-tab-pending.text-gray-500 { color: var(--wa-muted); }
.wa-tab-unread { color: var(--wa-on-action); background: var(--wa-action); padding: .0625rem .1875rem; border-radius: .25rem; }
@media (prefers-reduced-motion: reduce) { .wa-tab::after { transition: none; } }
</style>
