<template>
  <MainLayout>
    <section class="mx-auto max-w-6xl space-y-6">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Canal central · Tenant 1</p>
        <h1 class="mt-1 text-2xl font-bold text-gray-950">WhatsApp Commerce y Flow</h1>
        <p class="mt-2 max-w-3xl text-sm text-gray-500">El número atiende todas las sedes. La sede operativa se asigna únicamente al cotizar el domicilio o elegir recogida.</p>
      </div>

      <div v-if="loading" class="h-56 animate-pulse rounded-2xl bg-gray-100" />
      <template v-else>
        <div v-if="message" class="rounded-xl border px-4 py-3 text-sm" :class="message.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'">
          {{ message.text }}
        </div>

        <article class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-950">Meta WhatsApp Cloud API</h2>
              <p class="mt-1 text-sm text-gray-500">Las credenciales antiguas por sede se conservan solo para rollback.</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="channel.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'">
              {{ channel.isVerified ? 'Conexión verificada' : 'Pendiente de verificar' }}
            </span>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <BaseInput v-model="channel.phoneNumberId" label="Phone Number ID" required />
            <BaseInput v-model="channel.businessAccountId" label="Business Account ID" required />
            <BaseInput v-model="channel.displayPhoneNumber" label="Número visible" required />
            <BaseInput v-model="channel.flowId" label="Flow ID publicado en Meta" />
            <BaseInput v-model="channel.accessToken" type="password" label="Access Token" :placeholder="settings?.channel?.accessTokenConfigured ? 'Dejar vacío para conservar' : ''" />
            <BaseInput v-model="channel.appSecret" type="password" label="Clave secreta de la app (App Secret)" :placeholder="settings?.channel?.appSecretConfigured ? 'Dejar vacío para conservar' : 'Clave de 32 caracteres de Meta; no el ID de la app'" />
            <BaseInput v-model="channel.webhookVerifyToken" label="Webhook Verify Token" required />
          </div>

          <div class="mt-5 rounded-xl bg-gray-50 p-4 text-sm">
            <p class="font-medium text-gray-700">Data Exchange URL</p>
            <p class="mt-1 break-all font-mono text-xs text-gray-600">{{ settings?.dataExchangeUrl || 'Se genera al guardar el canal' }}</p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span :class="statusPill(settings?.flowEnvironmentEnabled)">Entorno habilitado</span>
              <span :class="statusPill(settings?.privateKeyConfigured)">Clave privada configurada</span>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-5">
            <label class="flex items-center gap-2 text-sm text-gray-700"><input v-model="channel.isActive" type="checkbox" class="rounded border-gray-300 text-emerald-600"> Canal activo</label>
            <label class="flex items-center gap-2 text-sm text-gray-700"><input v-model="channel.flowEnabled" type="checkbox" class="rounded border-gray-300 text-emerald-600"> FlowEnabled</label>
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <BaseButton :loading="savingChannel" @click="saveChannel">Guardar canal</BaseButton>
            <BaseButton variant="secondary" :loading="testing" @click="testChannel">Probar conexión</BaseButton>
          </div>
        </article>

        <article class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-950">IA central</h2>
              <p class="mt-1 text-sm text-gray-500">Opcional: responde consultas fuera del menú. El Flow funciona también con la IA apagada y durante atención humana. Un saludo o «pedido» muestra el botón del menú.</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="ai.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'">{{ ai.isVerified ? 'Verificada' : 'Sin verificar' }}</span>
          </div>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <BaseInput v-model="ai.provider" label="Proveedor" required />
            <BaseInput v-model="ai.model" label="Modelo" required />
            <BaseInput v-model="ai.assistantName" label="Nombre del asistente" />
            <BaseInput v-model="ai.maxContextMessages" type="number" label="Mensajes de contexto" :min="1" :max="100" />
          </div>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <label v-for="field in promptFields" :key="field.key" class="text-sm font-medium text-gray-700">
              {{ field.label }}
              <textarea v-model="ai[field.key]" rows="4" class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </label>
          </div>
          <label class="mt-4 flex items-center gap-2 text-sm text-gray-700"><input v-model="ai.isActive" type="checkbox" class="rounded border-gray-300 text-emerald-600"> IA activa</label>
          <div class="mt-5 flex flex-wrap gap-3">
            <BaseButton :loading="savingAi" @click="saveAi">Guardar IA central</BaseButton>
            <BaseButton variant="secondary" :loading="testingAi" @click="testAi">Probar IA</BaseButton>
          </div>
        </article>
      </template>
    </section>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { TenantAiSetting, TenantWhatsAppSettings, UpdateTenantWhatsAppChannel } from '@/types/whatsapp'

