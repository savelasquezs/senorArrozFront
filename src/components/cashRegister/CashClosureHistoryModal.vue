<template>
  <BaseDialog
    v-model="open"
    title="Historial de cuadres de caja"
    size="7xl"
    :show-close-button="true"
    @update:model-value="onOpenChange"
  >
    <div class="space-y-4 -mt-2">
      <p class="text-sm text-gray-500">
        Consulta de cuadres guardados. Solo lectura.
      </p>

      <div v-if="loadError" class="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">
        {{ loadError }}
      </div>

      <div v-if="loading" class="flex justify-center py-12 text-gray-500 text-sm">
        Cargando…
      </div>

      <template v-else>
        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th class="px-3 py-2">Cierre</th>
                <th class="px-3 py-2">Sucursal</th>
                <th class="px-3 py-2 text-right">Apertura</th>
                <th class="px-3 py-2 text-right">Contado</th>
                <th class="px-3 py-2">Registró</th>
                <th class="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="row in items"
                :key="row.id"
                :class="[
                  'hover:bg-gray-50 cursor-pointer transition-colors',
                  selected?.id === row.id ? 'bg-amber-50' : '',
                ]"
                @click="selectRow(row)"
              >
                <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.closedAt) }}</td>
                <td class="px-3 py-2">{{ row.branchName }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.openingCash) }}</td>
                <td class="px-3 py-2 text-right tabular-nums font-medium">{{ formatCurrency(row.closingCash) }}</td>
                <td class="px-3 py-2 max-w-[180px] truncate" :title="row.createdByName">{{ row.createdByName }}</td>
                <td class="px-3 py-2">
                  <span class="text-amber-700 text-xs font-medium">Ver abajo</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="items.length === 0" class="text-center py-8 text-gray-400 text-sm">
          No hay cuadres registrados.
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between gap-2 flex-wrap text-sm">
          <span class="text-gray-500">
            {{ totalCount }} registro(s) · Página {{ page }} de {{ totalPages }}
          </span>
          <div class="flex gap-2">
            <BaseButton variant="outline" size="sm" :disabled="page <= 1 || loading" @click="goPage(page - 1)">
              Anterior
            </BaseButton>
            <BaseButton variant="outline" size="sm" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">
              Siguiente
            </BaseButton>
          </div>
        </div>

        <div v-if="selected" class="mt-6 border border-gray-200 rounded-xl overflow-hidden">
          <div class="bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800">
            Detalle del cuadre #{{ selected.id }}
          </div>
          <div class="p-4 space-y-6 max-h-[50vh] overflow-y-auto">
            <dl class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
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
            </dl>

            <div>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Denominaciones</h4>
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
                  <tfoot v-if="denominationLines.length" class="bg-gray-50 font-medium">
                    <tr>
                      <td colspan="2" class="px-3 py-2 text-right">Total efectivo (suma denominaciones)</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(denominationSum) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Bancos</h4>
              <div class="overflow-x-auto rounded-lg border border-gray-100">
                <table class="min-w-full text-sm">
                  <thead class="bg-blue-50 text-xs text-gray-600">
                    <tr>
                      <th class="px-3 py-2 text-left">Banco</th>
                      <th class="px-3 py-2 text-right">Esperado</th>
                      <th class="px-3 py-2 text-right">Real</th>
                      <th class="px-3 py-2 text-right">Dif.</th>
                      <th class="px-3 py-2 text-left">Ajustes</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="br in selected.bankReconciliations" :key="br.id">
                      <td class="px-3 py-1.5">{{ br.bankName }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(br.expectedBalance) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(br.actualBalance) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(br.difference) }}</td>
                      <td class="px-3 py-1.5 text-xs text-gray-600 max-w-xs truncate" :title="formatAdjustments(br.adjustments)">
                        {{ formatAdjustments(br.adjustments) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="pendingAppLines.length > 0">
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Apps pendientes por liquidar (snapshot al cierre)</h4>
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
                  <tfoot class="bg-violet-50/80 font-medium">
                    <tr>
                      <td class="px-3 py-2 text-right">Total</td>
                      <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(pendingAppSum) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div>
              <h4 class="text-sm font-semibold text-gray-800 mb-2">Préstamos informales</h4>
              <p class="text-xs text-gray-500 mb-2">
                Solo cuadres antiguos pueden mostrar un respaldo por cierre; los nuevos se gestionan en la vista de caja.
              </p>
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
import { defaultBusinessCalendar } from '@/utils/datetime'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import type { CashClosure } from '@/types/cashRegister'
import { DENOMINATIONS } from '@/types/cashRegister'

const props = defineProps<{
  modelValue: boolean
  branchId?: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)
const loadError = ref('')
const items = ref<CashClosure[]>([])
const page = ref(1)
const pageSize = ref(15)
const totalCount = ref(0)
const totalPages = ref(0)
const selected = ref<CashClosure | null>(null)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
    value ?? 0
  )
}

function formatDate(iso: string): string {
  return defaultBusinessCalendar.formatDateMediumTime(iso)
}

function parseDenominationCounts(raw: string): Record<number, number> {
  try {
    const o = JSON.parse(raw || '{}') as Record<string, number>
    const out: Record<number, number> = {}
    for (const [k, v] of Object.entries(o)) {
      const n = Number(k)
      if (!Number.isNaN(n) && typeof v === 'number') out[n] = v
    }
    return out
  } catch {
    return {}
  }
}

const denominationLines = computed(() => {
  const c = selected.value
  if (!c) return []
  const counts = parseDenominationCounts(c.denominationCounts)
  return DENOMINATIONS.map((denom) => {
    const qty = counts[denom] ?? 0
    return { denom, qty, subtotal: denom * qty }
  })
})

const denominationSum = computed(() =>
  denominationLines.value.reduce((s, l) => s + l.subtotal, 0)
)

interface PendingAppSnapLine {
  appId: number
  appName: string
  amount: number
}

const pendingAppLines = computed((): PendingAppSnapLine[] => {
  const c = selected.value
  if (!c?.pendingAppPaymentsSnapshot) return []
  const t = c.pendingAppPaymentsSnapshot.trim()
  if (!t || t === '[]') return []
  try {
    const a = JSON.parse(t) as PendingAppSnapLine[]
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
})

const pendingAppSum = computed(() =>
  pendingAppLines.value.reduce((s, x) => s + (Number(x.amount) || 0), 0)
)

function formatAdjustments(json: string): string {
  const t = (json || '').trim()
  if (!t || t === '[]') return '—'
  try {
    const a = JSON.parse(t)
    if (Array.isArray(a) && a.length === 0) return '—'
    return JSON.stringify(a)
  } catch {
    return t
  }
}

function onOpenChange(v: boolean) {
  if (!v) {
    selected.value = null
    loadError.value = ''
  }
}

function selectRow(row: CashClosure) {
  selected.value = row
}

async function loadClosures(p: number) {
  loading.value = true
  loadError.value = ''
  try {
    const res = await cashRegisterApi.getClosures(props.branchId ?? undefined, p, pageSize.value)
    items.value = res.items
    page.value = res.page
    totalCount.value = res.totalCount
    totalPages.value = res.totalPages
    const keep = selected.value && res.items.some((i) => i.id === selected.value!.id)
    if (!keep) selected.value = res.items[0] ?? null
  } catch (e: any) {
    loadError.value = e?.message || 'No se pudo cargar el historial (¿permisos o sesión?).'
    items.value = []
    selected.value = null
  } finally {
    loading.value = false
  }
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  loadClosures(p)
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      page.value = 1
      selected.value = null
      loadClosures(1)
    }
  }
)
</script>
