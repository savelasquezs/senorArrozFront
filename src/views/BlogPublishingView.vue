<template>
  <MainLayout>
    <section class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">SEO · Notion</p>
          <h1 class="mt-1 text-2xl font-bold text-gray-950">Publicación del blog</h1>
          <p class="mt-2 max-w-2xl text-sm text-gray-500">
            Compara automáticamente Notion con el snapshot publicado. Si cambias el texto o la metadata de un artículo, aquí verás que tiene cambios pendientes antes de republicarlo.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          :disabled="loading"
          @click="loadQueue"
        >
          <ArrowPathIcon class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Verificar cambios
        </button>
      </div>

      <div v-if="publishedUrl" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold text-emerald-900">Artículo actualizado</p>
            <p class="mt-1 break-all text-sm text-emerald-800">{{ publishedUrl }}</p>
          </div>
          <a
            :href="publishedUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Abrir artículo <ArrowTopRightOnSquareIcon class="h-4 w-4" />
          </a>
        </div>
      </div>

      <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="index in 3" :key="index" class="h-48 animate-pulse rounded-2xl bg-gray-100" />
      </div>

      <div v-else-if="articles.length === 0" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
        <CheckCircleIcon class="mx-auto h-10 w-10 text-emerald-500" />
        <h2 class="mt-3 text-lg font-semibold text-gray-900">No hay artículos para revisar</h2>
        <p class="mt-1 text-sm text-gray-500">Los artículos aprobados o ya publicados aparecerán aquí.</p>
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="article in articles"
          :key="article.notionPageId"
          class="flex min-h-56 flex-col rounded-2xl border bg-white p-5 shadow-sm"
          :class="cardBorderClass(article.publicationStatus)"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusBadgeClass(article.publicationStatus)">
              {{ statusLabel(article.publicationStatus) }}
            </span>
            <span v-if="article.intent" class="text-xs text-gray-400">{{ article.intent }}</span>
          </div>

          <h2 class="mt-4 text-lg font-semibold leading-6 text-gray-950">{{ article.title }}</h2>
          <p v-if="article.keywordPrincipal" class="mt-2 text-sm text-gray-500">
            Keyword: <span class="font-medium text-gray-700">{{ article.keywordPrincipal }}</span>
          </p>
          <p class="mt-2 truncate font-mono text-xs text-gray-400">/blog/{{ article.slug }}</p>

          <div v-if="article.publishedAt" class="mt-3 space-y-1 text-xs text-gray-400">
            <p>Publicado: {{ formatDate(article.publishedAt) }}</p>
            <p v-if="article.publicationStatus === 'changesPending'" class="font-medium text-amber-700">
              Notion ya no coincide con la versión pública.
            </p>
            <p v-else-if="article.publicationStatus === 'upToDate'" class="font-medium text-emerald-700">
              Notion y la versión pública coinciden.
            </p>
          </div>

          <p v-if="article.checkError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {{ article.checkError }}
          </p>

          <div class="mt-auto flex items-center gap-2 pt-4">
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              :disabled="previewLoadingId === article.notionPageId || article.publicationStatus === 'checkFailed'"
              @click="openPreview(article)"
            >
              <ArrowPathIcon v-if="previewLoadingId === article.notionPageId" class="h-4 w-4 animate-spin" />
              <EyeIcon v-else class="h-4 w-4" />
              Vista previa
            </button>
            <a
              v-if="article.publicUrl"
              :href="article.publicUrl"
              target="_blank"
              rel="noreferrer"
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              aria-label="Abrir artículo publicado"
            >
              <ArrowTopRightOnSquareIcon class="h-4 w-4" />
            </a>
          </div>
        </article>
      </div>
    </section>

    <BaseDialog v-model="previewOpen" size="5xl" :close-on-backdrop="!publishing" title="Vista previa del artículo">
      <div v-if="preview" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article class="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
          <h1 class="text-3xl font-bold leading-tight text-gray-950">{{ preview.title }}</h1>
          <BlogArticleRenderer :blocks="preview.blocks" class="mt-8" />
        </article>

        <aside class="space-y-4">
          <div v-if="selectedArticle" class="rounded-xl border p-4 text-sm" :class="previewStatusClass(selectedArticle.publicationStatus)">
            <p class="font-semibold">{{ statusLabel(selectedArticle.publicationStatus) }}</p>
            <p class="mt-1 text-xs leading-5">
              {{ statusDescription(selectedArticle.publicationStatus) }}
            </p>
          </div>

          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p class="font-semibold text-gray-900">SEO</p>
            <dl class="mt-3 space-y-3 text-gray-600">
              <div>
                <dt class="text-xs font-semibold uppercase text-gray-400">URL</dt>
                <dd class="mt-1 break-words font-mono text-xs">/blog/{{ preview.slug }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase text-gray-400">Meta title</dt>
                <dd class="mt-1">{{ preview.metaTitle }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase text-gray-400">Meta description</dt>
                <dd class="mt-1">{{ preview.metaDescription }}</dd>
              </div>
            </dl>
          </div>

          <div v-if="preview.warnings.length" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div class="flex items-center gap-2 font-semibold">
              <ExclamationTriangleIcon class="h-5 w-5" />
              No se puede publicar todavía
            </div>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              <li v-for="warningItem in preview.warnings" :key="warningItem">{{ warningItem }}</li>
            </ul>
          </div>

          <a
            :href="preview.clientViewUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            Abrir vista cliente en Notion <ArrowTopRightOnSquareIcon class="h-4 w-4" />
          </a>
        </aside>
      </div>

      <template #footer>
        <button
          type="button"
          class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          :disabled="publishing"
          @click="previewOpen = false"
        >
          Cerrar
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canPublishSelected || !preview || preview.warnings.length > 0 || publishing"
          @click="confirmOpen = true"
        >
          <CloudArrowUpIcon class="h-4 w-4" />
          {{ selectedArticle?.publicationStatus === 'changesPending' ? 'Republicar' : 'Publicar' }}
        </button>
      </template>
    </BaseDialog>

    <BaseDialog
      v-model="confirmOpen"
      size="md"
      :close-on-backdrop="!publishing"
      :title="selectedArticle?.publicationStatus === 'changesPending' ? 'Confirmar republicación' : 'Confirmar publicación'"
      z-class="z-[60]"
    >
      <p class="text-sm leading-6 text-gray-600">
        <template v-if="selectedArticle?.publicationStatus === 'changesPending'">
          Se reemplazará el snapshot público por esta nueva versión de Notion. La URL seguirá siendo
        </template>
        <template v-else>
          Se guardará un snapshot del contenido aprobado y quedará visible en
        </template>
        <strong class="text-gray-900">senorarroz.com/blog/{{ preview?.slug }}</strong>.
      </p>
      <template #footer>
        <button
          type="button"
          class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          :disabled="publishing"
          @click="confirmOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          :disabled="publishing"
          @click="publishSelected"
        >
          <ArrowPathIcon v-if="publishing" class="h-4 w-4 animate-spin" />
          <CloudArrowUpIcon v-else class="h-4 w-4" />
          {{ publishing ? 'Guardando…' : selectedArticle?.publicationStatus === 'changesPending' ? 'Sí, republicar' : 'Sí, publicar' }}
        </button>
      </template>
    </BaseDialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/vue/24/outline'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BlogArticleRenderer from '@/components/blog/BlogArticleRenderer.vue'
import { useToast } from '@/composables/useToast'
import { blogPublishingApi } from '@/services/MainAPI/blogPublishingApi'
import type {
  BlogArticlePreview,
  BlogPublicationStatus,
  BlogPublishingQueueItem,
} from '@/types/blogPublishing'

const articles = ref<BlogPublishingQueueItem[]>([])
const selectedArticle = ref<BlogPublishingQueueItem | null>(null)
const preview = ref<BlogArticlePreview | null>(null)
const loading = ref(false)
const previewLoadingId = ref<string | null>(null)
const previewOpen = ref(false)
const confirmOpen = ref(false)
const publishing = ref(false)
const publishedUrl = ref<string | null>(null)
const toast = useToast()

const canPublishSelected = computed(() =>
  selectedArticle.value?.publicationStatus === 'readyToPublish'
  || selectedArticle.value?.publicationStatus === 'changesPending',
)

async function loadQueue() {
  loading.value = true
  try {
    const response = await blogPublishingApi.getQueue()
    articles.value = response.data ?? []
  } catch (error) {
    toast.error('No se pudieron verificar los artículos', errorMessage(error))
  } finally {
    loading.value = false
  }
}

async function openPreview(article: BlogPublishingQueueItem) {
  previewLoadingId.value = article.notionPageId
  selectedArticle.value = article
  publishedUrl.value = null
  try {
    const response = await blogPublishingApi.getPreview(article.notionPageId)
    preview.value = response.data
    previewOpen.value = true
  } catch (error) {
    toast.error('No se pudo generar la vista previa', errorMessage(error))
  } finally {
    previewLoadingId.value = null
  }
}

async function publishSelected() {
  if (!preview.value || preview.value.warnings.length || !canPublishSelected.value) return
  const wasRepublish = selectedArticle.value?.publicationStatus === 'changesPending'
  publishing.value = true
  try {
    const response = await blogPublishingApi.publish(preview.value.notionPageId)
    publishedUrl.value = response.data.publicUrl
    confirmOpen.value = false
    previewOpen.value = false
    if (response.data.warnings.length) {
      toast.warning('Publicado con una advertencia', response.data.warnings.join(' '), 9000)
    } else {
      toast.success(wasRepublish ? 'Artículo republicado' : 'Artículo publicado', 5000, 'Notion y la versión pública quedaron sincronizados.')
    }
    await loadQueue()
  } catch (error) {
    toast.error(wasRepublish ? 'No se pudo republicar el artículo' : 'No se pudo publicar el artículo', errorMessage(error))
  } finally {
    publishing.value = false
  }
}

function statusLabel(status: BlogPublicationStatus): string {
  return {
    readyToPublish: 'Listo para publicar',
    changesPending: 'Cambios pendientes',
    upToDate: 'Actualizado',
    notReady: 'Revisión pendiente',
    checkFailed: 'No se pudo verificar',
  }[status]
}

function statusDescription(status: BlogPublicationStatus): string {
  return {
    readyToPublish: 'Este artículo todavía no tiene una versión pública.',
    changesPending: 'El contenido actual de Notion es diferente al snapshot que está viendo el cliente.',
    upToDate: 'La versión de Notion coincide exactamente con el snapshot publicado.',
    notReady: 'Hay una versión publicada, pero el estado editorial actual no permite republicarla.',
    checkFailed: 'No fue posible comparar Notion con la versión publicada.',
  }[status]
}

function statusBadgeClass(status: BlogPublicationStatus): string {
  return {
    readyToPublish: 'bg-emerald-50 text-emerald-700',
    changesPending: 'bg-amber-100 text-amber-800',
    upToDate: 'bg-slate-100 text-slate-700',
    notReady: 'bg-violet-50 text-violet-700',
    checkFailed: 'bg-red-50 text-red-700',
  }[status]
}

function cardBorderClass(status: BlogPublicationStatus): string {
  return status === 'changesPending'
    ? 'border-amber-300'
    : status === 'checkFailed'
      ? 'border-red-200'
      : 'border-gray-200'
}

function previewStatusClass(status: BlogPublicationStatus): string {
  return status === 'changesPending'
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : status === 'readyToPublish'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-gray-200 bg-gray-50 text-gray-700'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Ocurrió un error inesperado.'
}

onMounted(loadQueue)
</script>
