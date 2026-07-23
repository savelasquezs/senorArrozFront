<template>
  <MainLayout>
  <div class="space-y-6 p-4 sm:p-6">
    <header class="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm"><MapIcon class="h-6 w-6" /></div>
          <div>
            <div class="flex flex-wrap items-center gap-2"><h1 class="text-2xl font-bold tracking-tight text-gray-900">Revisión de seguimiento</h1><span class="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm">{{ totalCount }} casos</span></div>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Analiza apagados de ubicación, permanencias, recorrido y estado del dispositivo antes de registrar una decisión administrativa.</p>
          </div>
        </div>
        <BaseButton variant="outline" :loading="loading" @click="loadIncidents"><ArrowPathIcon class="h-4 w-4" /> Actualizar</BaseButton>
      </div>
    </header>

    <BaseCard padding="lg">
      <div class="mb-5 flex items-center gap-2"><FunnelIcon class="h-5 w-5 text-emerald-600" /><div><h2 class="font-semibold text-gray-900">Filtrar casos</h2><p class="text-xs text-gray-500">Consulta por estado de revisión y periodo de captura.</p></div></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label v-if="authStore.isSuperadmin" class="text-sm font-medium text-gray-700">
          Sucursal
          <select v-model="branchId" class="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="">Todas</option>
            <option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option>
          </select>
        </label>
        <label class="text-sm font-medium text-gray-700">
          Estado
          <select v-model="reviewStatus" class="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="">Todos</option>
            <option v-for="option in reviewStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="text-sm font-medium text-gray-700">
          Desde
          <input v-model="fromDate" type="date" class="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
        <label class="text-sm font-medium text-gray-700">
          Hasta
          <input v-model="toDate" type="date" class="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </label>
      </div>
      <div class="mt-4 flex justify-end">
        <BaseButton @click="applyFilters"><MagnifyingGlassIcon class="h-4 w-4" /> Aplicar filtros</BaseButton>
      </div>
    </BaseCard>

    <BaseCard padding="none" class="overflow-hidden">
      <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 class="font-semibold text-gray-900">Casos encontrados</h2><p class="text-xs text-gray-500">La clasificación automática se presenta como contexto, no como decisión final.</p></div><span class="text-xs font-medium text-gray-500">Página {{ page }}</span></div>
      <BaseLoading v-if="loading" text="Cargando incidentes..." class="py-16" />
      <div v-else-if="loadError" class="p-8 text-center">
        <p class="text-sm text-red-700">{{ loadError }}</p>
        <BaseButton class="mt-4" variant="outline" @click="loadIncidents">Reintentar</BaseButton>
      </div>
      <div v-else-if="items.length === 0" class="p-14 text-center">
        <ClipboardDocumentCheckIcon class="mx-auto h-12 w-12 text-gray-300" /><p class="mt-3 font-medium text-gray-700">No hay casos pendientes</p><p class="mt-1 text-sm text-gray-500">No se encontraron incidentes con los filtros seleccionados.</p>
      </div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th class="px-4 py-3">Domiciliario / jornada</th>
                <th class="px-4 py-3">Caso</th>
                <th class="px-4 py-3">Pedido</th>
                <th class="px-4 py-3">GPS / internet</th>
                <th class="px-4 py-3">Revisión</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr v-for="incident in items" :key="incident.id" class="transition-colors hover:bg-emerald-50/40">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3"><div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-semibold text-emerald-700">{{ incident.deliverymanName.charAt(0).toUpperCase() }}</div><div><p class="font-semibold text-gray-900">{{ incident.deliverymanName }}</p>
                  <p class="text-xs text-gray-500">{{ incident.branchName }} · Jornada #{{ incident.workSessionId }}</p>
                  </div></div>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium">{{ incidentTypeLabel(incident.incidentType) }}</p>
                  <p class="text-xs text-gray-500">{{ formatDateTime(incident.startedAt) }} · {{ formatDuration(incident.durationSeconds) }}</p>
                  <p v-if="incident.incidentType === 'stay'" class="text-xs text-gray-500">{{ classificationLabel(incident.automaticClassification) }}</p>
                </td>
                <td class="max-w-xs px-4 py-3">
                  <p v-if="incident.orderId" class="font-medium">#{{ incident.orderId }}</p>
                  <p class="truncate text-xs text-gray-500">{{ incident.orderAddress || 'Sin pedido relacionado' }}</p>
                  <p v-if="incident.distanceToOrderMeters != null" class="text-xs text-gray-500">{{ formatMeters(incident.distanceToOrderMeters) }} del destino</p>
                </td>
                <td class="px-4 py-3 text-xs">
                  <p>{{ stateLabel('GPS', incident.gpsEnabled) }}</p>
                  <p>{{ stateLabel('Internet', incident.internetAvailable) }}</p>
                  <p v-if="incident.incidentType === 'stay'">Precisión {{ formatMeters(incident.averageAccuracyMeters) }}</p>
                </td>
                <td class="px-4 py-3"><BaseBadge :variant="reviewVariant(incident.reviewStatus)" size="sm">{{ reviewStatusLabel(incident.reviewStatus) }}</BaseBadge></td>
                <td class="px-4 py-3 text-right"><BaseButton size="sm" variant="outline" @click="openDetail(incident.id)">Revisar</BaseButton></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-gray-100 md:hidden">
          <button v-for="incident in items" :key="incident.id" type="button" class="w-full p-4 text-left hover:bg-gray-50" @click="openDetail(incident.id)">
            <div class="flex items-start justify-between gap-3">
              <div><p class="font-semibold text-gray-900">{{ incident.deliverymanName }}</p><p class="text-xs text-gray-500">{{ formatDateTime(incident.startedAt) }} · {{ formatDuration(incident.durationSeconds) }}</p></div>
              <BaseBadge :variant="reviewVariant(incident.reviewStatus)" size="sm">{{ reviewStatusLabel(incident.reviewStatus) }}</BaseBadge>
            </div>
            <p class="mt-2 text-sm text-gray-700">{{ incidentTypeLabel(incident.incidentType) }}<span v-if="incident.incidentType === 'stay'"> · {{ classificationLabel(incident.automaticClassification) }}</span></p>
            <p class="mt-1 truncate text-xs text-gray-500">{{ incident.orderAddress || 'Sin pedido relacionado' }}</p>
          </button>
        </div>

        <BasePagination :current-page="page" :total="totalCount" :per-page="pageSize" @change="changePage" />
      </template>
    </BaseCard>

    <BaseDialog v-model="detailOpen" title="Revisión del incidente" size="6xl" :close-on-backdrop="!saving">
      <BaseLoading v-if="detailLoading" text="Cargando evidencia..." class="py-16" />
      <div v-else-if="detail" class="space-y-6">
        <div class="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900">{{ detail.deliverymanName }}</h2>
            <p class="text-sm text-gray-500">{{ detail.branchName }} · Jornada #{{ detail.workSessionId }} · Incidente #{{ detail.id }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <BaseBadge variant="warning">{{ incidentTypeLabel(detail.incidentType) }}</BaseBadge>
            <BaseBadge v-if="detail.incidentType === 'stay'" variant="info">{{ classificationLabel(detail.automaticClassification) }}</BaseBadge>
            <BaseBadge :variant="reviewVariant(reviewForm.reviewStatus)">{{ reviewStatusLabel(reviewForm.reviewStatus) }}</BaseBadge>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Inicio" :value="formatDateTime(detail.startedAt)" />
          <Fact :label="detail.incidentType === 'location_disabled' ? 'Recuperación' : 'Finalización'" :value="detail.incidentType !== 'location_disabled' || detail.evidenceComplete ? formatDateTime(detail.endedAt) : 'Aún no registrada'" />
          <Fact label="Duración" :value="formatDuration(detail.durationSeconds)" />
          <Fact label="Puntos de evidencia" :value="String(detail.locations.length)" />
          <Fact v-if="detail.incidentType === 'stay'" label="Precisión promedio" :value="formatMeters(detail.averageAccuracyMeters)" />
          <Fact v-if="detail.incidentType === 'stay'" label="Radio observado" :value="formatMeters(detail.radiusMeters)" />
          <Fact v-if="detail.incidentType === 'stay'" label="Distancia a sucursal" :value="formatNullableMeters(detail.distanceToBranchMeters)" />
          <Fact v-if="detail.incidentType === 'stay'" label="Distancia al destino" :value="formatNullableMeters(detail.distanceToOrderMeters)" />
        </div>

        <div v-if="detail.orderId" class="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
          <p class="font-semibold text-blue-900">Pedido #{{ detail.orderId }}</p>
          <p class="mt-1 text-blue-800">{{ detail.orderAddress || 'Dirección no disponible' }}</p>
          <p class="mt-1 text-xs text-blue-700">Estado registrado: {{ orderStatusLabel(detail.orderStatus) }}</p>
        </div>

        <section>
          <h3 class="mb-3 text-base font-semibold text-gray-900">{{ detail.incidentType === 'location_disabled' ? 'Ubicaciones antes y después del apagado' : 'Recorrido y puntos conservados' }}</h3>
          <DeliveryIncidentEvidenceMap
            :locations="detail.locations"
            :center-latitude="detail.centerLatitude"
            :center-longitude="detail.centerLongitude"
            :radius-meters="detail.radiusMeters"
            :show-stay-radius="detail.incidentType === 'stay'"
            :order-latitude="detail.orderLatitude"
            :order-longitude="detail.orderLongitude"
          />
        </section>

        <section>
          <h3 class="mb-3 text-base font-semibold text-gray-900">Detalle de ubicaciones</h3>
          <div class="max-h-72 overflow-auto rounded-xl border border-gray-200">
            <table class="min-w-full divide-y divide-gray-200 text-xs">
              <thead class="sticky top-0 bg-gray-50 text-left text-gray-500"><tr><th class="px-3 py-2">Hora real</th><th class="px-3 py-2">Punto</th><th class="px-3 py-2">Precisión</th><th class="px-3 py-2">GPS</th><th class="px-3 py-2">Internet</th><th class="px-3 py-2">Batería</th><th class="px-3 py-2">Modo</th></tr></thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(point, index) in detail.locations" :key="point.sourceLocationId">
                  <td class="whitespace-nowrap px-3 py-2">{{ formatDateTime(point.recordedAt) }}</td>
                  <td class="px-3 py-2">
                    <BaseBadge :variant="point.isCorePoint ? 'info' : 'secondary'" size="sm">{{ evidencePointLabel(detail, index) }}</BaseBadge>
                    <a :href="mapUrl(point.latitude, point.longitude)" target="_blank" rel="noopener noreferrer" class="ml-2 font-semibold text-emerald-700 hover:underline">Ver mapa</a>
                  </td>
                  <td class="px-3 py-2">{{ formatNullableMeters(point.accuracyMeters) }}</td>
                  <td class="px-3 py-2">{{ booleanLabel(point.gpsEnabled) }}</td>
                  <td class="px-3 py-2">{{ booleanLabel(point.internetAvailable) }}</td>
                  <td class="px-3 py-2">{{ point.batteryLevelPercent == null ? '—' : `${point.batteryLevelPercent}%` }}</td>
                  <td class="px-3 py-2">{{ trackingModeLabel(point.trackingMode) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 class="mb-3 text-base font-semibold text-gray-900">Eventos del dispositivo</h3>
          <p v-if="detail.deviceEvents.length === 0" class="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No se registraron eventos técnicos durante este periodo.</p>
          <div v-else class="space-y-2">
            <div v-for="event in detail.deviceEvents" :key="event.sourceDeviceEventId" class="flex flex-col gap-1 rounded-xl border border-gray-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div><p class="font-medium text-gray-900">{{ deviceEventLabel(event.eventType) }}</p><p v-if="event.details" class="text-xs text-gray-500">{{ event.details }}</p></div>
              <span class="text-xs text-gray-500">{{ formatDateTime(event.recordedAt) }}</span>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <h3 class="text-base font-semibold text-gray-900">Decisión administrativa</h3>
          <p class="mt-1 text-xs text-gray-500">La clasificación automática se conserva; esta sección registra la conclusión humana.</p>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-medium text-gray-700">Estado de revisión
              <select v-model="reviewForm.reviewStatus" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option v-for="option in reviewStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label v-if="detail.incidentType === 'stay'" class="text-sm font-medium text-gray-700">Clasificación final
              <select v-model="reviewForm.finalClassification" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option :value="null">Sin definir</option>
                <option v-for="option in classificationOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </div>
          <label class="mt-4 block text-sm font-medium text-gray-700">Explicación del domiciliario
            <textarea v-model="reviewForm.deliverymanExplanation" maxlength="2000" rows="3" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Registrar la explicación recibida, sin interpretarla." />
          </label>
          <label class="mt-4 block text-sm font-medium text-gray-700">Observaciones del administrador
            <textarea v-model="reviewForm.adminNotes" maxlength="2000" rows="3" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Contexto y hechos considerados para la decisión." />
          </label>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs text-gray-500">{{ detail.reviewedAt ? `Última revisión: ${formatDateTime(detail.reviewedAt)} por ${detail.reviewedByUserName || 'usuario administrativo'}` : 'Aún no ha sido revisado.' }}</p>
            <BaseButton :loading="saving" @click="saveReview">Guardar revisión</BaseButton>
          </div>
        </section>
      </div>
    </BaseDialog>
  </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { defineComponent, h, onMounted, reactive, ref } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BasePagination from '@/components/ui/BasePaginatiopn.vue'
import DeliveryIncidentEvidenceMap from '@/components/delivery/DeliveryIncidentEvidenceMap.vue'
import { ArrowPathIcon, ClipboardDocumentCheckIcon, FunnelIcon, MagnifyingGlassIcon, MapIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/store/auth'
import { branchApi } from '@/services/MainAPI/branchApi'
import { useToast } from '@/composables/useToast'
import {
  deliveryTrackingIncidentsApi,
  type DeliveryIncidentReviewStatus,
  type DeliveryStayClassification,
  type DeliveryTrackingIncidentDetail,
  type DeliveryTrackingIncidentListItem,
} from '@/services/MainAPI/deliveryTrackingIncidentsApi'

const Fact = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  setup: props => () => h('div', { class: 'rounded-xl border border-gray-100 bg-white p-3' }, [
    h('p', { class: 'text-xs text-gray-500' }, props.label),
    h('p', { class: 'mt-1 text-sm font-semibold text-gray-900' }, props.value),
  ]),
})

const authStore = useAuthStore()
const toast = useToast()
const items = ref<DeliveryTrackingIncidentListItem[]>([])
const branches = ref<Array<{ id: number; name: string }>>([])
const loading = ref(false)
const loadError = ref('')
const page = ref(1)
const pageSize = 20
const totalCount = ref(0)
const branchId = ref('')
const reviewStatus = ref<DeliveryIncidentReviewStatus | ''>('pending')
const today = new Date()
const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
const toInputDate = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date)
const fromDate = ref(toInputDate(sevenDaysAgo))
const toDate = ref(toInputDate(today))
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<DeliveryTrackingIncidentDetail | null>(null)
const saving = ref(false)
const reviewForm = reactive({
  reviewStatus: 'pending' as DeliveryIncidentReviewStatus,
  finalClassification: null as DeliveryStayClassification | null,
  adminNotes: '',
  deliverymanExplanation: '',
})

