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
          @click="activeKey = tab.key"
        >
          <span>{{ tab.label }}</span>
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
import { computed, ref, watch } from 'vue'
import type { WhatsAppInboxSection } from '@/utils/whatsappInbox'

type InboxKey = WhatsAppInboxSection['key']

interface InboxTab extends WhatsAppInboxSection {
  unreadConversations: number
}

const props = withDefaults(defineProps<{
  sections: WhatsAppInboxSection[]
  selectedConversationId?: number | null
  loading?: boolean
  isSuperadmin?: boolean
}>(), {
  selectedConversationId: null,
  loading: false,
  isSuperadmin: false,
})

const activeKey = ref<InboxKey>('unassigned')

const sectionMap = computed(() => new Map(props.sections.map(section => [section.key, section])))

const tabs = computed<InboxTab[]>(() => {
  const unassigned = sectionMap.value.get('unassigned')
  const branch = sectionMap.value.get('branch')
  const assigned = sectionMap.value.get('assigned')

  const result: WhatsAppInboxSection[] = [
    unassigned ?? { key: 'unassigned', label: 'Sin asignar', conversations: [] },
    branch ?? { key: 'branch', label: props.isSuperadmin ? 'Sucursales' : 'Mi sucursal', conversations: [] },
  ]

  if (!props.isSuperadmin && assigned?.conversations.length) result.push(assigned)

  return result.map(section => ({
    ...section,
    unreadConversations: section.conversations.filter(conversation => conversation.unreadCount > 0).length,
  }))
})

const activeTab = computed(() =>
  tabs.value.find(tab => tab.key === activeKey.value) ?? tabs.value[0] ?? null,
)

function tabForConversation(conversationId: number | null | undefined) {
  if (!conversationId) return null
  return tabs.value.find(tab => tab.conversations.some(conversation => conversation.id === conversationId)) ?? null
}

watch(
  () => [props.selectedConversationId, props.sections] as const,
  ([selectedConversationId]) => {
    const selectedTab = tabForConversation(selectedConversationId)
    if (selectedTab) {
      activeKey.value = selectedTab.key
      return
    }

    if (!tabs.value.some(tab => tab.key === activeKey.value)) {
      activeKey.value = tabs.value[0]?.key ?? 'unassigned'
    }
  },
  { immediate: true, deep: true },
)
</script>
