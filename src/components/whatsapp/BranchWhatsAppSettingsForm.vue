<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ChatBubbleLeftRightIcon class="w-6 h-6 text-emerald-600" />
          WhatsApp
        </h3>
        <p class="mt-1 text-sm text-gray-600">
          Configuración de WhatsApp Cloud API para esta sucursal.
        </p>
      </div>
      <BaseBadge :variant="statusBadge.variant">{{ statusBadge.label }}</BaseBadge>
    </div>

    <BaseAlert v-if="loadError" variant="danger">
      <ExclamationTriangleIcon class="w-5 h-5" />
      <span>{{ loadError }}</span>
    </BaseAlert>

    <BaseLoading v-if="loading" text="Cargando configuración de WhatsApp..." />

    <form v-else class="space-y-4" @submit.prevent="save">
      <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
        <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
        Activar WhatsApp para esta sucursal
      </label>

      <section class="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
        <div>
          <h4 class="font-semibold text-gray-900">Mensaje de ausencia</h4>
          <p class="mt-1 text-sm text-gray-600">
            Se envía una vez por conversación mientras la sucursal esté cerrada, según los horarios configurados en la sección General.
          </p>
        </div>
        <label class="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
          <input v-model="form.awayMessageEnabled" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          Activar respuesta automática fuera del horario
        </label>
        <label class="block text-sm font-medium text-gray-700">
          Texto del mensaje
          <textarea
            v-model="form.awayMessageText"
            rows="4"
            maxlength="3500"
            :disabled="!form.awayMessageEnabled"
            class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          />
        </label>
        <div class="flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span v-pre>Variables disponibles: {{BranchName}} y {{NextOpening}}.</span>
          <span>{{ form.awayMessageText.length }}/3500</span>
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BaseInput v-model="form.phoneNumberId" label="Phone Number ID" placeholder="123456789012345" required :maxlength="64" />
        <BaseInput v-model="form.businessAccountId" label="Business Account ID" placeholder="123456789012345" required :maxlength="64" />
        <BaseInput v-model="form.displayPhoneNumber" label="Display Phone Number" placeholder="+57 300 123 4567" required :maxlength="32" />
        <BaseInput v-model="form.webhookVerifyToken" label="Webhook Verify Token" placeholder="Token definido para Meta Developers" required :maxlength="255" />
        <BaseInput
          v-model="form.accessToken"
          class="lg:col-span-2"
          type="password"
          label="Access Token"
          :placeholder="setting?.accessTokenConfigured ? 'Token configurado. Déjalo vacío para conservarlo.' : 'Access token de Meta'"
          :required="!setting?.accessTokenConfigured"
          :maxlength="4096"
        />
        <BaseInput
          v-model="form.appSecret"
          class="lg:col-span-2"
          type="password"
            label="Clave secreta de la app (App Secret)"
            :placeholder="setting?.appSecretConfigured ? 'Déjalo vacío para conservar la clave actual.' : 'Clave de 32 caracteres de Meta; no el ID de la app'"
          :maxlength="255"
        />
      </div>

      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
        <p class="text-sm font-medium text-gray-900">Webhook URL</p>
        <div class="flex flex-col gap-2 sm:flex-row">
          <code class="flex-1 rounded-md bg-white border border-gray-200 px-3 py-2 text-xs text-gray-700 break-all">{{ webhookUrl }}</code>
          <BaseButton type="button" variant="secondary" size="sm" @click="copyWebhookUrl">
            Copiar
          </BaseButton>
        </div>
        <p class="text-xs text-gray-500">
          Configura esta URL en Meta Developers como webhook y usa el mismo Webhook Verify Token de esta sucursal.
        </p>
      </div>

      <BaseAlert v-if="message.text" :variant="message.variant">
        <InformationCircleIcon v-if="message.variant !== 'danger'" class="w-5 h-5" />
        <ExclamationTriangleIcon v-else class="w-5 h-5" />
        <span>{{ message.text }}</span>
      </BaseAlert>

      <div class="flex flex-wrap justify-end gap-2 pt-3 border-t border-gray-100">
        <BaseButton type="button" variant="outline" :loading="testing" :disabled="saving || !canTest" @click="testConnection">
          Probar conexión
        </BaseButton>
        <BaseButton type="submit" variant="primary" :loading="saving" :disabled="testing">
          Guardar configuración
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { whatsappApi, whatsappWebhookUrl } from '@/services/MainAPI/whatsappApi'
import type { UpsertWhatsAppBranchSetting, WhatsAppBranchSetting } from '@/types/whatsapp'
import {
  DEFAULT_WHATSAPP_AWAY_MESSAGE,
  validateWhatsAppAwayMessage,
} from '@/utils/whatsappAwayMessage'

