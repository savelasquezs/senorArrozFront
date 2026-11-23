<template>
  <BaseDialog :model-value="true" :title="`Hacer pedido a ${supplierName}`" size="xl" scroll-body
    @update:model-value="emit('close')">
    <form v-if="!preview" id="whatsapp-supplier-order" class="space-y-3" @submit.prevent="prepare">
      <p v-if="loading" role="status" class="text-sm text-gray-500">Consultando artículos frecuentes…</p>
      <p v-else-if="loadError" role="alert" class="text-sm text-red-700">
        {{ loadError }} <button type="button" class="underline" @click="load">Reintentar</button>
      </p>
      <p v-else-if="!favorites.length" class="text-sm text-gray-500">Este proveedor todavía no tiene artículos frecuentes.</p>
      <div v-for="line in favorites" :key="line.id" class="grid gap-2 border-b border-gray-200 pb-2 sm:grid-cols-[1fr_7rem_1fr] sm:items-center">
        <p class="text-sm font-medium">{{ line.name }} <span class="text-xs font-normal text-gray-500">· {{ line.unit }}</span></p>
        <BaseInput v-model="line.quantity" size="sm" inputmode="decimal" placeholder="Cantidad"
          :aria-label="`Cantidad de ${line.name}`" :maxlength="24" />
        <BaseInput v-model="line.note" size="sm" placeholder="Nota opcional" :aria-label="`Nota de ${line.name}`" :maxlength="240" />
      </div>
      <fieldset v-for="(line, index) in extra" :key="line.id" class="grid gap-2 rounded-lg border border-gray-200 p-2 sm:grid-cols-3">
        <legend class="px-1 text-xs font-medium">Artículo extra {{ index + 1 }}</legend>
        <BaseInput v-model="line.name" size="sm" label="Artículo" :maxlength="160" />
        <BaseInput v-model="line.quantity" size="sm" inputmode="decimal" label="Cantidad" :maxlength="24" />
        <BaseInput v-model="line.unit" size="sm" label="Unidad" :maxlength="50" />
        <BaseInput v-model="line.note" size="sm" label="Nota opcional" class="sm:col-span-2" :maxlength="240" />
        <BaseButton type="button" variant="ghost" size="xs" class="self-end" @click="extra.splice(index, 1)">Quitar artículo</BaseButton>
      </fieldset>
      <BaseButton type="button" variant="outline" size="sm" @click="addLine">Agregar artículo</BaseButton>
      <label class="block text-sm font-medium">
        Nota del pedido
        <textarea v-model="note" rows="2" maxlength="1000" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" />
      </label>
    </form>
    <div v-else class="space-y-2">
      <label class="block text-sm font-medium">
        Vista previa
        <textarea ref="previewInput" :value="preview" readonly rows="9" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" />
      </label>
      <p v-if="!windowOpen" class="text-sm text-gray-600">La ventana de atención está cerrada. Puedes copiar el pedido y revisar las plantillas del chat.</p>
      <p v-else-if="!canInsert" class="text-sm text-gray-600">Toma la conversación para colocar el pedido en el chat.</p>
      <p v-if="copied" role="status" class="text-sm text-emerald-700">Mensaje copiado.</p>
    </div>
    <p v-if="formError || composerError" role="alert" class="mt-3 text-sm text-red-700">{{ formError || composerError }}</p>
    <template #footer>
      <template v-if="preview">
        <BaseButton variant="secondary" @click="edit">Editar artículos</BaseButton>
        <BaseButton variant="outline" @click="copy">Copiar mensaje</BaseButton>
        <BaseButton v-if="canInsert" @click="emit('prepare', conversationId, preview)">Pasar al chat</BaseButton>
      </template>
      <BaseButton v-else type="submit" form="whatsapp-supplier-order">Preparar mensaje</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { supplierOrderMessage, type SupplierOrderLine } from '@/helpers/whatsappSupplierOrder'
import { whatsappApi } from '@/services/MainAPI/whatsappApi'

const props = defineProps<{
  conversationId: number
  supplierName: string
  canInsert: boolean
  windowOpen: boolean
  composerError: string
}>()
const emit = defineEmits<{ close: []; prepare: [conversationId: number, message: string] }>()
const favorites = ref<(SupplierOrderLine & { id: number })[]>([])
const extra = ref<(SupplierOrderLine & { id: number })[]>([])
const note = ref('')
const preview = ref('')
const previewInput = ref<HTMLTextAreaElement>()
const loading = ref(false)
const copied = ref(false)
const formError = ref('')
const loadError = ref('')
const units: Record<string, string> = { Unit: 'und.', Kilo: 'kg', Package: 'paq.', Pound: 'lb', Gallon: 'gal' }
let request: AbortController | undefined
let nextId = 0

async function load() {
  request?.abort()
  const controller = request = new AbortController()
  loading.value = true
  loadError.value = ''
  try {
    const response = await whatsappApi.getConversationSupplierItems(props.conversationId, controller.signal)
    if (controller.signal.aborted) return
    favorites.value = (response.data ?? []).map(item => ({
      id: item.expenseId, name: item.expenseName, unit: units[item.expenseUnit] ?? item.expenseUnit, quantity: '', note: '',
    }))
  } catch (cause) {
    if (!controller.signal.aborted) loadError.value = cause instanceof Error ? cause.message : 'No se pudieron consultar los artículos.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function addLine() {
  extra.value.push({ id: ++nextId, name: '', quantity: '', unit: '', note: '', custom: true })
}

function prepare() {
  formError.value = ''
  try {
    preview.value = supplierOrderMessage([...favorites.value, ...extra.value], note.value)
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'No se pudo preparar el pedido.'
  }
}

function edit() {
  preview.value = ''
  copied.value = false
  formError.value = ''
}

async function copy() {
  formError.value = ''
  try {
    await navigator.clipboard.writeText(preview.value)
    copied.value = true
  } catch {
    previewInput.value?.focus()
    previewInput.value?.select()
    formError.value = 'Copia el texto seleccionado.'
  }
}

onMounted(load)
onBeforeUnmount(() => request?.abort())
</script>