const loading = ref(true)
const savingChannel = ref(false)
const savingAi = ref(false)
const testing = ref(false)
const testingAi = ref(false)
const settings = ref<TenantWhatsAppSettings | null>(null)
const message = ref<{ text: string; error: boolean } | null>(null)
type ChannelForm = Omit<UpdateTenantWhatsAppChannel, 'accessToken' | 'appSecret' | 'flowId'> & { accessToken: string; appSecret: string; flowId: string; isVerified: boolean }
type PromptField = 'promptObjective' | 'promptPersonality' | 'promptRequiredRules' | 'promptFixedBranchInfo' | 'promptAdditionalInstructions' | 'transferMessage'
const channel = reactive<ChannelForm>({ phoneNumberId: '', businessAccountId: '', displayPhoneNumber: '', accessToken: '', webhookVerifyToken: '', appSecret: '', flowId: '', isActive: false, flowEnabled: false, isVerified: false })
const ai = reactive<TenantAiSetting>({ provider: 'openai', model: '', isActive: false, isVerified: false, temperature: null, maxContextMessages: 20, assistantName: '', promptObjective: '', promptPersonality: '', promptRequiredRules: '', promptFixedBranchInfo: '', promptAdditionalInstructions: '', transferMessage: 'Un asesor continuará con tu atención.' })
const promptFields: { key: PromptField; label: string }[] = [
  { key: 'promptObjective', label: 'Objetivo' },
  { key: 'promptPersonality', label: 'Personalidad' },
  { key: 'promptRequiredRules', label: 'Reglas obligatorias' },
  { key: 'promptFixedBranchInfo', label: 'Información fija' },
  { key: 'promptAdditionalInstructions', label: 'Instrucciones adicionales' },
  { key: 'transferMessage', label: 'Mensaje de transferencia' },
]

function apply(value: TenantWhatsAppSettings) {
  settings.value = value
  if (value.channel) Object.assign(channel, value.channel, { accessToken: '', appSecret: '' })
  if (value.ai) Object.assign(ai, value.ai)
}
async function load() {
  loading.value = true
  try { apply((await whatsappApi.getTenantSettings()).data) }
  catch (error: any) { message.value = { text: error.message, error: true } }
  finally { loading.value = false }
}
async function saveChannel() {
  savingChannel.value = true; message.value = null
  try {
    const { isVerified: _, ...payload } = channel
    await whatsappApi.saveTenantChannel(payload)
    message.value = { text: 'Canal central guardado.', error: false }
    await load()
  }
  catch (error: any) { message.value = { text: error.message, error: true } }
  finally { savingChannel.value = false }
}
async function testChannel() {
  testing.value = true; message.value = null
  try { await whatsappApi.testTenantChannel(); message.value = { text: 'Meta verificó el canal central.', error: false }; await load() }
  catch (error: any) { message.value = { text: error.message, error: true } }
  finally { testing.value = false }
}
async function saveAi() {
  savingAi.value = true; message.value = null
  try { await whatsappApi.saveTenantAi({ ...ai }); message.value = { text: 'IA central guardada.', error: false }; await load() }
  catch (error: any) { message.value = { text: error.message, error: true } }
  finally { savingAi.value = false }
}
async function testAi() {
  testingAi.value = true; message.value = null
  try { await whatsappApi.testTenantAi(); message.value = { text: 'Proveedor y modelo de IA verificados.', error: false }; await load() }
  catch (error: any) { message.value = { text: error.message, error: true } }
  finally { testingAi.value = false }
}
const statusPill = (ready?: boolean) => ready ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800' : 'rounded-full bg-red-100 px-2.5 py-1 text-red-700'
onMounted(load)
</script>
