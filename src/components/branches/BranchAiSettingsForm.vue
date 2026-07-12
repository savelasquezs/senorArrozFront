<template>
  <BaseCard>
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CpuChipIcon class="w-6 h-6 text-indigo-600" />
            Configuracion de IA
          </h3>
          <p class="mt-1 text-sm text-gray-600">
            Configuracion del proveedor de IA para esta sucursal.
          </p>
        </div>
        <BaseBadge :variant="statusBadge.variant">{{ statusBadge.label }}</BaseBadge>
      </div>

      <BaseAlert v-if="loadError" type="error">
        <ExclamationTriangleIcon class="w-5 h-5" />
        <span>{{ loadError }}</span>
      </BaseAlert>

      <BaseLoading v-if="loading" text="Cargando configuracion de IA..." />

      <form v-else class="space-y-4" @submit.prevent="save()">
        <label class="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            :class="form.isActive ? 'bg-indigo-600' : 'bg-gray-300'"
            role="switch"
            :aria-checked="form.isActive"
            @click="form.isActive = !form.isActive"
          >
            <span
              class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
              :class="form.isActive ? 'translate-x-5' : 'translate-x-1'"
            />
          </button>
          <span>{{ form.isActive ? 'IA activa' : 'IA inactiva' }}</span>
        </label>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BaseSelect
            v-model="form.provider"
            label="Proveedor"
            :options="providerOptions"
            value-key="value"
            display-key="label"
            :searchable="false"
            required
          />
          <BaseSelect
            v-model="form.model"
            label="Modelo"
            :options="modelSelectOptions"
            value-key="id"
            display-key="label"
            :placeholder="modelsLoading ? 'Cargando modelos...' : 'Seleccionar modelo...'"
            :disabled="modelsLoading || modelSelectOptions.length === 0"
            required
          />
          <BaseInput
            v-model="form.apiKey"
            class="lg:col-span-2"
            type="password"
            label="Api Key"
            :placeholder="providerHasConfiguredKey ? 'Api Key configurada. Dejela vacia para conservarla.' : 'Api key del proveedor'"
            :required="!providerHasConfiguredKey"
            :maxlength="4096"
          />
          <div class="lg:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-gray-600">
              Carga los modelos despues de seleccionar proveedor e ingresar la Api Key.
            </p>
            <BaseButton
              type="button"
              variant="secondary"
              :loading="modelsLoading"
              :disabled="!canLoadModels"
              @click="loadModels"
            >
              Cargar modelos
            </BaseButton>
          </div>
          <BaseInput
            v-model="form.temperature"
            type="number"
            label="Temperatura"
            placeholder="0.7"
            :min="0"
            :max="2"
            step="0.1"
            hint="Opcional. Rango sugerido: 0 a 2."
          />
          <BaseInput
            v-model="form.maxContextMessages"
            type="number"
            label="Maximo mensajes de contexto"
            placeholder="20"
            required
            :min="1"
            :max="200"
          />
        </div>

        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p class="text-sm font-medium text-gray-900">Estado</p>
          <p class="mt-1 text-sm text-gray-600">{{ statusDescription }}</p>
          <p v-if="setting?.apiKeyConfigured" class="mt-2 text-xs text-gray-500">
            Api Key guardada: {{ setting.apiKeyMasked || '********' }}
          </p>
          <p
            v-if="modelMessage"
            class="mt-2 text-xs"
            :class="modelMessageType === 'error' ? 'text-red-600' : 'text-gray-500'"
          >
            {{ modelMessage }}
          </p>
        </div>

        <div class="space-y-4 border-t border-gray-200 pt-5">
          <div><h4 class="font-semibold text-gray-900">Personalidad y prompt</h4><p v-pre class="text-sm text-gray-500">Variables disponibles: {{BranchName}}, {{BranchAddress}}, {{BranchPhone}}, {{BusinessHours}}, {{Today}} y {{CurrentTime}}.</p></div>
          <BaseInput v-model="form.assistantName" label="Nombre del asistente" />
          <div v-for="field in promptFields" :key="field.key"><label class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</label><textarea v-model="form[field.key]" rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" /></div>
          <BaseInput v-model="form.transferMessage" label="Mensaje de transferencia a un asesor" />
          <BaseButton type="button" variant="outline" @click="previewPrompt">Previsualizar prompt</BaseButton>
          <pre v-if="promptPreview" class="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-900 p-4 text-xs text-gray-100">{{ promptPreview }}</pre>
        </div>

        <BaseAlert v-if="message.text" :type="message.type">
          <InformationCircleIcon v-if="message.type !== 'error'" class="w-5 h-5" />
          <ExclamationTriangleIcon v-else class="w-5 h-5" />
          <span>{{ message.text }}</span>
        </BaseAlert>

        <div class="flex flex-wrap justify-end gap-2 pt-3 border-t border-gray-100">
          <BaseButton type="button" variant="outline" :loading="testing" :disabled="saving || !canTest" @click="testConnection">
            Probar conexion
          </BaseButton>
          <BaseButton type="submit" variant="primary" :loading="saving" :disabled="testing || !canSave">
            Guardar
          </BaseButton>
        </div>
      </form>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  CpuChipIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { branchAiSettingsApi } from '@/services/MainAPI/branchAiSettingsApi'