const reviewStatusOptions: Array<{ value: DeliveryIncidentReviewStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'justified', label: 'Justificado' },
  { value: 'not_justified', label: 'No justificado' },
  { value: 'gps_error', label: 'Error de GPS' },
  { value: 'technical_failure', label: 'Falla técnica' },
  { value: 'closed_without_action', label: 'Cerrado sin acción' },
  { value: 'referred_to_disciplinary_process', label: 'Remitido a proceso disciplinario' },
]
const classificationOptions: Array<{ value: DeliveryStayClassification; label: string }> = [
  { value: 'branch', label: 'Sucursal' },
  { value: 'order_destination', label: 'Destino del pedido' },
  { value: 'authorized_place', label: 'Lugar autorizado' },
  { value: 'traffic_or_route', label: 'Tráfico o espera en ruta' },
  { value: 'unexpected_place', label: 'Lugar no esperado' },
  { value: 'gps_unreliable', label: 'GPS no confiable' },
  { value: 'pending_review', label: 'Pendiente de revisión' },
]

async function loadBranches() {
  if (!authStore.isSuperadmin) return
  const response = await branchApi.getBranches({ Page: 1, PageSize: 200, SortBy: 'name', SortOrder: 'asc' })
  branches.value = response.data.items.map(branch => ({ id: branch.id, name: branch.name }))
}

