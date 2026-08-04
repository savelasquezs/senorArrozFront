<template>
  <MainLayout page-title="Documentos corporativos">
    <section class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Documentos corporativos</h1>
          <p class="mt-1 text-sm text-gray-500">
            Reglamentos, políticas y documentos de seguridad disponibles para todo el equipo.
          </p>
        </div>
        <BaseButton
          v-if="authStore.isSuperadmin"
          :icon="PlusIcon"
          @click="openCreate"
        >
          Subir documento
        </BaseButton>
      </header>

      <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="applySearch">
          <label class="relative flex-1">
            <span class="sr-only">Buscar documento</span>
            <MagnifyingGlassIcon
              class="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            />
            <input
              v-model="searchInput"
              type="search"
              placeholder="Buscar por nombre o archivo..."
              class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <BaseButton type="submit" :loading="loading">Buscar</BaseButton>
          <BaseButton
            v-if="filters.search"
            variant="secondary"
            @click="clearSearch"
          >
            Limpiar
          </BaseButton>
        </form>
      </div>

      <div
        v-if="loadError"
        role="alert"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        <div class="flex items-center justify-between gap-4">
          <span>{{ loadError }}</span>
          <button type="button" class="font-medium underline" @click="loadDocuments">
            Reintentar
          </button>
        </div>
      </div>

      <BaseLoading v-if="loading && !pageData" text="Cargando documentos..." />

      <div
        v-else-if="!pageData?.items.length"
        class="rounded-xl border border-dashed border-gray-300 px-6 py-14 text-center"
      >
        <DocumentTextIcon class="mx-auto h-12 w-12 text-gray-300" />
        <h2 class="mt-3 text-base font-semibold text-gray-800">No hay documentos</h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ filters.search ? 'No encontramos resultados para la búsqueda.' : 'Aún no se han publicado documentos.' }}
        </p>
      </div>

      <template v-else>
        <div class="hidden overflow-hidden rounded-xl border border-gray-200 md:block">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Documento
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Archivo
                </th>
                <th class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actualizado
                </th>
                <th class="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr v-for="document in pageData.items" :key="document.id" class="hover:bg-gray-50">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <span class="rounded-lg bg-red-50 p-2 text-red-600">
                      <DocumentTextIcon class="h-5 w-5" />
                    </span>
                    <span class="font-medium text-gray-900">{{ document.name }}</span>
                  </div>
                </td>
                <td class="px-5 py-4 text-sm text-gray-600">
                  <div class="max-w-xs truncate" :title="document.originalFileName">
                    {{ document.originalFileName }}
                  </div>
                  <div class="mt-0.5 text-xs text-gray-400">{{ formatBytes(document.fileSizeBytes) }}</div>
                </td>
                <td class="px-5 py-4 text-sm text-gray-600">
                  {{ formatDate(document.updatedAt) }}
                </td>
                <td class="px-5 py-4">
                  <DocumentActions
                    :document="document"
                    :can-manage="authStore.isSuperadmin"
                    @open="openDocument"
                    @qr="openQr"
                    @edit="openEdit"
                    @delete="confirmDelete"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-4 md:hidden">
          <article
            v-for="document in pageData.items"
            :key="document.id"
            class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div class="flex items-start gap-3">
              <span class="rounded-lg bg-red-50 p-2 text-red-600">
                <DocumentTextIcon class="h-6 w-6" />
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="font-semibold text-gray-900">{{ document.name }}</h2>
                <p class="mt-1 truncate text-sm text-gray-500">{{ document.originalFileName }}</p>
                <p class="mt-1 text-xs text-gray-400">
                  {{ formatBytes(document.fileSizeBytes) }} · {{ formatDate(document.updatedAt) }}
                </p>
              </div>
            </div>
            <div class="mt-4">
              <DocumentActions
                :document="document"
                :can-manage="authStore.isSuperadmin"
                mobile
                @open="openDocument"
                @qr="openQr"
                @edit="openEdit"
                @delete="confirmDelete"
              />
            </div>
          </article>
        </div>

        <BasePaginatiopn
          v-if="pageData.totalPages > 1"
          :current-page="pageData.page"
          :total="pageData.totalCount"
          :per-page="pageData.pageSize"
          class="rounded-xl border border-gray-200"
          @change="changePage"
        />
      </template>
    </section>

    <BaseDialog
      v-model="showFormDialog"
      :title="editingDocument ? 'Editar documento' : 'Subir documento'"
      size="lg"
      :close-on-backdrop="!saving"
    >
      <form class="space-y-5" @submit.prevent="saveDocument">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700">Nombre del documento</span>
          <input
            v-model="formName"
            type="text"
            maxlength="200"
            required
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            placeholder="Ej. Reglamento interno de trabajo"
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-gray-700">
            {{ editingDocument ? 'Reemplazar PDF (opcional)' : 'Archivo PDF' }}
          </span>
          <input
            ref="fileInput"
            type="file"
            accept="application/pdf,.pdf"
            :required="!editingDocument"
            class="block w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-600 file:mr-4 file:border-0 file:bg-emerald-50 file:px-4 file:py-2.5 file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
            @change="onFileSelected"
          />
          <p class="mt-1.5 text-xs text-gray-500">Solo PDF. Tamaño máximo: 25 MB.</p>
          <p v-if="selectedFile" class="mt-2 text-sm text-emerald-700">
            {{ selectedFile.name }} · {{ formatBytes(selectedFile.size) }}
          </p>
          <p v-else-if="editingDocument" class="mt-2 text-sm text-gray-500">
            Archivo actual: {{ editingDocument.originalFileName }}
          </p>
        </label>

        <div
          v-if="formError"
          role="alert"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {{ formError }}
        </div>

        <div class="flex justify-end gap-3">
          <BaseButton variant="secondary" :disabled="saving" @click="showFormDialog = false">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="saving" loading-text="Guardando...">
            {{ editingDocument ? 'Guardar cambios' : 'Publicar documento' }}
          </BaseButton>
        </div>
      </form>
    </BaseDialog>

    <BaseDialog
      v-model="showQrDialog"
      title="Código QR del documento"
      size="sm"
    >
      <div v-if="qrDocument" class="text-center">
        <p class="mb-4 font-medium text-gray-900">{{ qrDocument.name }}</p>
        <div
          ref="qrContainer"
          class="mx-auto inline-flex rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <QrcodeVue
            :value="resolvedPublicUrl(qrDocument)"
            :size="260"
            level="M"
            render-as="canvas"
            :margin="2"
          />
        </div>
        <p class="mt-3 text-xs text-gray-500">
          Este QR seguirá funcionando aunque se reemplace el PDF.
        </p>
        <div class="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <BaseButton variant="secondary" :icon="ArrowDownTrayIcon" @click="downloadQr">
            Descargar PNG
          </BaseButton>
          <BaseButton :icon="PrinterIcon" @click="printQr">Imprimir</BaseButton>
        </div>
      </div>
    </BaseDialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { defineComponent, h, onMounted, ref } from 'vue'