import type { AiProviderModel, BranchAiSetting, UpsertBranchAiSetting } from '@/types/aiSettings'

const props = defineProps<{ branchId: number }>()
const emit = defineEmits<{ saved: [setting: BranchAiSetting] }>()

type BranchAiSettingsFormState = Omit<UpsertBranchAiSetting, 'apiKey'> & {
  apiKey: string
}

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
]

const setting = ref<BranchAiSetting | null>(null)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const modelsLoading = ref(false)
const loadError = ref('')
const modelMessage = ref('')
const modelMessageType = ref<'info' | 'error'>('info')
const modelOptions = ref<AiProviderModel[]>([])
const message = reactive<{ text: string; type: 'success' | 'warning' | 'error' | 'info' }>({ text: '', type: 'info' })
const promptPreview = ref('')
const promptFields = [
  { key: 'promptObjective', label: 'Objetivo' }, { key: 'promptPersonality', label: 'Personalidad' },
  { key: 'promptRequiredRules', label: 'Reglas obligatorias' }, { key: 'promptFixedBranchInfo', label: 'Información fija de la sucursal' },
  { key: 'promptAdditionalInstructions', label: 'Instrucciones adicionales' },
] as const
let suppressModelReset = false

const form = reactive<BranchAiSettingsFormState>({
  provider: 'openai',
  model: '',
  apiKey: '',
  isActive: false,
  temperature: null,
  maxContextMessages: 20,
  assistantName: '', promptObjective: '', promptPersonality: '', promptRequiredRules: '',
  promptFixedBranchInfo: '', promptAdditionalInstructions: '', transferMessage: '',
})

const providerHasConfiguredKey = computed(() =>
  !!setting.value?.apiKeyConfigured && setting.value.provider === form.provider,
)

const modelSelectOptions = computed(() =>
  modelOptions.value.map((model) => ({
    id: model.id,
    label: model.displayName && model.displayName !== model.id
      ? `${model.displayName} (${model.id})`
      : model.id,
  })),
)

const canLoadModels = computed(() =>
  !modelsLoading.value
  && !!String(form.provider).trim()
  && (!!form.apiKey.trim() || providerHasConfiguredKey.value),
)

const canSave = computed(() => {
  if (!String(form.provider).trim() || !form.model.trim() || form.maxContextMessages <= 0) return false
  if (!providerHasConfiguredKey.value && !form.apiKey.trim()) return false
  return true
})

const canTest = computed(() => canSave.value)

const statusBadge = computed(() => {
  if (!setting.value?.id) return { label: 'No configurado', variant: 'secondary' as const }
  if (!setting.value.isActive) return { label: 'Inactivo', variant: 'secondary' as const }
  if (setting.value.isVerified) return { label: 'Conectado', variant: 'success' as const }
  return { label: 'Configurado sin verificar', variant: 'warning' as const }
})

const statusDescription = computed(() => {
  if (!setting.value?.id) return 'No configurado. Guarda proveedor, modelo y credenciales para comenzar.'
  if (!setting.value.isActive) return 'Inactivo. La configuracion existe, pero no se usara hasta activarla.'
  if (setting.value.isVerified) return 'Conectado. La ultima prueba de configuracion fue correcta.'
  return 'Configurado sin verificar. Usa Probar conexion para validar los datos guardados.'
})

function applySetting(next: BranchAiSetting) {
  suppressModelReset = true
  setting.value = next
  form.provider = next.provider || 'openai'
  form.model = next.model || ''
  form.apiKey = ''
  form.isActive = next.isActive ?? false
  form.temperature = next.temperature ?? null
  form.maxContextMessages = next.maxContextMessages || 20
  form.assistantName = next.assistantName || ''; form.promptObjective = next.promptObjective || ''
  form.promptPersonality = next.promptPersonality || ''; form.promptRequiredRules = next.promptRequiredRules || ''
  form.promptFixedBranchInfo = next.promptFixedBranchInfo || ''; form.promptAdditionalInstructions = next.promptAdditionalInstructions || ''
  form.transferMessage = next.transferMessage || ''
  window.setTimeout(() => {
    suppressModelReset = false
  }, 0)
}

