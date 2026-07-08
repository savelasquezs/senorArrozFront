<template>
  <MainLayout no-card>
    <div class="h-full min-h-0 bg-gray-50 flex flex-col">
      <div class="border-b border-gray-200 bg-white px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Plantillas WhatsApp</h1>
          <p class="text-sm text-gray-500">Sincroniza y envía plantillas aprobadas de Meta.</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <select
            v-if="showBranchFilter"
            v-model.number="selectedBranchId"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            @change="reloadAll"
          >
            <option :value="0">Configuración global</option>
            <option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">{{ branch.label }}</option>
          </select>
          <input
            v-model="search"
            type="search"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            placeholder="Buscar plantilla"
            @input="loadTemplates"
          />
          <BaseButton :loading="syncing" @click="syncTemplates">Sincronizar plantillas</BaseButton>
        </div>
      </div>

      <div v-if="loadingStatus" class="flex-1 grid place-items-center">
        <BaseLoading text="Consultando WhatsApp..." />
      </div>

      <div v-else-if="!whatsappStore.enabled" class="flex-1 grid place-items-center p-6">
        <div class="max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h2 class="text-lg font-semibold text-gray-900">WhatsApp aún no está configurado</h2>
          <p class="mt-2 text-sm text-gray-600">Configura y verifica una sucursal antes de usar plantillas.</p>
        </div>
      </div>

      <div v-else class="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section class="min-h-0 border-r border-gray-200 bg-white flex flex-col">
          <div class="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-800">Plantillas aprobadas</span>
            <span class="text-xs text-gray-500">{{ templates.length }} disponibles</span>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100">
            <button
              v-for="template in templates"
              :key="template.id"
              type="button"
              class="w-full px-4 py-3 text-left hover:bg-gray-50"
              :class="selectedTemplate?.id === template.id ? 'bg-emerald-50' : 'bg-white'"
              @click="selectTemplate(template)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-gray-900">{{ template.name }}</p>
                  <p class="mt-1 text-xs text-gray-500">{{ template.language }} · {{ template.category }}</p>
                </div>
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusClass(template.status)">
                  {{ template.status }}
                </span>
              </div>
              <p class="mt-2 line-clamp-2 text-sm text-gray-600">{{ bodyText(template) || 'Sin cuerpo de texto' }}</p>
              <p class="mt-1 text-xs text-gray-400">{{ template.bodyParameterCount }} parámetro(s)</p>
            </button>

            <div v-if="!loadingTemplates && templates.length === 0" class="p-6 text-center text-sm text-gray-500">
              No hay plantillas aprobadas. Sincroniza desde Meta.
            </div>
            <div v-if="loadingTemplates" class="p-6">
              <BaseLoading text="Cargando plantillas..." />
            </div>
          </div>
        </section>

        <aside class="min-h-0 bg-white flex flex-col">
          <div class="border-b border-gray-100 px-4 py-3">
            <p class="text-sm font-semibold text-gray-900">Enviar plantilla</p>
            <p v-if="selectedTemplate" class="mt-1 text-xs text-gray-500">{{ selectedTemplate.name }} · {{ selectedTemplate.language }}</p>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            <div v-if="!selectedTemplate" class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Selecciona una plantilla aprobada para enviar una prueba o a clientes.
            </div>

            <template v-else>
              <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Vista previa</p>
                <p class="mt-2 whitespace-pre-wrap text-sm text-gray-800">{{ renderedPreview }}</p>
              </div>

              <label class="block text-sm font-medium text-gray-700">
                Número manual
                <input
                  v-model="manualTo"
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="573001234567"
                />
              </label>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Buscar clientes</label>
                <input
                  v-model="customerSearch"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Nombre o teléfono"
                  @input="loadCustomers"
                />
                <div class="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  <label
                    v-for="customer in customers"
                    :key="customer.id"
                    class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <input v-model="selectedCustomerIds" type="checkbox" :value="customer.id" class="h-4 w-4 rounded border-gray-300 text-emerald-600" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-medium text-gray-800">{{ customer.name }}</span>
                      <span class="block truncate text-xs text-gray-500">{{ customer.phone1 }}</span>
                    </span>
                  </label>
                  <div v-if="!loadingCustomers && customers.length === 0" class="px-3 py-3 text-sm text-gray-500">
                    Sin resultados.
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-sm font-medium text-gray-700">Parámetros</p>
                <input
                  v-for="(_, index) in parameters"
                  :key="index"
                  v-model="parameters[index]"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                  :placeholder="`Parámetro ${index + 1}`"
                />
                <p v-if="parameters.length === 0" class="text-xs text-gray-500">Esta plantilla no requiere parámetros.</p>
              </div>

              <p v-if="sendError" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ sendError }}</p>
              <p v-if="sendResult" class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Enviadas: {{ sendResult.sentCount }} · Fallidas: {{ sendResult.failedCount }}
              </p>
            </template>
          </div>

          <div class="border-t border-gray-200 p-4">
            <BaseButton class="w-full" :disabled="!selectedTemplate || sending" :loading="sending" @click="sendTemplate">
              Enviar plantilla
            </BaseButton>
          </div>
        </aside>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { customerApi } from '@/services/MainAPI/customerApi'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import { useToast } from '@/composables/useToast'
import { useWhatsAppStore } from '@/store/whatsapp'
import type { Customer } from '@/types/customer'
import type { WhatsAppTemplate, WhatsAppTemplateSendResult } from '@/types/whatsapp'

const whatsappStore = useWhatsAppStore()
const { success, error: showError } = useToast()