function colombiaDateStart(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00-05:00`).toISOString() : undefined
}

function colombiaDayAfter(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00-05:00`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

async function loadIncidents() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await deliveryTrackingIncidentsApi.getAll({
      branchId: branchId.value ? Number(branchId.value) : undefined,
      reviewStatus: reviewStatus.value || undefined,
      from: colombiaDateStart(fromDate.value),
      to: colombiaDayAfter(toDate.value),
      page: page.value,
      pageSize,
    })
    items.value = response.data.items
    totalCount.value = response.data.totalCount
  } catch (error: any) {
    loadError.value = error.message || 'No fue posible cargar los incidentes.'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  void loadIncidents()
}

function changePage(value: number) {
  page.value = value
  void loadIncidents()
}

async function openDetail(id: number) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const response = await deliveryTrackingIncidentsApi.getById(id)
    detail.value = response.data
    hydrateReviewForm(response.data)
  } catch (error: any) {
    detailOpen.value = false
    toast.error('No se pudo cargar el incidente', error.message)
  } finally {
    detailLoading.value = false
  }
}

function hydrateReviewForm(value: DeliveryTrackingIncidentDetail) {
  reviewForm.reviewStatus = value.reviewStatus
  reviewForm.finalClassification = value.finalClassification
  reviewForm.adminNotes = value.adminNotes || ''
  reviewForm.deliverymanExplanation = value.deliverymanExplanation || ''
}