import QrcodeVue from 'qrcode.vue'
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  PrinterIcon,
  QrCodeIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BasePaginatiopn from '@/components/ui/BasePaginatiopn.vue'
import { businessDocumentsApi } from '@/services/MainAPI/businessDocumentsApi'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import { useDialog } from '@/composables/useDialog'
import { resolveBusinessDocumentPublicUrl } from '@/utils/businessDocumentUrl'
import type { BusinessDocument, BusinessDocumentFilters } from '@/types/businessDocument'
import type { PagedResult } from '@/types/common'

const DocumentActions = defineComponent({
  props: {
    document: { type: Object as () => BusinessDocument, required: true },
    canManage: { type: Boolean, default: false },
    mobile: { type: Boolean, default: false },
  },
  emits: ['open', 'qr', 'edit', 'delete'],
  setup(props, { emit }) {
    const action = (
      label: string,
      icon: typeof DocumentTextIcon,
      event: 'open' | 'qr' | 'edit' | 'delete',
      danger = false,
    ) =>
      h(
        'button',
        {
          type: 'button',
          title: label,
          class: [
            'inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors',
            props.mobile ? 'flex-1' : '',
            danger
              ? 'border-red-200 text-red-700 hover:bg-red-50'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50',
          ],
          onClick: () => emit(event, props.document),
        },
        [h(icon, { class: 'h-4 w-4' }), props.mobile ? h('span', label) : null],
      )

    return () =>
      h('div', { class: ['flex justify-end gap-2', props.mobile ? 'w-full' : ''] }, [
        action('Abrir', ArrowDownTrayIcon, 'open'),
        action('QR', QrCodeIcon, 'qr'),
        ...(props.canManage
          ? [
              action('Editar', PencilSquareIcon, 'edit'),
              action('Eliminar', TrashIcon, 'delete', true),
            ]
          : []),
      ])
  },
})

const authStore = useAuthStore()
const toast = useToast()
const { confirmDialog } = useDialog()
const loading = ref(false)
const loadError = ref('')
const pageData = ref<PagedResult<BusinessDocument> | null>(null)
const searchInput = ref('')
const filters = ref<Required<Pick<BusinessDocumentFilters, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>> & { search: string }>({
  search: '',
  page: 1,
  pageSize: 20,
  sortBy: 'name',
  sortOrder: 'asc',
})

const showFormDialog = ref(false)
const editingDocument = ref<BusinessDocument | null>(null)
const formName = ref('')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const saving = ref(false)
const formError = ref('')

const showQrDialog = ref(false)
const qrDocument = ref<BusinessDocument | null>(null)
const qrContainer = ref<HTMLElement | null>(null)