const props = defineProps<{ branchId: number }>()
const emit = defineEmits<{ saved: [setting: WhatsAppBranchSetting] }>()

const setting = ref<WhatsAppBranchSetting | null>(null)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const loadError = ref('')
const message = reactive<{ text: string; variant: 'success' | 'warning' | 'danger' | 'info' }>({ text: '', variant: 'info' })
const form = reactive<UpsertWhatsAppBranchSetting>({
  phoneNumberId: '',
  businessAccountId: '',
  displayPhoneNumber: '',
  accessToken: '',
  webhookVerifyToken: '',
  appSecret: '',
  isActive: false,
  awayMessageEnabled: false,
  awayMessageText: DEFAULT_WHATSAPP_AWAY_MESSAGE,
})

const webhookUrl = whatsappWebhookUrl()

const statusBadge = computed(() => {
  if (!setting.value?.id) return { label: 'No configurado', variant: 'secondary' as const }
  if (setting.value.isActive && setting.value.isVerified) return { label: 'Conectado/verificado', variant: 'success' as const }
  if (setting.value.isActive && !setting.value.isVerified) return { label: 'Configurado sin verificar', variant: 'warning' as const }
  return { label: 'Configurado inactivo', variant: 'secondary' as const }
})

const canTest = computed(() =>
  !!setting.value?.id || (
    !!form.phoneNumberId.trim()
    && !!form.businessAccountId.trim()
    && !!form.displayPhoneNumber.trim()
    && !!form.webhookVerifyToken.trim()
    && !!form.accessToken?.trim()
  )
)

function applySetting(next: WhatsAppBranchSetting) {
  setting.value = next
  form.phoneNumberId = next.phoneNumberId ?? ''
  form.businessAccountId = next.businessAccountId ?? ''
  form.displayPhoneNumber = next.displayPhoneNumber ?? ''
  form.accessToken = ''
  form.webhookVerifyToken = next.webhookVerifyToken ?? ''
  form.appSecret = ''
  form.isActive = next.isActive ?? false
  form.awayMessageEnabled = next.awayMessageEnabled ?? false
  form.awayMessageText = next.awayMessageText?.trim() || DEFAULT_WHATSAPP_AWAY_MESSAGE
}

async function load() {
  try {
    loading.value = true
    loadError.value = ''
    const res = await whatsappApi.getBranchSetting(props.branchId)
    applySetting(res.data)
  } catch (error: any) {
    loadError.value = error.message || 'No se pudo cargar la configuración de WhatsApp.'
  } finally {
    loading.value = false
  }
}

async function save() {
  try {
    const awayMessageError = form.awayMessageEnabled
      ? validateWhatsAppAwayMessage(form.awayMessageText)
      : null
    if (awayMessageError) {
      message.variant = 'danger'
      message.text = awayMessageError
      return
    }
    saving.value = true
    message.text = ''
    const payload: UpsertWhatsAppBranchSetting = {
      ...form,
      accessToken: form.accessToken.trim(),
      appSecret: form.appSecret.trim(),
      awayMessageText: form.awayMessageText.trim(),
    }
    const res = await whatsappApi.saveBranchSetting(props.branchId, payload)
    applySetting(res.data)
    message.variant = 'success'
    message.text = 'Configuración guardada. Prueba la conexión para habilitar la vista WhatsApp.'
    emit('saved', res.data)
  } catch (error: any) {
    message.variant = 'danger'
    message.text = error.message || 'No se pudo guardar la configuración.'
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  try {
    if (!setting.value?.id) {
      await save()
    }
    testing.value = true
    message.text = ''
    const res = await whatsappApi.testBranchConnection(props.branchId)
    if (res.data?.setting) {
      applySetting(res.data.setting)
      emit('saved', res.data.setting)
    }
    message.variant = 'success'
    message.text = res.data?.message || 'Conexión verificada correctamente.'
  } catch (error: any) {
    message.variant = 'danger'
    message.text = error.message || 'No se pudo verificar la conexión.'
    await load()
  } finally {
    testing.value = false
  }
}

async function copyWebhookUrl() {
  await navigator.clipboard?.writeText(webhookUrl)
  message.variant = 'info'
  message.text = 'URL del webhook copiada.'
}

onMounted(() => {
  void load()
})
</script>
