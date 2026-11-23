<template>
  <BaseDialog :model-value="true" :title="`Hacer pedido a ${supplierName}`" size="xl" scroll-body :dismissible="!sendingTemplate"
    @update:model-value="emit('close')">
    <form v-if="!preview" id="whatsapp-supplier-order" class="space-y-3" @submit.prevent="prepare">
      <p v-if="loading" role="status" class="text-sm text-gray-500">Consultando artículos frecuentes…</p>
      <p v-else-if="loadError" role="alert" class="text-sm text-red-700">
        {{ loadError }} <button type="button" class="underline" @click="load">Reintentar</button>
      </p>
      <p v-else-if="!favorites.length" class="text-sm text-gray-500">Este proveedor todavía no tiene artículos frecuentes.</p>
      <div v-for="line in lines" :key="line.manual ? `manual-${line.id}` : line.id"
        class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.75rem] items-center gap-2 border-b border-gray-200 pb-2 sm:grid-cols-[minmax(0,1.5fr)_7rem_minmax(0,1fr)_1.75rem]">
        <div class="col-span-2 min-w-0 sm:col-span-1">
          <BaseInput v-if="line.manual" v-model="line.name" size="sm" placeholder="Artículo"
            aria-label="Nombre del artículo manual" :maxlength="160" />
          <p v-else class="text-sm font-medium">{{ line.name }} <span class="text-xs font-normal text-gray-500">· {{ line.unit }}</span></p>
        </div>
        <BaseInput v-model="line.quantity" class="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1"
          size="sm" inputmode="decimal" placeholder="Cantidad" :aria-label="`Cantidad de ${line.name || 'artículo manual'}`" :maxlength="24" />
        <BaseInput v-model="line.note" class="col-start-2 row-start-2 min-w-0 sm:col-start-3 sm:row-start-1"
          size="sm" placeholder="Nota opcional" :aria-label="`Nota de ${line.name || 'artículo manual'}`" :maxlength="240" />
        <button v-if="line.custom" type="button" :aria-label="`Quitar ${line.name || 'artículo manual'}`" title="Quitar artículo"
          class="col-start-3 row-start-1 flex size-7 items-center justify-center rounded text-gray-600 hover:bg-gray-100 focus-visible:outline-emerald-600 sm:col-start-4"
          @click="removeLine(line)">
          <XMarkIcon class="size-4" aria-hidden="true" />
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="outline" size="sm" :aria-expanded="showCatalog" @click="toggleCatalog">
          {{ showCatalog ? 'Ocultar catálogo' : 'Ver todos' }}
        </BaseButton>
        <BaseButton type="button" variant="outline" size="sm" @click="addLine">Agregar artículo manual</BaseButton>
      </div>
      <div v-if="showCatalog">
        <p v-if="loadingCatalog" role="status" class="text-sm text-gray-500">Consultando el catálogo de Gastos…</p>
        <p v-else-if="catalogError" role="alert" class="text-sm text-red-700">
          {{ catalogError }} <button type="button" class="underline" @click="loadCatalog">Reintentar</button>
        </p>
        <BaseSelect v-else :model-value="null" :options="catalogOptions" label="Artículo del catálogo"
          placeholder="Buscar y agregar un artículo" inline-dropdown @update:model-value="addCatalogLine" />
      </div>
      <label class="block text-sm font-medium">
        Nota del pedido
        <textarea v-model="note" rows="2" maxlength="1000" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" />
      </label>
    </form>
    <div v-else class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-gray-600">{{ windowOpen ? 'Ventana de atención abierta.' : 'Ventana de 24 horas cerrada.' }}</p>
        <BaseButton v-if="windowOpen" variant="ghost" size="sm" :disabled="sendingTemplate" @click="preferTemplate = !preferTemplate">
          {{ preferTemplate ? 'Usar texto del chat' : 'Usar plantilla de proveedor' }}
        </BaseButton>
      </div>
      <label v-if="usingTemplate" class="block text-sm font-medium">
        Entrega para
        <BaseInput v-model="delivery" :maxlength="160" :disabled="sendingTemplate" aria-label="Entrega para" />
      </label>
      <label class="block text-sm font-medium">
        Vista previa
        <textarea ref="previewInput" :value="activePreview" readonly rows="9" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" />
      </label>
      <p v-if="loadingTemplate && templateMode" class="text-sm text-gray-600" role="status">Consultando la plantilla de pedido…</p>
      <p v-else-if="templateMode && templateError" class="text-sm text-red-700" role="alert">
        {{ templateError }} <button type="button" class="underline" @click="loadTemplate">Reintentar</button>
      </p>
      <p v-else-if="usingTemplate && templatePreview.length > 1024" class="text-sm text-red-700">Acorta el pedido para enviarlo como plantilla.</p>
      <p v-else-if="templateMode && !usingTemplate" class="text-sm text-gray-600">La plantilla de pedido no está disponible en esta línea.</p>
      <p v-else-if="usingTemplate && !templateBranchName" class="text-sm text-gray-600">Selecciona una sucursal de trabajo para completar la plantilla.</p>
      <p v-if="usingTemplate && !canWriteTemplate" class="text-sm text-gray-600">La conversación está a cargo de otro asesor o ya no está disponible.</p>
      <p v-else-if="!templateMode && !canInsert" class="text-sm text-gray-600">Puedes usar la plantilla de proveedor para enviar el pedido desde aquí.</p>
      <p v-if="copied" role="status" class="text-sm text-emerald-700">Mensaje copiado.</p>
    </div>
    <p v-if="formError || composerError" role="alert" class="mt-3 text-sm text-red-700">{{ formError || composerError }}</p>
    <template #footer>
      <template v-if="preview">
        <BaseButton variant="secondary" :disabled="sendingTemplate" @click="edit">Editar artículos</BaseButton>
        <BaseButton variant="outline" :disabled="!canCopy" @click="copy">Copiar mensaje</BaseButton>
        <BaseButton v-if="!templateMode && canInsert" :disabled="sendingTemplate" @click="emit('prepare', conversationId, preview)">Pasar al chat</BaseButton>
        <BaseButton v-if="templateMode" :disabled="!canSendTemplate"
          :loading="sendingTemplate" @click="sendTemplate">Enviar plantilla</BaseButton>
      </template>
      <BaseButton v-else type="submit" form="whatsapp-supplier-order">Preparar mensaje</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { supplierOrderMessage, supplierOrderTemplateLanguage, supplierOrderTemplateName, supplierOrderTemplateProducts,
  type SupplierOrderLine } from '@/helpers/whatsappSupplierOrder'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'
