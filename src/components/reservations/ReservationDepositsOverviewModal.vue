<template>
  <div class="inline-flex">
    <BaseButton type="button" variant="outline" size="sm" @click="openModal">
      Ver abonos
    </BaseButton>
  </div>

  <BaseDialog v-model="open" title="Abonos de reservas" size="xl">
    <div class="space-y-4">
      <div class="flex flex-wrap items-end gap-2">
        <BaseInput
          v-model.number="orderIdFilter"
          type="number"
          :min="1"
          placeholder="Pedido #"
          class="w-28"
          @change="applyFilters"
        />
        <BaseInput
          v-model="fromDate"
          type="date"
          class="w-36"
          @change="applyFilters"
        />
        <BaseInput
          v-model="toDate"
          type="date"
          class="w-36"
          @change="applyFilters"
        />
        <BaseButton
          v-if="orderIdFilter || fromDate || toDate"
          variant="ghost"
          size="sm"
          @click="clearFilters"
        >
          Limpiar
        </BaseButton>
      </div>

      <div v-if="loading" class="text-sm text-gray-500">Cargando abonos...</div>
      <div v-else-if="paged.items.length === 0" class="text-sm text-gray-500">
        No hay abonos para los filtros seleccionados.
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="deposit in paged.items"
          :key="deposit.id"
          class="rounded-lg border border-gray-200 p-3 space-y-2"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <ReservationDepositCompactRow :deposit="deposit" />
            <span class="text-xs text-gray-500">
              {{ formatDateTimeCompact(deposit.receivedAt) }}
            </span>
          </div>
          <div class="text-sm text-gray-700">
            <span class="font-medium text-gray-900">Pedido #{{ deposit.orderId }}</span>
            <span v-if="orderLabelById[deposit.orderId]"> · {{ orderLabelById[deposit.orderId] }}</span>
            <span v-if="orderReservedForById[deposit.orderId]">
              · Entrega: {{ formatDateTimeCompact(orderReservedForById[deposit.orderId] as string) }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="paged.totalPages > 1" class="flex items-center justify-between pt-2">
        <p class="text-xs text-gray-600">
          Página {{ paged.page }} de {{ paged.totalPages }} · {{ paged.totalCount }} abonos
        </p>
        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="loading || !paged.hasPreviousPage"
            @click="changePage(paged.page - 1)"
          >
            Anterior
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            :disabled="loading || !paged.hasNextPage"
            @click="changePage(paged.page + 1)"
          >
            Siguiente
          </BaseButton>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { reservationDepositApi } from '@/services/MainAPI/reservationDepositApi'
import { orderApi } from '@/services/MainAPI/orderApi'
import type { PagedResult } from '@/types/common'
import type { ReservationDeposit } from '@/types/reservationDeposit'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ReservationDepositCompactRow from '@/components/reservations/ReservationDepositCompactRow.vue'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'

type OrderMeta = {
  label: string
  reservedFor: string | null
}

const { formatDateTimeCompact } = useFormatting()
const { error } = useToast()

const open = ref(false)
const loading = ref(false)
const orderIdFilter = ref<number | null>(null)
const fromDate = ref('')
const toDate = ref('')
const pageSize = 20
const orderMetaById = ref<Record<number, OrderMeta>>({})

const emptyPaged = (): PagedResult<ReservationDeposit> => ({
  items: [],
  totalCount: 0,
  page: 1,
  pageSize,
  totalPages: 0,
  hasPreviousPage: false,
  hasNextPage: false,
})

const paged = ref<PagedResult<ReservationDeposit>>(emptyPaged())

const orderLabelById = ref<Record<number, string>>({})
const orderReservedForById = ref<Record<number, string | null>>({})

const syncOrderViews = () => {
  const labels: Record<number, string> = {}
  const reserved: Record<number, string | null> = {}
  for (const [idRaw, meta] of Object.entries(orderMetaById.value)) {
    const id = Number(idRaw)
    labels[id] = meta.label
    reserved[id] = meta.reservedFor
  }
  orderLabelById.value = labels
  orderReservedForById.value = reserved
}

const openModal = async () => {
  open.value = true
  if (paged.value.items.length === 0) {
    await fetchPaged(1)
  }
}

const fetchPaged = async (page: number) => {
  loading.value = true
  try {
    const response = await reservationDepositApi.getPaged({
      page,
      pageSize,
      fromDate: fromDate.value || undefined,
      toDate: toDate.value || undefined,
      orderId: orderIdFilter.value != null && orderIdFilter.value > 0 ? orderIdFilter.value : undefined,
    })
    paged.value = response
    await enrichOrderMeta(response.items)
  } catch (err: any) {
    error('Error al cargar abonos', err.message || 'No se pudo cargar el listado')
  } finally {
    loading.value = false
  }
}

const enrichOrderMeta = async (items: ReservationDeposit[]) => {
  const missingOrderIds = [...new Set(items.map((d) => d.orderId))].filter((id) => !(id in orderMetaById.value))
  if (missingOrderIds.length === 0) return

  const settled = await Promise.allSettled(missingOrderIds.map((id) => orderApi.getOrderById(id)))
  const next = { ...orderMetaById.value }

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    const orderId = missingOrderIds[i]
    if (result.status === 'fulfilled') {
      const order = result.value
      const label = order.customerName || order.guestName || 'Sin nombre'
      next[orderId] = {
        label,
        reservedFor: order.reservedFor ? String(order.reservedFor) : null,
      }
    } else {
      next[orderId] = {
        label: 'Pedido no disponible',
        reservedFor: null,
      }
    }
  }

  orderMetaById.value = next
  syncOrderViews()
}

const applyFilters = async () => {
  await fetchPaged(1)
}

const clearFilters = async () => {
  orderIdFilter.value = null
  fromDate.value = ''
  toDate.value = ''
  await fetchPaged(1)
}

const changePage = async (page: number) => {
  if (page < 1 || page > paged.value.totalPages) return
  await fetchPaged(page)
}
</script>
