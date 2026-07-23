<template>
  <MainLayout>
    <div class="space-y-6 p-4 sm:p-6">
      <header class="overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
              <ShieldExclamationIcon class="h-6 w-6" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-bold tracking-tight text-gray-900">Alertas de seguimiento</h1>
                <span class="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm">{{ totalCount }} resultados</span>
              </div>
              <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Señales técnicas y operativas para revisar con contexto, sin convertirlas automáticamente en una falta.</p>
            </div>
          </div>
          <BaseButton variant="outline" :loading="loading" @click="loadAlerts">
            <ArrowPathIcon class="h-4 w-4" /> Actualizar
          </BaseButton>
        </div>
      </header>

      <BaseCard padding="lg" shadow="sm">
        <div class="mb-5 flex items-center gap-2">
          <FunnelIcon class="h-5 w-5 text-emerald-600" />
          <div><h2 class="font-semibold text-gray-900">Filtrar alertas</h2><p class="text-xs text-gray-500">Acota los resultados por estado, nivel y periodo.</p></div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label v-if="authStore.isSuperadmin" class="text-sm font-medium text-gray-700">Sucursal
            <select v-model="branchId" class="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="">Todas</option><option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select>
          </label>
          <label class="text-sm font-medium text-gray-700">Estado
            <select v-model="status" class="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="">Todos</option><option value="active">Activas</option><option value="resolved">Resueltas</option></select>
          </label>
          <label class="text-sm font-medium text-gray-700">Nivel
            <select v-model="severity" class="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="">Todos</option><option v-for="option in severityOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select>
          </label>
          <label class="text-sm font-medium text-gray-700">Desde<input v-model="fromDate" type="date" class="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
          <label class="text-sm font-medium text-gray-700">Hasta<input v-model="toDate" type="date" class="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        <div class="mt-5 flex justify-end"><BaseButton @click="applyFilters"><MagnifyingGlassIcon class="h-4 w-4" /> Aplicar filtros</BaseButton></div>
      </BaseCard>

      <BaseCard padding="none" shadow="sm" class="overflow-hidden">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div><h2 class="font-semibold text-gray-900">Resultados</h2><p class="text-xs text-gray-500">Ordenados desde el evento más reciente.</p></div>
          <span class="text-xs font-medium text-gray-500">Página {{ page }}</span>
        </div>
        <BaseLoading v-if="loading" text="Cargando alertas..." class="py-20" />
        <div v-else-if="errorMessage" class="p-10 text-center">
          <ExclamationCircleIcon class="mx-auto h-10 w-10 text-red-400" /><p class="mt-3 text-sm text-red-700">{{ errorMessage }}</p><BaseButton class="mt-4" variant="outline" @click="loadAlerts">Reintentar</BaseButton>
        </div>
        <div v-else-if="alerts.length === 0" class="p-14 text-center">
          <BellSlashIcon class="mx-auto h-12 w-12 text-gray-300" /><p class="mt-3 font-medium text-gray-700">Sin alertas para mostrar</p><p class="mt-1 text-sm text-gray-500">No se encontraron eventos con los filtros seleccionados.</p>
        </div>
        <template v-else>
          <div class="grid gap-4 bg-gray-50/70 p-4 lg:grid-cols-2">
            <article v-for="alert in alerts" :key="alert.id" :class="['rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', alertBorderClass(alert.severity)]">
              <div class="flex items-start gap-3">
                <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', alertIconClass(alert.severity)]"><component :is="alertIcon(alert.severity)" class="h-5 w-5" /></div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2"><BaseBadge :variant="severityVariant(alert.severity)" size="sm">{{ severityLabel(alert.severity) }}</BaseBadge><BaseBadge :variant="alert.status === 'active' ? 'warning' : 'success'" size="sm">{{ alert.status === 'active' ? 'Activa' : 'Resuelta' }}</BaseBadge><span class="text-xs text-gray-400">#{{ alert.id }}</span></div>
                  <h3 class="mt-3 font-semibold text-gray-900">{{ alert.title }}</h3><p class="mt-1 text-sm leading-6 text-gray-600">{{ alert.message }}</p>
                </div>
              </div>
              <div class="mt-4 grid gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-2">
                <p class="flex items-center gap-2"><UserCircleIcon class="h-4 w-4 text-gray-400" />{{ alert.deliverymanName }}</p>
                <p class="flex items-center gap-2"><BuildingStorefrontIcon class="h-4 w-4 text-gray-400" />{{ alert.branchName }}</p>
                <p class="flex items-center gap-2 sm:col-span-2"><ClockIcon class="h-4 w-4 text-gray-400" />{{ formatDateTime(alert.occurredAt) }}<span v-if="alert.workSessionId">· Jornada #{{ alert.workSessionId }}</span><span v-if="alert.incidentId">· Incidente #{{ alert.incidentId }}</span></p>
              </div>
              <div v-if="hasTrackingEvidence(alert)" class="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-sky-900">
                <div class="grid gap-2 sm:grid-cols-2">
                  <p><span class="font-semibold">Inicio:</span> {{ formatDateTime(alert.occurredAt) }}</p>
                  <p><span class="font-semibold">Fin:</span> {{ evidenceEnd(alert) ? formatDateTime(evidenceEnd(alert)!) : 'Sin recuperación registrada' }}</p>
                  <p class="sm:col-span-2"><span class="font-semibold">Duración:</span> {{ formatDuration(alert.durationSeconds) }}</p>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <a v-if="mapUrl(alert.startLatitude, alert.startLongitude)" :href="mapUrl(alert.startLatitude, alert.startLongitude)!" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-sky-700 shadow-sm ring-1 ring-sky-200 hover:bg-sky-100">
                    <MapPinIcon class="h-4 w-4" />{{ alert.alertType === 'unexpected_stay' ? 'Ver lugar de permanencia' : 'Ver última ubicación antes del corte' }}
                  </a>
                  <a v-if="mapUrl(alert.endLatitude, alert.endLongitude)" :href="mapUrl(alert.endLatitude, alert.endLongitude)!" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-sky-700 shadow-sm ring-1 ring-sky-200 hover:bg-sky-100">
                    <MapPinIcon class="h-4 w-4" />Ver ubicación al recuperarse
                  </a>
                </div>
              </div>
              <div v-if="alert.status === 'resolved'" class="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800"><p class="font-medium">{{ alert.resolutionReason || 'Resuelta.' }}</p><p v-if="alert.resolvedAt" class="mt-1 text-emerald-700">{{ formatDateTime(alert.resolvedAt) }}<span v-if="alert.resolvedByUserName"> · {{ alert.resolvedByUserName }}</span></p></div>
              <div v-else class="mt-4 flex justify-end"><BaseButton size="sm" variant="outline" @click="openResolve(alert)">Marcar resuelta</BaseButton></div>
            </article>
          </div>
          <BasePagination :current-page="page" :total="totalCount" :per-page="pageSize" @change="changePage" />
        </template>
      </BaseCard>

      <BaseDialog v-model="resolveOpen" title="Resolver alerta" size="lg" :close-on-backdrop="!saving">
        <div class="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">La alerta quedará en el historial y será incluida en el resumen de auditoría diaria.</div>
        <label class="mt-4 block text-sm font-medium text-gray-700">Motivo o acción tomada<textarea v-model="resolutionReason" maxlength="500" rows="4" class="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="Describe brevemente qué se verificó o corrigió" /></label>
        <template #footer><BaseButton variant="outline" :disabled="saving" @click="resolveOpen = false">Cancelar</BaseButton><BaseButton :loading="saving" @click="confirmResolve">Resolver alerta</BaseButton></template>
      </BaseDialog>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BasePagination from '@/components/ui/BasePaginatiopn.vue'
