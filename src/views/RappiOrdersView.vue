<template>
  <MainLayout>
    <div class="space-y-5 p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">Incidencias y trazabilidad Rappi</h1>
          <p class="text-sm text-gray-500">Revisa órdenes, validaciones, descuentos y acciones recuperables.</p>
        </div>
        <BaseButton variant="outline" :loading="loading" @click="load">Actualizar</BaseButton>
      </div>

      <BaseAlert v-if="errorText" type="error">{{ errorText }}</BaseAlert>
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
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import { integrationApi } from '@/services/MainAPI/integrationApi'
import type { RappiExternalOrder } from '@/types/integrations'

const route = useRoute()
const router = useRouter()
const orders = ref<RappiExternalOrder[]>([])
const loading = ref(false)
const workingId = ref<number | null>(null)
const errorText = ref('')
const showReject = ref(false)
const rejectId = ref<number | null>(null)
const rejectReason = ref('The order has invalid items')

function branchId() {
  return route.query.branchId ? Number(route.query.branchId) : null
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    orders.value = (await integrationApi.getRappiOrders(branchId())).data
  } catch (error: any) {
    errorText.value = error.message
  } finally {
    loading.value = false
  }
}

async function revalidateAndAccept(id: number) {
  workingId.value = id
  errorText.value = ''
  try {
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
  if (!rejectId.value || !rejectReason.value.trim()) return
  workingId.value = rejectId.value
  errorText.value = ''
  try {
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
  if (normalized.includes('created') || normalized.includes('taken')) return 'bg-green-100 text-green-700'
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
