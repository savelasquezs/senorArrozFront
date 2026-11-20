<template>
  <BaseDialog :model-value="modelValue" title="Reenviar mensajes" size="md" :dismissible="!sending"
    :close-on-backdrop="false" :initial-focus="`#${searchId}`" @update:model-value="emit('update:modelValue', $event)">
    <label :for="searchId" class="mb-1 block text-xs font-medium text-gray-700">Elige un chat a tu cargo con ventana abierta</label>
    <input :id="searchId" v-model="search" type="search" class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
      placeholder="Nombre, teléfono o usuario" :disabled="sending" />
    <div class="mt-3 space-y-1" role="group" aria-label="Chats de destino">
      <button v-for="chat in destinations" :key="chat.id" type="button" :aria-pressed="target === chat.id"
        :disabled="sending" class="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-left hover:bg-gray-100"
        :class="{ 'border-emerald-500 bg-emerald-50': target === chat.id }" @click="target = chat.id">
        <UserCircleIcon class="size-6 shrink-0 text-gray-500" aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ conversationTitle(chat) }}</span>
          <span v-if="chat.whatsAppUsername || chat.phoneNumber" class="block truncate text-xs text-gray-600">{{ chat.whatsAppUsername || chat.phoneNumber }}</span>
        </span>
        <CheckIcon v-if="target === chat.id" class="size-4 text-emerald-700" aria-hidden="true" />
      </button>
      <p v-if="loading" role="status" class="px-1 py-2 text-sm text-gray-600">Buscando chats…</p>
      <p v-else-if="!destinations.length && !loadError" class="px-1 py-2 text-sm text-gray-600">No se encontraron chats disponibles.</p>
      <BaseButton v-if="cursor && !loading" variant="ghost" size="sm" :disabled="sending" @click="load(true)">Cargar más</BaseButton>
      <BaseButton v-if="loadError && !loading" variant="ghost" size="sm" :disabled="sending" @click="load(false)">Reintentar búsqueda</BaseButton>
    </div>
    <p v-if="error || loadError" role="alert" class="mt-2 text-sm text-red-600">{{ error || loadError }}</p>
    <template #footer>
      <BaseButton variant="secondary" :disabled="sending" @click="emit('update:modelValue', false)">Volver</BaseButton>
      <BaseButton variant="primary" :loading="sending" :disabled="!target || !count" @click="confirm">
        {{ count === 1 ? 'Reenviar mensaje' : `Reenviar ${count} mensajes` }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'
import { CheckIcon, UserCircleIcon } from '@heroicons/vue/24/outline'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useDebouncedCallback } from '@/composables/useDebouncedCallback'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { WhatsAppConversation } from '@/types/whatsapp'
import { conversationTitle } from '@/utils/whatsappInbox'

const props = defineProps<{
  modelValue: boolean
  sourceId: number
  userId: number | undefined
  count: number
  sending: boolean
  error: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; forward: [destinationId: number] }>()
const searchId = useId()
const search = ref('')
const destinations = ref<WhatsAppConversation[]>([])
const target = ref<number | null>(null)
const cursor = ref<string | null>(null)
const loading = ref(false)
const loadError = ref('')
let request: AbortController | undefined
const searchDebounce = useDebouncedCallback(() => { void load(false) }, 225)

async function load(append: boolean) {
  request?.abort()
  const control = new AbortController()
  request = control
  loading.value = true
  loadError.value = ''
  try {
    const query = search.value.trim()
    const { data } = await whatsappApi.getConversationPage({ inbox: 'mine', search: query || undefined },
      control.signal, append ? cursor.value ?? undefined : undefined)
    if (control.signal.aborted) return
    const now = Date.now()
    const eligible = data.items.filter(chat => chat.id !== props.sourceId && chat.assignedUserId === props.userId
      && chat.attentionMode === 'human' && Date.parse(chat.customerServiceWindowExpiresAt ?? '') > now)
    destinations.value = append ? [...destinations.value, ...eligible] : eligible
    cursor.value = data.nextCursor
  } catch {
    if (!control.signal.aborted) loadError.value = 'No se pudieron buscar los chats.'
  } finally {
    if (request === control) loading.value = false
  }
}

function confirm() {
  if (!props.sending && target.value && destinations.value.some(chat => chat.id === target.value)) emit('forward', target.value)
}

watch(search, () => {
  if (!props.modelValue) return
  request?.abort()
  target.value = null
  destinations.value = []
  cursor.value = null
  loading.value = true
  searchDebounce.schedule()
})
watch(() => props.modelValue, open => {
  if (open) void load(false)
  else {
    request?.abort()
    searchDebounce.cancel()
    search.value = ''
    target.value = null
    destinations.value = []
    cursor.value = null
  }
}, { immediate: true })
onBeforeUnmount(() => request?.abort())
</script>