import { ArrowPathIcon, BellSlashIcon, BuildingStorefrontIcon, ClockIcon, ExclamationCircleIcon, ExclamationTriangleIcon, FunnelIcon, InformationCircleIcon, MagnifyingGlassIcon, MapPinIcon, ShieldExclamationIcon, UserCircleIcon } from '@heroicons/vue/24/outline'
import { branchApi } from '@/services/MainAPI/branchApi'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import {
  deliveryTrackingAlertsApi,
  type DeliveryTrackingAlert,
  type DeliveryTrackingAlertSeverity,
  type DeliveryTrackingAlertStatus,
} from '@/services/MainAPI/deliveryTrackingAlertsApi'

const authStore = useAuthStore()
const toast = useToast()
const alerts = ref<DeliveryTrackingAlert[]>([])
const branches = ref<Array<{ id: number; name: string }>>([])
const loading = ref(false)
const errorMessage = ref('')
const page = ref(1)
const pageSize = 30
const totalCount = ref(0)
const branchId = ref('')
const status = ref<DeliveryTrackingAlertStatus | ''>('active')
const severity = ref<DeliveryTrackingAlertSeverity | ''>('')
const formatInputDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const now = new Date()
const fromDate = ref(formatInputDate(new Date(now.getTime() - 6 * 86400000)))
const toDate = ref(formatInputDate(now))
const resolveOpen = ref(false)
const selectedAlert = ref<DeliveryTrackingAlert | null>(null)
const resolutionReason = ref('')
const saving = ref(false)

