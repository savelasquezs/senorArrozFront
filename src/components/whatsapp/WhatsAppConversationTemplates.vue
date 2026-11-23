<template>
  <button type="button" class="wa-template-trigger text-xs font-semibold text-emerald-700 underline" @click="load">Plantillas aprobadas de esta línea</button>
  <BaseDialog v-model="open" title="Enviar plantilla" size="md" :dismissible="!sending">
    <p class="mb-3 text-sm text-gray-600">Se enviará desde el mismo número de esta conversación.</p>
    <p v-if="loading" class="text-sm">Consultando plantillas en Meta…</p>
    <p v-else-if="!templates.length && !error" class="text-sm">No hay plantillas disponibles para este chat.</p>
    <form v-else-if="templates.length" class="space-y-3" @submit.prevent="send">
      <BaseSelect v-model="selection" label="Plantilla" placeholder="Seleccionar…" :options="templateOptions"
        :disabled="sending" :searchable="templates.length > 7" inline-dropdown @update:model-value="resetParameters" />
      <p v-if="selected" class="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">{{ body }}</p>
      <label v-for="index in parameterCount" :key="index" class="block text-sm">
        {{ isSupplierOrder ? supplierLabels[index - 1] || `Valor ${index}` : `Valor ${index}` }}
        <input v-model="parameters[index - 1]" required maxlength="1024"
          class="mt-1 w-full rounded-md border border-gray-300 bg-gray-50 p-2 focus-visible:outline-2 focus-visible:outline-emerald-600"
          :readonly="isSupplierOrder && index === 2 && !!branchName" :disabled="sending" />
      </label>
      <BaseButton type="submit" :loading="sending" :disabled="!selected || parameters.filter(p => p?.trim()).length !== parameterCount">Enviar plantilla</BaseButton>
    </form>
    <p v-if="error" role="alert" class="mt-3 text-sm text-red-700">{{ error }}</p>
  </BaseDialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { useWhatsAppStore } from '@/store/whatsapp'
import type { WhatsAppConversationTemplate } from '@/types/whatsapp'
import { supplierOrderTemplateLanguage, supplierOrderTemplateName } from '@/helpers/whatsappSupplierOrder'
import { whatsappTemplateBody } from '@/utils/whatsappInbox'

const props = defineProps<{ conversationId: number; branchName?: string }>()
const emit = defineEmits<{ sent: [conversationId: number] }>()
const supplierLabels = ['Productos', 'Sucursal', 'Entrega para']
const store = useWhatsAppStore()
const open = ref(false), loading = ref(false), sending = ref(false), error = ref('')
const selection = ref<string | null>(null)
const templates = ref<WhatsAppConversationTemplate[]>([]), parameters = ref<string[]>([])
let disposed = false
onBeforeUnmount(() => { disposed = true })
const key = (template: WhatsAppConversationTemplate) => `${template.name}:${template.language}`
const templateOptions = computed(() => templates.value.map(template => ({
  id: key(template), name: `${template.name} · ${template.language}`,
})))
const selected = computed(() => templates.value.find(t => key(t) === selection.value))
const isSupplierOrder = computed(() => selected.value?.name === supplierOrderTemplateName
  && selected.value.language === supplierOrderTemplateLanguage)
const body = computed(() => whatsappTemplateBody(selected.value?.componentsJson ?? '[]') || selected.value?.name || '')
const parameterCount = computed(() => Math.max(0, ...[...body.value.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(match => Number(match[1]))))
function resetParameters() {
  parameters.value = isSupplierOrder.value && props.branchName ? ['', props.branchName, ''] : []
}
async function load() {
  if (loading.value || sending.value) return
  open.value = true; loading.value = true; error.value = ''
  try { templates.value = (await whatsappApi.getConversationTemplates(props.conversationId)).data ?? [] }
  catch (failure: any) { error.value = failure.message || 'No se pudieron consultar las plantillas.' }
  finally { loading.value = false }
}
async function send() {
  if (!selected.value || sending.value) return
  const id = props.conversationId, template = selected.value
  sending.value = true; error.value = ''
  try {
    const values = parameters.value.map(value => value.trim())
    if (isSupplierOrder.value && props.branchName) values[1] = props.branchName
    const response = await whatsappApi.sendConversationTemplate(id, template.name, template.language, values)
    if (response.data && !disposed) {
      store.upsertMessage(id, response.data)
      emit('sent', id)
    }
    open.value = false
  } catch (failure: any) { error.value = failure.message || 'No se pudo confirmar el envío. Revisa el chat antes de repetirlo.' }
  finally { sending.value = false }
}
</script>
