<template>
  <BaseDialog :model-value="modelValue" title="Nueva conversación" size="sm" :icon="UserPlusIcon"
    initial-focus="#wa-starter-phone" :dismissible="!sending" @update:model-value="emit('update:modelValue', $event)">
    <form class="space-y-4" @submit.prevent="send">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="starter-field">Número de WhatsApp
          <input id="wa-starter-phone" v-model.trim="phone" type="tel" inputmode="tel" maxlength="40" required autocomplete="off"
            placeholder="+57 300 123 4567" :disabled="sending" @input="requested = false" />
        </label>
        <BaseSelect v-model="branchId" label="Sucursal" display-key="label" :options="branches" :searchable="false"
          :disabled="sending || branches.length <= 1" inline-dropdown />
      </div>

      <p v-if="loading" role="status" class="starter-secondary">Consultando plantillas en Meta…</p>
      <div v-else-if="options" class="space-y-3">
        <p class="starter-secondary">Línea de envío · {{ options.displayPhoneNumber || options.branchName }}</p>
        <fieldset class="grid gap-1.5" :disabled="sending">
          <legend class="mb-1 text-sm font-semibold">Plantilla</legend>
          <label v-for="template in options.templates" :key="template.key" class="starter-template"
            :class="{ 'starter-template-selected': selection === template.key }">
            <input v-model="selection" type="radio" :value="template.key" :disabled="!!template.unavailableReason" />
            <span class="flex-1">
              <span class="block font-medium">{{ template.name === menuImageTemplate ? 'Carta como imagen' : labels[template.key] }}</span>
              <span v-if="template.unavailableReason" class="starter-secondary block">{{ template.unavailableReason }}</span>
            </span>
          </label>
        </fieldset>
        <label v-if="selection === 'payment'" class="starter-field">Total a pagar (COP)
          <input v-model.number="amount" type="number" inputmode="numeric" min="1" :max="maxAmount" step="1" required :disabled="sending" />
        </label>
        <div v-if="preview" class="starter-preview">
          <p>{{ preview }}</p>
          <span v-if="selection === 'menu'" class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold">
            <PhotoIcon v-if="menuIsImage" class="size-4" aria-hidden="true" />
            <DocumentIcon v-else class="size-4" aria-hidden="true" />
            Carta de {{ options.branchName }} · {{ menuIsImage ? 'Imagen' : 'PDF' }}
          </span>
        </div>
        <label v-if="selectedTemplate" class="flex items-start gap-2 text-sm">
          <input v-model="requested" type="checkbox" class="mt-1" required :disabled="sending" />
          El cliente solicitó recibir este mensaje por WhatsApp.
        </label>
      </div>

      <p v-if="error" role="alert" class="starter-error">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" :disabled="sending" @click="emit('update:modelValue', false)">Volver</BaseButton>
        <BaseButton v-if="!options && !loading && branchId" variant="outline" @click="loadOptions">Reintentar</BaseButton>
        <BaseButton type="submit" :loading="sending" :disabled="!canSend">Enviar plantilla</BaseButton>
      </div>
    </form>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { DocumentIcon, PhotoIcon, UserPlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { WhatsAppConversationStartKind, WhatsAppConversationStartOptions, WhatsAppConversationStartRequest } from '@/types/whatsapp'
import { generatePosCreationKey } from '@/utils/posCreationKey'

const props = defineProps<{
  modelValue: boolean; branches: { id: number; label: string }[]; initialBranchId: number; initialPhone?: string;
}>()
const emit = defineEmits<{ 'update:modelValue': [visible: boolean]; complete: [id: number, sent: boolean] }>()
const menuImageTemplate = 'carta_imagen_solicitada'
const labels: Record<WhatsAppConversationStartKind, string> = {
  menu: 'Carta en PDF', catalog: 'Catálogo de WhatsApp', payment: 'Pago por Bancolombia',
}
const branchId = ref(props.initialBranchId)
const phone = ref(props.initialPhone ?? '')
const selection = ref<WhatsAppConversationStartKind | ''>('')
const requested = ref(false)
const maxAmount = 2_147_483_647
const amount = ref<number | ''>('')
const options = ref<WhatsAppConversationStartOptions | null>(null)
const loading = ref(false)
const sending = ref(false)
const error = ref('')
let controller: AbortController | undefined
let request: { body: string; key: string } | undefined
let disposed = false
const selectedTemplate = computed(() => options.value?.templates.find(template => template.key === selection.value && !template.unavailableReason))
const menuIsImage = computed(() => selectedTemplate.value?.name === menuImageTemplate)
const validAmount = computed(() => typeof amount.value === 'number' && Number.isInteger(amount.value)
  && amount.value > 0 && amount.value <= maxAmount)
const canSend = computed(() => !!selectedTemplate.value && !!phone.value && requested.value && !loading.value && !sending.value
  && (selection.value !== 'payment' || validAmount.value))

const preview = computed(() => {
  if (!options.value || !selectedTemplate.value?.body) return ''
  const values = selection.value === 'payment'
    ? [options.value.account?.trim(), options.value.holder?.trim(),
      validAmount.value ? `$${amount.value.toLocaleString('es-CO')} COP` : '«total»']
    : [options.value.branchName]
  return selectedTemplate.value.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, index) => values[Number(index) - 1] ?? '')
})

