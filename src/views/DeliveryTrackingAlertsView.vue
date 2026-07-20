<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Alertas de seguimiento</h1>
        <p class="mt-1 text-sm text-gray-500">Hechos técnicos y operativos que requieren atención durante la jornada.</p>
      </div>
      <BaseButton variant="outline" :loading="loading" @click="loadAlerts">Actualizar</BaseButton>
    </div>

    <BaseCard>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label v-if="authStore.isSuperadmin" class="text-sm font-medium text-gray-700">Sucursal
          <select v-model="branchId" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">Todas</option><option v-for="branch in branches" :key="branch.id" :value="String(branch.id)">{{ branch.name }}</option></select>
        </label>
        <label class="text-sm font-medium text-gray-700">Estado
          <select v-model="status" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">Todos</option><option value="active">Activas</option><option value="resolved">Resueltas</option></select>
        </label>
        <label class="text-sm font-medium text-gray-700">Nivel
          <select v-model="severity" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">Todos</option><option v-for="option in severityOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select>
        </label>
        <label class="text-sm font-medium text-gray-700">Desde<input v-model="fromDate" type="date" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" /></label>
        <label class="text-sm font-medium text-gray-700">Hasta<input v-model="toDate" type="date" class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" /></label>
      </div>
      <div class="mt-4 flex justify-end"><BaseButton @click="applyFilters">Aplicar filtros</BaseButton></div>
    </BaseCard>

    <BaseCard padding="none">
      <BaseLoading v-if="loading" text="Cargando alertas..." class="py-16" />
      <div v-else-if="errorMessage" class="p-8 text-center text-sm text-red-700">{{ errorMessage }}</div>
      <div v-else-if="alerts.length === 0" class="p-12 text-center text-sm text-gray-500">No hay alertas con los filtros seleccionados.</div>
      <template v-else>
        <div class="divide-y divide-gray-100">
          <article v-for="alert in alerts" :key="alert.id" class="p-4 sm:p-5">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <BaseBadge :variant="severityVariant(alert.severity)" size="sm">{{ severityLabel(alert.severity) }}</BaseBadge>
                  <BaseBadge :variant="alert.status === 'active' ? 'warning' : 'success'" size="sm">{{ alert.status === 'active' ? 'Activa' : 'Resuelta' }}</BaseBadge>
                  <span class="text-xs text-gray-400">#{{ alert.id }}</span>
                </div>
                <h2 class="mt-2 font-semibold text-gray-900">{{ alert.title }}</h2>
                <p class="mt-1 text-sm text-gray-700">{{ alert.message }}</p>
                <p class="mt-2 text-xs text-gray-500">
                  {{ alert.deliverymanName }} · {{ alert.branchName }}
                  <span v-if="alert.workSessionId"> · Jornada #{{ alert.workSessionId }}</span>
                  <span v-if="alert.incidentId"> · Incidente #{{ alert.incidentId }}</span>
                </p>
                <p class="mt-1 text-xs text-gray-500">{{ formatDateTime(alert.occurredAt) }}</p>
                <div v-if="alert.status === 'resolved'" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  {{ alert.resolutionReason || 'Resuelta.' }}
                  <span v-if="alert.resolvedAt"> · {{ formatDateTime(alert.resolvedAt) }}</span>
                  <span v-if="alert.resolvedByUserName"> · {{ alert.resolvedByUserName }}</span>
                </div>
              </div>
              <BaseButton v-if="alert.status === 'active'" size="sm" variant="outline" @click="openResolve(alert)">Marcar resuelta</BaseButton>
            </div>
          </article>
        </div>
        <BasePagination :current-page="page" :total="totalCount" :per-page="pageSize" @change="changePage" />
      </template>
    </BaseCard>

    <BaseDialog v-model="resolveOpen" title="Resolver alerta" size="lg" :close-on-backdrop="!saving">
      <p class="text-sm text-gray-600">La alerta quedará en el historial y será incluida en el resumen de auditoría.</p>
      <label class="mt-4 block text-sm font-medium text-gray-700">Motivo o acción tomada
        <textarea v-model="resolutionReason" maxlength="500" rows="4" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Opcional" />
      </label>
      <template #footer>
        <BaseButton variant="outline" :disabled="saving" @click="resolveOpen = false">Cancelar</BaseButton>
        <BaseButton :loading="saving" @click="confirmResolve">Resolver</BaseButton>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BasePagination from '@/components/ui/BasePaginatiopn.vue'
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
function formatDateTime(value: string) { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value)) }

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