async function saveReview() {
  if (!detail.value) return
  saving.value = true
  try {
    const response = await deliveryTrackingIncidentsApi.review(detail.value.id, {
      reviewStatus: reviewForm.reviewStatus,
      finalClassification: reviewForm.finalClassification,
      adminNotes: reviewForm.adminNotes.trim() || null,
      deliverymanExplanation: reviewForm.deliverymanExplanation.trim() || null,
    })
    detail.value = response.data
    hydrateReviewForm(response.data)
    toast.success('Revisión guardada', 5000)
    await loadIncidents()
  } catch (error: any) {
    toast.error('No se pudo guardar la revisión', error.message)
  } finally {
    saving.value = false
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value))
}
function formatDuration(seconds: number) { const minutes = Math.round(seconds / 60); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min` }
function formatMeters(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m` }
function formatNullableMeters(value: number | null) { return value == null ? 'No disponible' : formatMeters(value) }
function booleanLabel(value: boolean | null) { return value == null ? 'Sin dato' : value ? 'Sí' : 'No' }
function stateLabel(name: string, value: boolean | null) { return `${name}: ${value == null ? 'sin dato' : value ? 'activo' : 'inactivo'}` }
function classificationLabel(value: DeliveryStayClassification | null) { return classificationOptions.find(option => option.value === value)?.label || 'Sin clasificación' }
function incidentTypeLabel(value: DeliveryTrackingIncidentListItem['incidentType']) { return ({ stay: 'Permanencia', route_deviation: 'Desviación de ruta', location_disabled: 'Ubicación apagada' } as const)[value] }
function evidencePointLabel(incident: DeliveryTrackingIncidentDetail, index: number) {
  if (incident.incidentType !== 'location_disabled') return incident.locations[index]?.isCorePoint ? 'Permanencia' : 'Margen'
  return index === 0 ? 'Antes del apagado' : 'Después de encender'
}
function mapUrl(latitude: number, longitude: number) { return `https://www.google.com/maps?q=${latitude},${longitude}` }
function reviewStatusLabel(value: DeliveryIncidentReviewStatus) { return reviewStatusOptions.find(option => option.value === value)?.label || value }
function reviewVariant(value: DeliveryIncidentReviewStatus): 'warning' | 'success' | 'danger' | 'info' | 'secondary' { if (value === 'pending') return 'warning'; if (value === 'justified' || value === 'closed_without_action') return 'success'; if (value === 'not_justified' || value === 'referred_to_disciplinary_process') return 'danger'; if (value === 'gps_error' || value === 'technical_failure') return 'info'; return 'secondary' }
function trackingModeLabel(value: string | null) { return ({ light: 'Liviano', active_delivery: 'Pedido activo', offline: 'Sin conexión', stopped: 'Detenido' } as Record<string, string>)[value || ''] || 'Sin dato' }
function orderStatusLabel(value: string | null) { return ({ OnTheWay: 'En camino', Delivered: 'Entregado', Ready: 'Listo' } as Record<string, string>)[value || ''] || value || 'Sin dato' }
function deviceEventLabel(value: string) { return ({ gps_disabled: 'GPS apagado', gps_enabled: 'GPS recuperado', internet_lost: 'Internet perdido', internet_recovered: 'Internet recuperado', location_permission_revoked: 'Permiso retirado', location_permission_recovered: 'Permiso recuperado', battery_low: 'Batería baja', app_stopped: 'Aplicación detenida', location_service_restarted: 'Servicio reiniciado', automatic_closure: 'Cierre automático', total_settlement: 'Cierre por liquidación', tracking_started: 'Seguimiento iniciado', tracking_stopped: 'Seguimiento detenido' } as Record<string, string>)[value] || value.replace(/_/g, ' ') }

onMounted(async () => {
  try { await loadBranches() } catch (error: any) { toast.error('No se pudieron cargar las sucursales', error.message) }
  await loadIncidents()
})
</script>