async function loadOptions() {
  controller?.abort()
  const current = new AbortController()
  controller = current
  options.value = null
  selection.value = ''
  requested.value = false
  error.value = ''
  if (!branchId.value) {
    error.value = 'Selecciona una sucursal con WhatsApp habilitado.'
    return
  }
  loading.value = true
  try {
    const response = await whatsappApi.getConversationStartOptions(branchId.value, current.signal)
    if (!current.signal.aborted) options.value = response.data ?? null
  } catch (failure) {
    if (!current.signal.aborted) error.value = failure instanceof Error ? failure.message : 'No se pudieron consultar las plantillas.'
  } finally {
    if (!current.signal.aborted) loading.value = false
  }
}

async function send() {
  if (!canSend.value || !options.value || !selectedTemplate.value || !selection.value) return
  const payload: WhatsAppConversationStartRequest = {
    branchId: options.value.branchId, senderId: options.value.senderId, phone: phone.value,
    template: selection.value, templateName: selectedTemplate.value.name, requestedByCustomer: requested.value,
    ...(selection.value === 'payment' ? { amount: Number(amount.value) } : {}),
  }
  const body = JSON.stringify(payload)
  if (request?.body !== body) request = { body, key: generatePosCreationKey() }
  sending.value = true
  error.value = ''
  try {
    const response = await whatsappApi.startConversation(payload, request.key)
    if (disposed) return
    if (!response.data) {
      error.value = 'No se pudo confirmar el envío. Revisa la bandeja antes de volver a intentarlo.'
      return
    }
    emit('complete', response.data.conversationId, response.data.sent)
    emit('update:modelValue', false)
  } catch (failure) {
    if (!disposed) error.value = failure instanceof Error ? failure.message : 'No se pudo confirmar el envío.'
  } finally {
    sending.value = false
  }
}

watch(branchId, loadOptions, { immediate: true })
onBeforeUnmount(() => { disposed = true; controller?.abort() })
</script>

<style scoped>
.starter-field { display: grid; gap: .25rem; font-size: .875rem; font-weight: 600; }
.starter-field input {
  width: 100%; min-width: 0; min-height: 2.25rem; border: 1px solid var(--wa-input-line);
  border-radius: .4375rem; background: var(--wa-canvas); padding: .375rem .5rem;
  color: var(--wa-text); font-weight: 400;
}
input:focus-visible { outline: 2px solid var(--wa-focus); outline-offset: 2px; }
input:is([type="radio"], [type="checkbox"]) { accent-color: var(--wa-action); }
.starter-secondary { color: var(--wa-muted); font-size: .75rem; }
.starter-template {
  display: flex; align-items: center; gap: .625rem; border: 1px solid var(--wa-line); border-radius: .5rem;
  background: var(--wa-panel); padding: .5rem .625rem; font-size: .8125rem;
}
.starter-template:has(input:enabled) { cursor: pointer; }
.starter-template-selected { border-color: var(--wa-action); background: var(--wa-outgoing); }
.starter-preview {
  border-radius: .5rem; background: var(--wa-raised); padding: .625rem; color: var(--wa-text);
  font-size: .8125rem; overflow-wrap: anywhere; white-space: pre-wrap;
}
.starter-error { color: var(--wa-warning); font-size: .8125rem; }
</style>
