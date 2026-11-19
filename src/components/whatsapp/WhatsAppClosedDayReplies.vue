<template>
  <BaseDialog :model-value="modelValue" title="Responder por descanso" :dismissible="!sending"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="space-y-3 text-sm text-gray-700">
      <p v-if="loading" role="status">Buscando conversaciones…</p>
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <template v-if="preview">
        <p class="font-medium text-gray-900">{{ preview.branchName }}</p>
        <p v-if="preview.unavailableReason">{{ preview.unavailableReason }}</p>
        <p v-else-if="!preview.conversationIds.length">No hay conversaciones pendientes del miércoles con la ventana de 24 horas abierta.</p>
        <template v-else>
          <p>{{ preview.conversationIds.length }} {{ preview.conversationIds.length === 1 ? 'conversación pendiente' : 'conversaciones pendientes' }} del {{ formattedDate }}</p>
          <label class="block">
            <span class="font-medium text-gray-900">Mensaje</span>
            <textarea v-model="message" rows="5" maxlength="4096" :disabled="sending || completed"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-600" />
          </label>
        </template>
      </template>
      <p v-if="sending || completed" role="status" class="font-medium">
        {{ results.sent }} enviados · {{ results.skipped }} omitidos · {{ results.failed }} fallidos · {{ results.review }} por revisar
      </p>
    </div>
    <template #footer>
      <BaseButton variant="secondary" :disabled="sending" @click="emit('update:modelValue', false)">Cerrar</BaseButton>
      <BaseButton v-if="preview?.conversationIds.length && !completed" :loading="sending"
        :disabled="!message.trim()" @click="sendReplies">
        Enviar a {{ preview.conversationIds.length }} {{ preview.conversationIds.length === 1 ? 'chat' : 'chats' }}
      </BaseButton>
      <BaseButton v-else-if="error && !completed" :loading="loading" @click="loadPreview">Reintentar</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { whatsappApi, type WhatsAppClosedDayOutcome, type WhatsAppClosedDayPreview } from '@/services/MainAPI/whatsappApi'

const props = defineProps<{ modelValue: boolean; branchId?: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; sent: [] }>()
const preview = ref<WhatsAppClosedDayPreview>()
const message = ref('Hola, muy buenos días. Mil disculpas por no haberte contestado ayer. Estábamos de descanso. 😊\n\nDe igual manera, por acá estamos otra vez por si te podemos ayudar con algo.')
const error = ref('')
const loading = ref(false)
const sending = ref(false)
const completed = ref(false)
const results = ref<Record<WhatsAppClosedDayOutcome, number>>({ sent: 0, skipped: 0, failed: 0, review: 0 })
const controller = new AbortController()
const formattedDate = computed(() => {
  const date = preview.value?.closedDate
  return date ? new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00Z`)) : ''
})

async function loadPreview() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await whatsappApi.previewClosedDayReplies(props.branchId, controller.signal)
    if (!controller.signal.aborted) preview.value = response.data
  } catch (reason) {
    if (!controller.signal.aborted) error.value = reason instanceof Error ? reason.message : 'No se pudo revisar la bandeja.'
  } finally {
    loading.value = false
  }
}

async function sendReplies() {
  const batch = preview.value
  const text = message.value.trim()
  if (!batch?.closedDate || !batch.conversationIds.length || !text || sending.value || completed.value) return

  sending.value = true
  for (const id of batch.conversationIds) {
    if (controller.signal.aborted) break
    try {
      const { data } = await whatsappApi.sendClosedDayReply(batch.branchId, batch.closedDate, id, text)
      results.value[data ?? 'review']++
    } catch {
      results.value.review++
    }
  }
  sending.value = false
  completed.value = true
  if (!controller.signal.aborted && results.value.sent) emit('sent')
}

onMounted(loadPreview)
onBeforeUnmount(() => controller.abort())
</script>