const severityOptions: Array<{ value: DeliveryTrackingAlertSeverity; label: string }> = [
  { value: 'informational', label: 'Informativa' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'requires_review', label: 'Requiere revisión' },
  { value: 'critical', label: 'Crítica' },
]

function dateStart(value: string) { return value ? new Date(`${value}T00:00:00-05:00`).toISOString() : undefined }
function dayAfter(value: string) { if (!value) return undefined; const date = new Date(`${value}T00:00:00-05:00`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString() }

async function loadAlerts() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await deliveryTrackingAlertsApi.getAll({
      branchId: branchId.value ? Number(branchId.value) : undefined,
      status: status.value || undefined,
      severity: severity.value || undefined,
      from: dateStart(fromDate.value),
      to: dayAfter(toDate.value),
      page: page.value,
      pageSize,
    })
    alerts.value = response.data.items
    totalCount.value = response.data.totalCount
  } catch (error: any) {
    errorMessage.value = error.message || 'No fue posible cargar las alertas.'
  } finally {
    loading.value = false
  }
}

function applyFilters() { page.value = 1; void loadAlerts() }
function changePage(value: number) { page.value = value; void loadAlerts() }
function openResolve(alert: DeliveryTrackingAlert) { selectedAlert.value = alert; resolutionReason.value = ''; resolveOpen.value = true }
async function confirmResolve() {
  if (!selectedAlert.value) return
  saving.value = true
  try {
    await deliveryTrackingAlertsApi.resolve(selectedAlert.value.id, resolutionReason.value.trim() || null)
    resolveOpen.value = false
    toast.success('Alerta resuelta', 5000)
    await loadAlerts()
  } catch (error: any) {
    toast.error('No se pudo resolver la alerta', error.message)
  } finally {
    saving.value = false
  }
}
function severityLabel(value: DeliveryTrackingAlertSeverity) { return severityOptions.find(option => option.value === value)?.label || value }
function severityVariant(value: DeliveryTrackingAlertSeverity): 'info' | 'warning' | 'danger' { return value === 'critical' ? 'danger' : value === 'informational' ? 'info' : 'warning' }
function alertIcon(value: DeliveryTrackingAlertSeverity) { return value === 'informational' ? InformationCircleIcon : value === 'critical' ? ShieldExclamationIcon : ExclamationTriangleIcon }
function alertIconClass(value: DeliveryTrackingAlertSeverity) { return value === 'critical' ? 'bg-red-100 text-red-700' : value === 'informational' ? 'bg-blue-100 text-blue-700' : value === 'requires_review' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700' }
function alertBorderClass(value: DeliveryTrackingAlertSeverity) { return value === 'critical' ? 'border-red-200' : value === 'informational' ? 'border-blue-200' : value === 'requires_review' ? 'border-orange-200' : 'border-amber-200' }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value)) }
function hasTrackingEvidence(alert: DeliveryTrackingAlert) { return alert.alertType === 'gps_disabled' || alert.alertType === 'location_permission_revoked' || alert.alertType === 'unexpected_stay' }
function evidenceEnd(alert: DeliveryTrackingAlert) { return alert.recoveredAt || (alert.durationSeconds !== null ? alert.lastOccurredAt : null) }
function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null) return 'Pendiente'
  const seconds = Math.max(0, totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return hours > 0 ? `${hours} h ${minutes} min ${remainingSeconds} s` : minutes > 0 ? `${minutes} min ${remainingSeconds} s` : `${remainingSeconds} s`
}
function mapUrl(latitude: number | null, longitude: number | null) {
  return latitude === null || longitude === null ? null : `https://www.google.com/maps?q=${latitude},${longitude}`
}

onMounted(async () => {
  if (authStore.isSuperadmin) {
    try {
      const response = await branchApi.getBranches({ Page: 1, PageSize: 200, SortBy: 'name', SortOrder: 'asc' })
      branches.value = response.data.items.map(branch => ({ id: branch.id, name: branch.name }))
    } catch (error: any) {
      toast.error('No se pudieron cargar las sucursales', error.message)
    }
  }
  await loadAlerts()
})
</script>