import type { Expense } from '@/types/expense'
import type { WhatsAppMessage } from '@/types/whatsapp'
import { generatePosCreationKey } from '@/utils/posCreationKey'
import { whatsappTemplateBody } from '@/utils/whatsappInbox'

const props = defineProps<{
  conversationId: number
  supplierName: string
  canInsert: boolean
  windowOpen: boolean
  composerError: string
  templateBranchName?: string
  canWriteTemplate: boolean
}>()
const emit = defineEmits<{
  close: []
  prepare: [conversationId: number, message: string]
  sent: [conversationId: number, message: WhatsAppMessage]
}>()
type OrderLine = SupplierOrderLine & { id: number; manual?: boolean }
const favorites = ref<OrderLine[]>([])
const catalogLines = ref<OrderLine[]>([])
const extra = ref<OrderLine[]>([])
const lines = computed(() => [...favorites.value, ...catalogLines.value, ...extra.value])
const catalog = ref<Expense[] | null>(null)
const showCatalog = ref(false)
const loadingCatalog = ref(false)
const catalogError = ref('')
const catalogOptions = computed(() => {
  const used = new Set([...favorites.value, ...catalogLines.value].map(item => item.id))
  return (catalog.value ?? []).filter(item => !used.has(item.id))
    .map(item => ({ id: item.id, name: `${item.name} · ${item.unitDisplay}`, description: item.categoryName }))
})
const note = ref('')
const preview = ref('')
const preferTemplate = ref(props.windowOpen && props.canWriteTemplate && !props.canInsert)
const templateBody = ref('')
const templateProducts = ref('')
const templateError = ref('')
const delivery = ref('')
const loadingTemplate = ref(false)
const sendingTemplate = ref(false)
const templateParameters = computed(() => [
  templateProducts.value, props.templateBranchName?.trim() ?? '', delivery.value.trim(),
])
const templatePreview = computed(() => templateBody.value.replace(/\{\{\s*(\d+)\s*\}\}/g,
  (_, index) => templateParameters.value[Number(index) - 1] || (index === '2' ? '«sucursal»' : '«entrega»')))
const templateMode = computed(() => !props.windowOpen || preferTemplate.value)
const usingTemplate = computed(() => templateMode.value && !!templateBody.value)
const activePreview = computed(() => usingTemplate.value ? templatePreview.value : preview.value)
const canCopy = computed(() => !sendingTemplate.value && (!usingTemplate.value || !!delivery.value.trim()))
const canSendTemplate = computed(() => usingTemplate.value && props.canWriteTemplate && !sendingTemplate.value
  && templateParameters.value.every(Boolean) && templatePreview.value.length <= 1024)
let sendRequest: { parameters: string; key: string } | undefined
let disposed = false
const previewInput = ref<HTMLTextAreaElement>()
const loading = ref(false)
const copied = ref(false)
const formError = ref('')
const loadError = ref('')
const units: Record<string, string> = { Unit: 'und.', Kilo: 'kg', Package: 'paq.', Pound: 'lb', Gallon: 'gal' }
let request: AbortController | undefined
let catalogRequest: AbortController | undefined
let nextId = 0

