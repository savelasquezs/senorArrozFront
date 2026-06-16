<template>
  <BaseDialog
    v-model="open"
    title="Historial de cuadres de caja"
    size="7xl"
    :show-close-button="true"
    @update:model-value="onOpenChange"
  >
    <div class="space-y-4 -mt-2">
      <p class="text-sm text-gray-500">Consulta de cuadres guardados. Solo lectura.</p>

      <div v-if="loadError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ loadError }}
      </div>

      <div v-if="loading" class="flex justify-center py-12 text-sm text-gray-500">
        Cargando...
      </div>

      <template v-else>
        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th class="px-3 py-2">Cierre</th>
                <th class="px-3 py-2">Sucursal</th>
                <th class="px-3 py-2 text-right">Apertura</th>
                <th class="px-3 py-2 text-right">Contado</th>
                <th class="px-3 py-2">Auditoría</th>
                <th class="px-3 py-2">Registró</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="row in items"
                :key="row.id"
                :class="['cursor-pointer transition-colors hover:bg-gray-50', selected?.id === row.id ? 'bg-amber-50' : '']"
                @click="selectRow(row)"
              >
                <td class="whitespace-nowrap px-3 py-2">{{ formatDate(row.closedAt) }}</td>
                <td class="px-3 py-2">{{ row.branchName }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.openingCash) }}</td>
                <td class="px-3 py-2 text-right tabular-nums font-medium">{{ formatCurrency(row.closingCash) }}</td>
                <td class="px-3 py-2">
                  <span :class="auditStatusClass(row.auditDispatchStatus)" class="rounded-full px-2 py-1 text-xs font-medium">
                    {{ auditStatusLabel(row.auditDispatchStatus) }}
                  </span>
                </td>
                <td class="max-w-[180px] truncate px-3 py-2" :title="row.createdByName">{{ row.createdByName }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="items.length === 0" class="py-8 text-center text-sm text-gray-400">No hay cuadres registrados.</div>

        <div v-if="totalPages > 1" class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="text-gray-500">{{ totalCount }} registro(s) · Página {{ page }} de {{ totalPages }}</span>
          <div class="flex gap-2">
            <BaseButton variant="outline" size="sm" :disabled="page <= 1 || loading" @click="goPage(page - 1)">
              Anterior
            </BaseButton>
            <BaseButton variant="outline" size="sm" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">
              Siguiente
            </BaseButton>
          </div>
        </div>

        <div v-if="selected" class="mt-6 overflow-hidden rounded-xl border border-gray-200">
          <div class="bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800">Detalle del cuadre #{{ selected.id }}</div>
          <div class="max-h-[65vh] space-y-6 overflow-y-auto p-4">
            <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
              <div>
                <dt class="text-gray-500">Fecha / hora cierre</dt>
                <dd class="font-medium">{{ formatDate(selected.closedAt) }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Grabado en sistema</dt>
                <dd class="font-medium">{{ formatDate(selected.createdAt) }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Usuario</dt>
                <dd class="font-medium">{{ selected.createdByName }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Efectivo apertura</dt>
                <dd class="font-medium tabular-nums">{{ formatCurrency(selected.openingCash) }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Efectivo contado</dt>
                <dd class="font-medium tabular-nums">{{ formatCurrency(selected.closingCash) }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Auditoría monetaria</dt>
                <dd>
                  <span :class="auditStatusClass(selected.auditDispatchStatus)" class="rounded-full px-2 py-1 text-xs font-medium">
                    {{ auditStatusLabel(selected.auditDispatchStatus) }}
                  </span>
                </dd>
              </div>
            </dl>

            <div>
              <h4 class="mb-2 text-sm font-semibold text-gray-800">Denominaciones</h4>
              <div class="overflow-x-auto rounded-lg border border-gray-100">
                <table class="min-w-full text-sm">
                  <thead class="bg-yellow-50 text-xs text-gray-600">
                    <tr>
                      <th class="px-3 py-2 text-left">Valor</th>
                      <th class="px-3 py-2 text-right">Cantidad</th>
                      <th class="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="line in denominationLines" :key="line.denom">
                      <td class="px-3 py-1.5">{{ formatCurrency(line.denom) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ line.qty }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(line.subtotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 class="mb-2 text-sm font-semibold text-gray-800">Bancos</h4>
              <div class="overflow-x-auto rounded-lg border border-gray-100">
                <table class="min-w-full text-sm">
                  <thead class="bg-blue-50 text-xs text-gray-600">
                    <tr>
                      <th class="px-3 py-2 text-left">Banco</th>
                      <th class="px-3 py-2 text-right">Esperado</th>
                      <th class="px-3 py-2 text-right">Real</th>
                      <th class="px-3 py-2 text-right">Dif.</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="br in selected.bankReconciliations" :key="br.id">
                      <td class="px-3 py-1.5">{{ br.bankName }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(br.expectedBalance) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(br.actualBalance) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(br.difference) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="pendingAppLines.length > 0">
              <h4 class="mb-2 text-sm font-semibold text-gray-800">Apps pendientes por liquidar</h4>
              <div class="overflow-x-auto rounded-lg border border-gray-100">
                <table class="min-w-full text-sm">
                  <thead class="bg-violet-50 text-xs text-gray-600">
                    <tr>
                      <th class="px-3 py-2 text-left">App</th>
                      <th class="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="line in pendingAppLines" :key="line.appId">
                      <td class="px-3 py-1.5">{{ line.appName }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(line.amount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 class="mb-2 text-sm font-semibold text-gray-800">Préstamos informales</h4>
              <div v-if="!selected.informalLoans?.length" class="text-sm text-gray-400">Ninguno</div>
              <div v-else class="overflow-x-auto rounded-lg border border-gray-100">
                <table class="min-w-full text-sm">
                  <thead class="bg-orange-50 text-xs text-gray-600">
                    <tr>
                      <th class="px-3 py-2 text-left">Concepto</th>
                      <th class="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="loan in selected.informalLoans" :key="loan.id">
                      <td class="px-3 py-1.5">{{ loan.concept }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(loan.amount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
              <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 class="text-sm font-semibold text-gray-900">Auditoría monetaria</h4>
                  <p class="text-xs text-gray-600">
                    Fecha auditada: {{ auditSummary?.businessDate || selected.auditBusinessDate || 'N/A' }}
                    <span v-if="auditSummary"> · período {{ formatDate(auditSummary.periodStartUtc) }} a {{ formatDate(auditSummary.periodEndUtc) }}</span>
                  </p>
                </div>
                <div class="text-xs text-gray-600" v-if="auditSummary?.recipientEmails?.length">
                  Destinatarios: {{ auditSummary.recipientEmails.join(', ') }}
                </div>
              </div>

              <div v-if="auditLoading" class="py-8 text-center text-sm text-gray-500">Cargando auditoría...</div>
              <div v-else-if="auditError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ auditError }}</div>
              <template v-else-if="auditSummary">
                <div class="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div v-for="group in auditSummary.groups" :key="group.key" class="rounded-lg border border-white/80 bg-white/80 p-3">
                    <div class="text-sm font-semibold text-gray-900">{{ group.title }}</div>
                    <div class="mt-1 text-xs text-gray-500">{{ group.eventCount }} evento(s)</div>
                    <div class="mt-2 text-sm font-medium tabular-nums text-rose-900">{{ formatCurrency(group.netDifference) }}</div>
                  </div>
                </div>

                <div class="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select v-model="entityFilter" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="all">Todas las entidades</option>
                    <option value="order">Pedidos</option>
                    <option value="expense_header">Gastos</option>
                  </select>
                  <select v-model="operationFilter" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="all">Todas las operaciones</option>
                    <option value="modified">Modificado</option>
                    <option value="deleted">Eliminado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                  <input
                    v-model.trim="searchTerm"
                    type="text"
                    class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Buscar por usuario o id"
                  />
                </div>

                <div class="overflow-x-auto rounded-lg border border-rose-100 bg-white">
                  <table class="min-w-full text-sm">
                    <thead class="bg-rose-100/70 text-xs text-gray-700">
                      <tr>
                        <th class="px-3 py-2 text-left">Hora</th>
                        <th class="px-3 py-2 text-left">Usuario</th>
                        <th class="px-3 py-2 text-left">Entidad</th>
                        <th class="px-3 py-2 text-left">Operación</th>
                        <th class="px-3 py-2 text-right">Antes</th>
                        <th class="px-3 py-2 text-right">Después</th>
                        <th class="px-3 py-2 text-right">Dif.</th>
                        <th class="px-3 py-2 text-left">Detalle</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-rose-50">
                      <tr v-for="event in filteredAuditEvents" :key="event.id">
                        <td class="whitespace-nowrap px-3 py-2">{{ formatHour(event.changedAt) }}</td>
                        <td class="px-3 py-2">{{ event.userName }}</td>
                        <td class="px-3 py-2">{{ entityLabel(event.entityType) }} #{{ event.entityId }}</td>
                        <td class="px-3 py-2">{{ operationLabel(event.operationType) }}</td>
                        <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(event.totalBefore ?? 0) }}</td>
                        <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(event.totalAfter ?? 0) }}</td>
                        <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(event.difference) }}</td>
                        <td class="px-3 py-2 text-xs text-gray-700">{{ event.summaryText }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <BaseButton variant="outline" @click="open = false">Cerrar</BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import type { CashClosure, CashClosureAuditEvent, CashClosureAuditSummary } from '@/types/cashRegister'
import { DENOMINATIONS } from '@/types/cashRegister'
import { defaultBusinessCalendar } from '@/utils/datetime'

const props = defineProps<{
  modelValue: boolean
  branchId?: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const loading = ref(false)
const loadError = ref('')
const items = ref<CashClosure[]>([])
const page = ref(1)
const pageSize = ref(15)
const totalCount = ref(0)
const totalPages = ref(0)
const selected = ref<CashClosure | null>(null)

const auditLoading = ref(false)
const auditError = ref('')
const auditSummary = ref<CashClosureAuditSummary | null>(null)
const entityFilter = ref<'all' | 'order' | 'expense_header'>('all')
const operationFilter = ref<'all' | 'modified' | 'deleted' | 'cancelled'>('all')
const searchTerm = ref('')

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)
}

function formatDate(iso: string): string {
  return defaultBusinessCalendar.formatDateMediumTime(iso)
}

function formatHour(iso: string): string {
  return defaultBusinessCalendar.formatTime(iso)
}

function parseDenominationCounts(raw: string): Record<number, number> {
  try {
    const parsed = JSON.parse(raw || '{}') as Record<string, number>
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [Number(key), value]))
  } catch {
    return {}
  }
}

const denominationLines = computed(() => {
  if (!selected.value) return []
  const counts = parseDenominationCounts(selected.value.denominationCounts)
  return DENOMINATIONS.map((denom) => ({
    denom,
    qty: counts[denom] ?? 0,
    subtotal: denom * (counts[denom] ?? 0),
  }))
})

const pendingAppLines = computed(() => {
  const raw = selected.value?.pendingAppPaymentsSnapshot?.trim()
  if (!raw || raw === '[]') return []
  try {
    return JSON.parse(raw) as Array<{ appId: number; appName: string; amount: number }>
  } catch {
    return []
  }
})

const filteredAuditEvents = computed(() => {
  const term = searchTerm.value.toLowerCase()
  return (auditSummary.value?.events ?? []).filter((event) => {
    const matchesEntity = entityFilter.value === 'all' || event.entityType === entityFilter.value
    const matchesOperation = operationFilter.value === 'all' || event.operationType === operationFilter.value
    const matchesSearch =
      !term ||
      event.userName.toLowerCase().includes(term) ||
      String(event.entityId).includes(term) ||
      event.summaryText.toLowerCase().includes(term)
    return matchesEntity && matchesOperation && matchesSearch
  })
})

function entityLabel(value: string): string {
  return value === 'expense_header' ? 'Gasto' : 'Pedido'
}

function operationLabel(value: string): string {
  if (value === 'deleted') return 'Eliminado'
  if (value === 'cancelled') return 'Cancelado'
  return 'Modificado'
}

function auditStatusLabel(status: string): string {
  if (status === 'sent') return 'Enviado'
  if (status === 'already_sent') return 'Ya enviado'
  if (status === 'failed') return 'Error'
  return 'Pendiente'
}

function auditStatusClass(status: string): string {
  if (status === 'sent') return 'bg-emerald-100 text-emerald-800'
  if (status === 'already_sent') return 'bg-blue-100 text-blue-800'
  if (status === 'failed') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-700'
}

function onOpenChange(value: boolean) {
  if (!value) {
    selected.value = null
    auditSummary.value = null
    loadError.value = ''
    auditError.value = ''
  }
}

async function selectRow(row: CashClosure) {
  selected.value = row
  entityFilter.value = 'all'
  operationFilter.value = 'all'
  searchTerm.value = ''
  auditLoading.value = true
  auditError.value = ''
  try {
    auditSummary.value = await cashRegisterApi.getClosureAuditSummary(row.id)
  } catch (error: any) {
    auditSummary.value = null
    auditError.value = error?.message || 'No se pudo cargar la auditoría monetaria.'
  } finally {
    auditLoading.value = false
  }
}

async function loadClosures(targetPage: number) {
  loading.value = true
  loadError.value = ''
  try {
    const response = await cashRegisterApi.getClosures(props.branchId ?? undefined, targetPage, pageSize.value)
    items.value = response.items
    page.value = response.page
    totalCount.value = response.totalCount
    totalPages.value = response.totalPages
    if (!selected.value && response.items[0]) {
      await selectRow(response.items[0])
    }
  } catch (error: any) {
    items.value = []
    selected.value = null
    loadError.value = error?.message || 'No se pudo cargar el historial.'
  } finally {
    loading.value = false
  }
}

function goPage(targetPage: number) {
  if (targetPage < 1 || targetPage > totalPages.value) return
  void loadClosures(targetPage)
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      page.value = 1
      void loadClosures(1)
    }
  }
)
</script>
