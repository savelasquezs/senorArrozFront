<template>
  <div class="contents">
    <div class="space-y-5 p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">Incidencias y trazabilidad Rappi</h1>
          <p class="text-sm text-gray-500">Revisa órdenes, validaciones, descuentos y acciones recuperables.</p>
        </div>
        <BaseButton variant="outline" :loading="loading" @click="load">Actualizar</BaseButton>
      </div>

      <BaseAlert v-if="errorText" type="error">{{ errorText }}</BaseAlert>
      <details v-if="eventsCount" class="rounded-lg border bg-white p-3">
        <summary class="cursor-pointer font-medium">{{ eventsCount }} eventos requieren revisión</summary>
        <div v-for="event in events" :key="event.id" class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
          <div>
            <p>{{ event.eventType }} · {{ event.status }} · {{ event.attemptCount }} intento(s)</p>
            <p v-if="event.error" class="text-red-700">{{ event.error }}</p>
            <p v-if="event.status === 'processing'" class="text-amber-700">Reclamo legado: revisar el resultado antes de recuperarlo.</p>
          </div>
          <BaseButton v-if="event.retryable" size="sm" variant="outline" :disabled="workingId !== null" @click="retryEvent(event.id)">Reintentar evento #{{ event.id }}</BaseButton>
        </div>
        <div v-if="eventsPages > 1" class="mt-3 flex items-center justify-end gap-2 text-sm">
          <BaseButton size="sm" variant="outline" :disabled="loading || eventsPage <= 1" @click="changeEventsPage(eventsPage - 1)">Anterior eventos</BaseButton>
          <span>{{ eventsPage }} / {{ eventsPages }}</span>
          <BaseButton size="sm" variant="outline" :disabled="loading || eventsPage >= eventsPages" @click="changeEventsPage(eventsPage + 1)">Siguiente eventos</BaseButton>
        </div>
      </details>
      <BaseLoading v-if="loading" text="Cargando órdenes Rappi..." />
      <div v-else-if="!orders.length" class="rounded-lg border border-dashed bg-white py-16 text-center text-gray-500">
        No hay órdenes Rappi recibidas.
      </div>

      <div v-else class="grid gap-4">
        <BaseCard v-for="order in orders" :key="order.id">
          <div class="flex flex-wrap justify-between gap-3">
            <div>
              <h2 class="font-semibold">Rappi #{{ order.externalOrderId }}</h2>
              <p class="text-sm text-gray-500">
                {{ order.storeName || 'Tienda sin identificar' }} · {{ order.customerName || 'Cliente Rappi' }}
              </p>
              <p v-if="order.customerPhone || order.deliveryAddress" class="text-sm text-gray-500">
                {{ order.customerPhone || 'Sin teléfono' }} · {{ order.deliveryAddress || 'Dirección administrada por Rappi' }}
              </p>
            </div>
            <div class="text-right">
              <p class="font-bold">{{ formatCurrency(order.total) }}</p>
              <span :class="statusClass(order.status)" class="rounded-full px-2 py-1 text-xs">
                {{ statusLabel(order.status) }}
              </span>
            </div>
          </div>

          <div class="mt-4 grid gap-3 text-sm md:grid-cols-5">
            <div>
              <p class="text-gray-500">Productos</p>
              <p class="font-medium">{{ formatCurrency(order.totalProducts) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Descuentos</p>
              <p class="font-medium">-{{ formatCurrency(order.totalDiscounts) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Asume Rappi</p>
              <p class="font-medium">{{ formatCurrency(order.totalDiscountByRappi) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Asume Señor Arroz</p>
              <p class="font-medium">{{ formatCurrency(order.totalDiscountByPartner) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Cargos</p>
              <p class="font-medium">{{ formatCurrency(order.totalCharges) }}</p>
            </div>
          </div>

          <BaseAlert v-if="order.validationErrors.length" type="warning" class="mt-4">
            <ul class="list-disc pl-5">
              <li v-for="validationError in order.validationErrors" :key="validationError">
                {{ validationError }}
              </li>
            </ul>
          </BaseAlert>
          <BaseAlert v-if="order.lastError" type="error" class="mt-4">{{ order.lastError }}</BaseAlert>
          <div v-if="order.readyForPickup" class="mt-4 rounded-lg border p-3 text-sm">
            <p>Envío de Listo: <strong>{{ readyLabel(order.readyForPickup.status) }}</strong> · {{ order.readyForPickup.attemptCount }} intento(s)</p>
            <p v-if="order.readyForPickup.error" class="mt-1 text-red-700">{{ order.readyForPickup.error }}</p>
            <BaseButton
              v-if="order.readyForPickup.retryable" size="sm" variant="outline" class="mt-2"
              :loading="workingId === order.id" :disabled="workingId !== null"
              @click="retryReady(order.id)"
            >Reintentar envío de Listo</BaseButton>
          </div>

          <details class="mt-4 rounded-lg border p-3">
            <summary class="cursor-pointer font-medium">Productos y descuentos</summary>
            <div class="mt-3 space-y-2">
              <div v-for="line in order.lines" :key="`${line.sku}-${line.name}`" class="flex justify-between gap-3 border-b pb-2">
                <div>
                  <p>{{ line.quantity }} × {{ line.name }}</p>
                  <p class="text-xs text-gray-500">{{ line.sku }}<span v-if="line.notes"> · {{ line.notes }}</span></p>
                  <p v-for="subitem in line.subitems || []" :key="`${subitem.sku}-${subitem.name}`" class="ml-4 text-xs text-amber-700">
                    Modificador: {{ subitem.quantity }} × {{ subitem.name }} ({{ subitem.sku }})
                  </p>
                </div>
                <p>{{ formatCurrency((line.total ?? line.unitPrice * line.quantity)) }}</p>
              </div>
              <div v-if="order.discounts.length" class="pt-2">
                <p v-for="(discount, index) in order.discounts" :key="index" class="text-sm">
                  {{ discount.type || 'Descuento' }}:
                  {{ formatCurrency(discount.value) }}
                  · Rappi {{ formatCurrency(discount.amountByRappi || 0) }}
                  · aliado {{ formatCurrency(discount.amountByPartner || 0) }}
                </p>
              </div>
            </div>
          </details>

          <div class="mt-4 flex flex-wrap justify-end gap-2">
            <BaseButton
              v-if="order.internalOrderId"
              size="sm"
              variant="outline"
              @click="openInternalOrder(order.internalOrderId)"
            >
              Abrir pedido interno
            </BaseButton>
            <BaseButton
              v-if="canResolve(order.status)"
              size="sm"
              variant="outline"
              :loading="workingId === order.id"
              @click="revalidateAndAccept(order.id)"
            >
              Revalidar y aceptar
            </BaseButton>
            <BaseButton
              v-if="canResolve(order.status)"
              size="sm"
              variant="danger"
              :loading="workingId === order.id"
              @click="openReject(order.id)"
            >
              Rechazar
            </BaseButton>
          </div>
        </BaseCard>
      </div>
      <div v-if="totalCount" class="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>{{ totalCount }} órdenes · Página {{ page }} de {{ totalPages }}</p>
        <div class="flex gap-2">
          <BaseButton variant="outline" size="sm" :disabled="loading || page <= 1" @click="changePage(page - 1)">Anterior</BaseButton>
          <BaseButton variant="outline" size="sm" :disabled="loading || page >= totalPages" @click="changePage(page + 1)">Siguiente</BaseButton>
        </div>
      </div>
    </div>

    <BaseDialog v-model="showReject" title="Rechazar orden Rappi" size="lg">
      <form class="space-y-4" @submit.prevent="reject">
        <label class="block text-sm font-medium">
          Motivo
          <textarea
            v-model="rejectReason"
            required
            maxlength="200"
            rows="4"
            class="mt-1 w-full rounded-lg border border-gray-300 p-3"
          />
        </label>
        <BaseAlert type="warning">Rappi validará si la orden todavía permite esta transición.</BaseAlert>
        <div class="flex justify-end gap-2">
          <BaseButton type="button" variant="outline" @click="showReject = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="danger" :loading="workingId === rejectId">Confirmar rechazo</BaseButton>
        </div>
      </form>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { createLatestRead } from '@/helpers/latestRead'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { integrationApi } from '@/services/MainAPI/integrationApi'
import type { RappiExternalOrder, RappiWebhookDiagnostic } from '@/types/integrations'

const route = useRoute()
const router = useRouter()
const orders = ref<RappiExternalOrder[]>([])
const page = ref(1)
const totalCount = ref(0)
const totalPages = ref(1)
const events = ref<RappiWebhookDiagnostic[]>([])
const eventsPage = ref(1)
const eventsPages = ref(1)
const eventsCount = ref(0)
const loading = ref(false)
const workingId = ref<number | null>(null)
const errorText = ref('')
const showReject = ref(false)
const rejectId = ref<number | null>(null)
const rejectReason = ref('The order has invalid items')

function branchId() {
  return route.query.branchId ? Number(route.query.branchId) : null
}

const listRead = createLatestRead()
onUnmounted(() => listRead.invalidate())
watch(() => route.query.branchId, () => {
  page.value = 1
  eventsPage.value = 1
  orders.value = []
  events.value = []
  totalCount.value = 0
  eventsCount.value = 0
  void load()
})
async function load() {
  const request = listRead.begin()
  loading.value = true
  errorText.value = ''
  try {
    const [response, diagnostics] = await Promise.allSettled([
      integrationApi.getRappiOrders(branchId(), request.signal, page.value),
      integrationApi.getRappiEvents(branchId(), request.signal, eventsPage.value),
    ])
    if (request.isCurrent()) {
      if (response.status === 'fulfilled') {
        orders.value = response.value.data.items
        totalCount.value = response.value.data.totalCount
        totalPages.value = Math.max(1, response.value.data.totalPages)
      } else errorText.value = response.reason?.message || 'No fue posible cargar las órdenes Rappi.'
      if (diagnostics.status === 'fulfilled') {
        events.value = diagnostics.value.data.items
        eventsCount.value = diagnostics.value.data.totalCount
        eventsPages.value = Math.max(1, diagnostics.value.data.totalPages)
      } else errorText.value = [errorText.value, 'No fue posible cargar los eventos Rappi.'].filter(Boolean).join(' ')
    }
  } catch (error: any) {
    if (request.isCurrent()) errorText.value = error.message
  } finally {
    if (request.isCurrent()) loading.value = false
  }
}

async function revalidateAndAccept(id: number) {
  if (workingId.value != null) return
  workingId.value = id
  errorText.value = ''
  try {
    listRead.invalidate(); loading.value = false
    const response = await integrationApi.revalidateAndAcceptRappiOrder(id)
    await load()
    if (response.data.internalOrderId) {
      await router.push(`/orders/${response.data.internalOrderId}`)
    }
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    workingId.value = null
  }
}

function openReject(id: number) {
  rejectId.value = id
  rejectReason.value = 'The order has invalid items'
  showReject.value = true
}

async function reject() {
  if (workingId.value != null || !rejectId.value || !rejectReason.value.trim()) return
  workingId.value = rejectId.value
  errorText.value = ''
  try {
    listRead.invalidate(); loading.value = false
    await integrationApi.rejectRappiOrder(rejectId.value, rejectReason.value.trim())
    showReject.value = false
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    workingId.value = null
  }
}

function openInternalOrder(id: number) {
  void router.push(`/orders/${id}`)
}

function changePage(value: number) {
  page.value = value
  void load()
}

function changeEventsPage(value: number) {
  eventsPage.value = value
  void load()
}

async function retryEvent(id: number) {
  if (workingId.value !== null) return
  workingId.value = id
  errorText.value = ''
  try {
    listRead.invalidate()
    await integrationApi.retryRappiWebhook(id)
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    workingId.value = null
  }
}

async function retryReady(id: number) {
  if (workingId.value !== null) return
  workingId.value = id
  errorText.value = ''
  try {
    listRead.invalidate()
    await integrationApi.retryRappiReadyForPickup(id)
    await load()
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    workingId.value = null
  }
}

function readyLabel(status: string) {
  const labels: Record<string, string> = {
    outbox_pending: 'Pendiente', outbox_processing: 'Enviando', processed: 'Enviado',
    outbox_failed: 'Falló', outbox_skipped: 'No aplica',
    outbox_review_required: 'Revisar en Rappi', outbox_retry_approved: 'Reintento pendiente',
  }
  return labels[status] || status
}

function canResolve(status: string) {
  const normalized = status.toLowerCase()
  return normalized.includes('pending')
    || normalized.includes('blocked')
    || normalized.includes('sync_error')
    || normalized.includes('syncerror')
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_acceptance: 'Pendiente',
    blocked_mapping: 'Retenida',
    sync_error: 'Error de sincronización',
    processing: 'Aceptación en proceso',
    accepted: 'Aceptada',
    taken: 'Tomada en Rappi',
    created: 'Creada',
    rejected: 'Rechazada',
    expired: 'Expirada',
    reconciliation_required: 'Requiere conciliación',
    cancelled: 'Cancelada',
  }
  const key = status.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
  return labels[key] || status
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('created') || normalized.includes('taken') || normalized === 'accepted') return 'bg-green-100 text-green-700'
  if (normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('expired')) return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

onMounted(load)
</script>