async function loadDocuments() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await businessDocumentsApi.getDocuments(filters.value)
    if (!response.isSuccess || !response.data) throw new Error(response.message || 'Respuesta inválida')
    pageData.value = response.data
  } catch (error: any) {
    loadError.value = error?.message || 'No se pudieron cargar los documentos.'
  } finally {
    loading.value = false
  }
}

async function applySearch() {
  filters.value.search = searchInput.value.trim()
  filters.value.page = 1
  await loadDocuments()
}

async function clearSearch() {
  searchInput.value = ''
  filters.value.search = ''
  filters.value.page = 1
  await loadDocuments()
}

async function changePage(page: number) {
  filters.value.page = page
  await loadDocuments()
}

function openCreate() {
  editingDocument.value = null
  formName.value = ''
  selectedFile.value = null
  formError.value = ''
  if (fileInput.value) fileInput.value.value = ''
  showFormDialog.value = true
}

function openEdit(document: BusinessDocument) {
  editingDocument.value = document
  formName.value = document.name
  selectedFile.value = null
  formError.value = ''
  if (fileInput.value) fileInput.value.value = ''
  showFormDialog.value = true
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  formError.value = ''
  if (!file) {
    selectedFile.value = null
    return
  }
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    input.value = ''
    selectedFile.value = null
    formError.value = 'Selecciona un archivo PDF válido.'
    return
  }
  if (file.size > 25 * 1024 * 1024) {
    input.value = ''
    selectedFile.value = null
    formError.value = 'El archivo PDF no puede superar 25 MB.'
    return
  }
  selectedFile.value = file
}

async function saveDocument() {
  formError.value = ''
  const name = formName.value.trim()
  if (!name) {
    formError.value = 'El nombre del documento es requerido.'
    return
  }
  if (!editingDocument.value && !selectedFile.value) {
    formError.value = 'Selecciona el archivo PDF.'
    return
  }

  saving.value = true
  try {
    if (editingDocument.value) {
      await businessDocumentsApi.updateDocument(
        editingDocument.value.id,
        name,
        selectedFile.value ?? undefined,
      )
      toast.success('Documento actualizado', 3500)
    } else {
      await businessDocumentsApi.createDocument(name, selectedFile.value!)
      toast.success('Documento publicado', 3500)
    }
    showFormDialog.value = false
    await loadDocuments()
  } catch (error: any) {
    formError.value = error?.message || 'No se pudo guardar el documento.'
  } finally {
    saving.value = false
  }
}

async function confirmDelete(document: BusinessDocument) {
  if (!(await confirmDialog({
    title: 'Eliminar documento',
    message: `¿Eliminar "${document.name}"? El QR dejará de funcionar.`,
    confirmLabel: 'Eliminar',
    tone: 'danger',
  }))) return
  try {
    await businessDocumentsApi.deleteDocument(document.id)
    toast.success('Documento eliminado', 3500)
    if (pageData.value?.items.length === 1 && filters.value.page > 1) {
      filters.value.page -= 1
    }
    await loadDocuments()
  } catch (error: any) {
    toast.error('No se pudo eliminar', error?.message)
  }
}

function resolvedPublicUrl(document: BusinessDocument): string {
  return resolveBusinessDocumentPublicUrl(document.publicDownloadUrl)
}

function openDocument(document: BusinessDocument) {
  window.open(resolvedPublicUrl(document), '_blank', 'noopener,noreferrer')
}

function openQr(document: BusinessDocument) {
  qrDocument.value = document
  showQrDialog.value = true
}

function qrCanvas(): HTMLCanvasElement | null {
  return qrContainer.value?.querySelector('canvas') ?? null
}

function safeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'documento'
}

function downloadQr() {
  const canvas = qrCanvas()
  if (!canvas || !qrDocument.value) return
  const link = document.createElement('a')
  link.download = `qr-${safeFilePart(qrDocument.value.name)}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]!)
}

function printQr() {
  const canvas = qrCanvas()
  if (!canvas || !qrDocument.value) return
  const printWindow = window.open('', '_blank', 'width=520,height=680')
  if (!printWindow) {
    toast.warning('El navegador bloqueó la ventana de impresión.')
    return
  }
  printWindow.document.write(`
    <!doctype html>
    <html><head><title>QR - ${escapeHtml(qrDocument.value.name)}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh}
      .card{text-align:center;border:2px solid #111;border-radius:16px;padding:28px;max-width:360px}
      h1{font-size:22px;margin:0 0 18px} img{width:300px;height:300px}
      p{font-size:14px;margin:14px 0 0}
    </style></head><body><div class="card">
      <h1>${escapeHtml(qrDocument.value.name)}</h1>
      <img src="${canvas.toDataURL('image/png')}" alt="Código QR">
      <p>Escanea para ver o descargar el documento</p>
    </div></body></html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value))
}

onMounted(loadDocuments)
</script>