const loadingStatus = ref(true)
const loadingTemplates = ref(false)
const loadingCustomers = ref(false)
const syncing = ref(false)
const sending = ref(false)
const selectedBranchId = ref(0)
const search = ref('')
const customerSearch = ref('')
const templates = ref<WhatsAppTemplate[]>([])
const selectedTemplate = ref<WhatsAppTemplate | null>(null)
const manualTo = ref('')
const customers = ref<Customer[]>([])
const selectedCustomerIds = ref<number[]>([])
const parameters = ref<string[]>([])
const sendError = ref('')
const sendResult = ref<WhatsAppTemplateSendResult | null>(null)
let customerSearchTimeout: number | undefined
let templateSearchTimeout: number | undefined

const showBranchFilter = computed(() => whatsappStore.enabledBranchIds.length > 1)
const branchOptions = computed(() => whatsappStore.enabledBranchIds.map(id => ({ id, label: `Sucursal ${id}` })))

const renderedPreview = computed(() => {
  if (!selectedTemplate.value) return ''
  let text = bodyText(selectedTemplate.value) || selectedTemplate.value.name
  parameters.value.forEach((value, index) => {
    text = text.replace(new RegExp(`{{\\s*${index + 1}\\s*}}`, 'g'), value || `{{${index + 1}}}`)
  })
  return text
})

async function reloadAll() {
  await Promise.all([loadTemplates(), loadCustomers()])
}

async function loadTemplates() {
  window.clearTimeout(templateSearchTimeout)
  templateSearchTimeout = window.setTimeout(async () => {
    try {
      loadingTemplates.value = true
      const res = await whatsappApi.getTemplates({
        branchId: selectedBranchId.value || undefined,
        status: 'APPROVED',
        search: search.value.trim() || undefined,
      })
      templates.value = res.data ?? []
      if (selectedTemplate.value && !templates.value.some(x => x.id === selectedTemplate.value?.id)) {
        selectedTemplate.value = null
        parameters.value = []
      }
    } catch (error: any) {
      showError('Plantillas', error.message || 'No se pudieron cargar las plantillas.')
    } finally {
      loadingTemplates.value = false
    }
  }, 250)
}

async function syncTemplates() {
  try {
    syncing.value = true
    const res = await whatsappApi.syncTemplates(selectedBranchId.value || null)
    const data = res.data
    success('Plantillas sincronizadas', 2500, `Sincronizadas: ${data?.synced ?? 0}`)
    await loadTemplatesNow()
  } catch (error: any) {
    showError('Meta WhatsApp', error.message || 'No se pudieron sincronizar las plantillas.')
  } finally {
    syncing.value = false
  }
}

async function loadTemplatesNow() {
  window.clearTimeout(templateSearchTimeout)
  loadingTemplates.value = true
  try {
    const res = await whatsappApi.getTemplates({
      branchId: selectedBranchId.value || undefined,
      status: 'APPROVED',
      search: search.value.trim() || undefined,
    })
    templates.value = res.data ?? []
  } finally {
    loadingTemplates.value = false
  }
}

function selectTemplate(template: WhatsAppTemplate) {
  selectedTemplate.value = template
  parameters.value = Array.from({ length: template.bodyParameterCount }, () => '')
  sendError.value = ''
  sendResult.value = null
}

function loadCustomers() {
  window.clearTimeout(customerSearchTimeout)
  customerSearchTimeout = window.setTimeout(async () => {
    try {
      loadingCustomers.value = true
      const res = await customerApi.getCustomers({
        branchId: selectedBranchId.value || whatsappStore.enabledBranchIds[0],
        name: customerSearch.value.trim() || undefined,
        active: true,
        page: 1,
        pageSize: 20,
      })
      customers.value = res.data?.items ?? []
    } catch {
      customers.value = []
    } finally {
      loadingCustomers.value = false
    }
  }, 300)
}

async function sendTemplate() {
  if (!selectedTemplate.value) return
  sendError.value = ''
  sendResult.value = null

  if (!manualTo.value.trim() && selectedCustomerIds.value.length === 0) {
    sendError.value = 'Ingresa un número manual o selecciona al menos un cliente.'
    return
  }

  try {
    sending.value = true
    const res = await whatsappApi.sendTemplate({
      branchId: selectedBranchId.value || selectedTemplate.value.branchId || whatsappStore.enabledBranchIds[0] || null,
      to: manualTo.value.trim() || undefined,
      customerIds: selectedCustomerIds.value,
      templateName: selectedTemplate.value.name,
      language: selectedTemplate.value.language,
      parameters: parameters.value,
    })
    sendResult.value = res.data
    success('Plantilla enviada', 2500)
  } catch (error: any) {
    sendError.value = error.message || 'No se pudo enviar la plantilla.'
  } finally {
    sending.value = false
  }
}

function bodyText(template: WhatsAppTemplate) {
  try {
    const components = JSON.parse(template.components || '[]')
    const body = Array.isArray(components)
      ? components.find((component: any) => String(component?.type || '').toUpperCase() === 'BODY')
      : null
    return String(body?.text || '')
  } catch {
    return ''
  }
}

function statusClass(status: string) {
  return String(status).toUpperCase() === 'APPROVED'
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-gray-100 text-gray-700'
}

onMounted(async () => {
  try {
    await whatsappStore.ensureStatus(0)
    selectedBranchId.value = whatsappStore.enabledBranchIds[0] || 0
    if (whatsappStore.enabled) {
      await Promise.all([loadTemplatesNow(), new Promise<void>((resolve) => { loadCustomers(); window.setTimeout(resolve, 350) })])
    }
  } finally {
    loadingStatus.value = false
  }
})
</script>