async function load() {
  request?.abort()
  const controller = request = new AbortController()
  loading.value = true
  loadError.value = ''
  try {
    const response = await whatsappApi.getConversationSupplierItems(props.conversationId, controller.signal)
    if (controller.signal.aborted) return
    const added = new Map(catalogLines.value.map(line => [line.id, line]))
    favorites.value = (response.data ?? []).map(item => ({
      id: item.expenseId, name: item.expenseName, unit: units[item.expenseUnit] ?? item.expenseUnit,
      quantity: added.get(item.expenseId)?.quantity ?? '', note: added.get(item.expenseId)?.note ?? '',
    }))
    const favoriteIds = new Set(favorites.value.map(line => line.id))
    catalogLines.value = catalogLines.value.filter(line => !favoriteIds.has(line.id))
  } catch (cause) {
    if (!controller.signal.aborted) loadError.value = cause instanceof Error ? cause.message : 'No se pudieron consultar los artículos.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function toggleCatalog() {
  showCatalog.value = !showCatalog.value
  if (showCatalog.value && !catalog.value && !loadingCatalog.value) void loadCatalog()
}

async function loadCatalog() {
  const controller = catalogRequest = new AbortController()
  loadingCatalog.value = true
  catalogError.value = ''
  try {
    const response = await expenseApi.getAllExpenses(controller.signal)
    if (controller.signal.aborted) return
    if (!response.isSuccess) throw new Error(response.message || 'No se pudo consultar el catálogo de Gastos.')
    catalog.value = response.data ?? []
  } catch (cause) {
    if (!controller.signal.aborted) catalogError.value = cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo de Gastos.'
  } finally {
    if (!controller.signal.aborted) loadingCatalog.value = false
  }
}

function addCatalogLine(id: number) {
  if (!catalogOptions.value.some(option => option.id === id)) return
  const item = catalog.value?.find(item => item.id === id)
  if (!item) return
  catalogLines.value.push({ id, name: item.name, unit: units[item.unit] ?? item.unitDisplay, quantity: '', note: '', custom: true })
}

function removeLine(line: OrderLine) {
  const group = line.manual ? extra : catalogLines
  group.value = group.value.filter(item => item.id !== line.id)
}

function addLine() {
  extra.value.push({ id: ++nextId, name: '', quantity: '', note: '', custom: true, manual: true })
}

function prepare() {
  formError.value = ''
  try {
    preview.value = supplierOrderMessage(lines.value, note.value)
    templateProducts.value = supplierOrderTemplateProducts(lines.value, note.value)
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'No se pudo preparar el pedido.'
  }
}

async function loadTemplate() {
  loadingTemplate.value = true
  templateError.value = ''
  try {
    const response = await whatsappApi.getConversationTemplates(props.conversationId)
    const template = response.data?.find(item => item.name === supplierOrderTemplateName
      && item.language === supplierOrderTemplateLanguage)
    if (!disposed && template) templateBody.value = whatsappTemplateBody(template.componentsJson)
  } catch (cause) {
    if (!disposed) templateError.value = cause instanceof Error ? cause.message : 'No se pudo consultar la plantilla.'
  } finally {
    loadingTemplate.value = false
  }
}

async function sendTemplate() {
  if (!canSendTemplate.value) return
  sendingTemplate.value = true
  formError.value = ''
  const parameters = templateParameters.value
  const payload = JSON.stringify(parameters)
  if (sendRequest?.parameters !== payload) sendRequest = { parameters: payload, key: generatePosCreationKey() }
  try {
    const response = await whatsappApi.sendConversationTemplate(props.conversationId,
      supplierOrderTemplateName, supplierOrderTemplateLanguage, parameters, sendRequest.key)
    if (disposed) return
    if (!response.data) throw new Error('No se pudo confirmar el envío. Revisa el chat antes de repetirlo.')
    emit('sent', props.conversationId, response.data)
    emit('close')
  } catch (cause) {
    if (!disposed) formError.value = cause instanceof Error ? cause.message : 'No se pudo confirmar el envío.'
  } finally {
    sendingTemplate.value = false
  }
}

function edit() {
  preview.value = ''
  copied.value = false
  formError.value = ''
}

async function copy() {
  if (!canCopy.value) return
  formError.value = ''
  try {
    await navigator.clipboard.writeText(activePreview.value)
    copied.value = true
  } catch {
    previewInput.value?.focus()
    previewInput.value?.select()
    formError.value = 'Copia el texto seleccionado.'
  }
}

watch([preview, templateMode], ([text, needsTemplate]) => {
  if (text && needsTemplate && !templateBody.value && !loadingTemplate.value) void loadTemplate()
})
onMounted(load)
onBeforeUnmount(() => {
  disposed = true
  request?.abort()
  catalogRequest?.abort()
})
</script>