function clearLoadedModels(messageText = '') {
  modelOptions.value = []
  form.model = ''
  modelMessageType.value = messageText ? 'info' : modelMessageType.value
  modelMessage.value = messageText
}

function normalizeApiKeyInput(): string | null {
  const value = form.apiKey.trim()
  return value.length > 0 ? value : null
}

async function load() {
  try {
    loading.value = true
    loadError.value = ''
    message.text = ''
    const res = await branchAiSettingsApi.getBranchSetting(props.branchId)
    applySetting(res.data)
    if (providerHasConfiguredKey.value) {
      await loadModels()
    }
  } catch (error: any) {
    loadError.value = error.message || 'No se pudo cargar la configuracion de IA.'
  } finally {
    loading.value = false
  }
}

async function loadModels() {
  const provider = String(form.provider).trim()
  if (!provider) return

  if (!form.apiKey.trim() && !providerHasConfiguredKey.value) {
    modelOptions.value = []
    modelMessageType.value = 'info'
    modelMessage.value = 'Ingresa una Api Key para consultar los modelos disponibles del proveedor seleccionado.'
    return
  }

  try {
    modelsLoading.value = true
    modelMessage.value = ''
    modelMessageType.value = 'info'
    const apiKey = normalizeApiKeyInput()
    const res = await branchAiSettingsApi.getProviderModels(props.branchId, {
      provider,
      ...(apiKey ? { apiKey } : {}),
    })
    modelOptions.value = res.data?.models ?? []

    if (modelOptions.value.length === 0) {
      modelMessageType.value = 'error'
      modelMessage.value = 'El proveedor no retorno modelos disponibles para esta Api Key.'
      form.model = ''
      return
    }

    const selectedStillExists = modelOptions.value.some((model) => model.id === form.model)
    if (!selectedStillExists) {
      form.model = ''
    }
    modelMessageType.value = 'info'
    modelMessage.value = `${modelOptions.value.length} modelos cargados. Selecciona uno para guardar.`
  } catch (error: any) {
    modelOptions.value = []
    form.model = ''
    modelMessageType.value = 'error'
    modelMessage.value = error.message || 'No se pudieron consultar los modelos disponibles.'
  } finally {
    modelsLoading.value = false
  }
}

async function save(options: { quiet?: boolean } = {}): Promise<BranchAiSetting | null> {
  try {
    saving.value = true
    if (!options.quiet) message.text = ''
    const payload: UpsertBranchAiSetting = {
      provider: String(form.provider).trim(),
      model: form.model.trim(),
      apiKey: normalizeApiKeyInput(),
      isActive: form.isActive,
      temperature: form.temperature,
      maxContextMessages: Number(form.maxContextMessages || 20),
      assistantName: form.assistantName, promptObjective: form.promptObjective, promptPersonality: form.promptPersonality,
      promptRequiredRules: form.promptRequiredRules, promptFixedBranchInfo: form.promptFixedBranchInfo,
      promptAdditionalInstructions: form.promptAdditionalInstructions, transferMessage: form.transferMessage,
    }
    const res = await branchAiSettingsApi.saveBranchSetting(props.branchId, payload)
    applySetting(res.data)
    emit('saved', res.data)
    if (!options.quiet) {
      message.type = 'success'
      message.text = 'Configuracion de IA guardada.'
    }
    return res.data
  } catch (error: any) {
    message.type = 'error'
    message.text = error.message || 'No se pudo guardar la configuracion.'
    return null
  } finally {
    saving.value = false
  }
}

async function previewPrompt() {
  const saved = await save({ quiet: true }); if (!saved) return
  try { promptPreview.value = (await branchAiSettingsApi.getPromptPreview(props.branchId)).data.prompt }
  catch (error: any) { message.type = 'error'; message.text = error.message || 'No se pudo generar la previsualización.' }
}

async function testConnection() {
  const saved = await save({ quiet: true })
  if (!saved) return

  try {
    testing.value = true
    message.text = ''
    const res = await branchAiSettingsApi.testBranchConnection(props.branchId)
    if (res.data?.setting) {
      applySetting(res.data.setting)
      emit('saved', res.data.setting)
    }
    message.type = 'success'
    message.text = res.data?.message || 'Conexion validada correctamente.'
  } catch (error: any) {
    message.type = 'error'
    message.text = error.message || 'No se pudo validar la conexion.'
    await load()
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  void load()
})

watch(() => props.branchId, () => {
  void load()
})

watch(() => form.provider, () => {
  if (suppressModelReset) return
  clearLoadedModels('Proveedor cambiado. Carga los modelos disponibles para continuar.')
})

watch(() => form.apiKey, () => {
  if (suppressModelReset) return
  clearLoadedModels('Api Key modificada. Vuelve a cargar modelos para usar la nueva credencial.')
})
</script>
