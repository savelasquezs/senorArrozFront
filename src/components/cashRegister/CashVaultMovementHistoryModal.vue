<template>
  <BaseDialog
    v-model="open"
    title="Historial de caja mayor"
    size="5xl"
    :show-close-button="true"
    @update:model-value="onOpenChange"
  >
    <div class="space-y-4 -mt-2">
      <p class="text-sm text-gray-500">
        Abonos y descargas de efectivo registrados contra Caja Mayor Efectivo.
      </p>

      <div v-if="loadError" class="rounded-lg bg-red-50 text-red-700 text-sm px-4 py-3">
        {{ loadError }}
      </div>

      <div v-if="loading" class="flex justify-center py-12 text-gray-500 text-sm">
        Cargando...
      </div>

      <template v-else>
        <div class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th class="px-3 py-2">Fecha</th>
                <th class="px-3 py-2">Movimiento</th>
                <th class="px-3 py-2 text-right">Monto</th>
                <th class="px-3 py-2">Registro</th>
                <th class="px-3 py-2">Nota</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in items" :key="row.id" class="hover:bg-gray-50">
                <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
                <td class="px-3 py-2">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="kindMeta(row.kind).className"
                  >
                    {{ kindMeta(row.kind).label }}
                  </span>
                </td>
                <td
                  class="px-3 py-2 text-right tabular-nums font-medium"
                  :class="kindMeta(row.kind).amountClass"
                >
                  {{ kindMeta(row.kind).sign }}{{ formatCurrency(row.amount) }}
                </td>
                <td class="px-3 py-2 max-w-[160px] truncate" :title="row.createdByName || ''">
                  {{ row.createdByName || `Usuario #${row.createdById}` }}
                </td>
                <td class="px-3 py-2 text-gray-600 max-w-xs truncate" :title="row.note || ''">
                  {{ row.note || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="items.length === 0" class="text-center py-8 text-gray-400 text-sm">
          No hay movimientos registrados.
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between gap-2 flex-wrap text-sm">
          <span class="text-gray-500">
            {{ totalCount }} registro(s) - Pagina {{ page }} de {{ totalPages }}
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
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import type { CashVaultMovement, CashVaultMovementKind } from '@/types/cashRegister'

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
const items = ref<CashVaultMovement[]>([])
const page = ref(1)
const pageSize = ref(15)
const totalCount = ref(0)
const totalPages = ref(0)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
    value ?? 0
  )
}

function formatDate(iso: string): string {
  return defaultBusinessCalendar.formatDateMediumTime(iso)
}

function kindMeta(kind: CashVaultMovementKind) {
  if (kind === 'withdraw_from_vault') {
    return {
      label: 'Descarga',
      sign: '-',
      className: 'bg-amber-50 text-amber-800 border border-amber-100',
      amountClass: 'text-amber-800',
    }
  }

  return {
    label: 'Abono',
    sign: '+',
    className: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
    amountClass: 'text-emerald-800',
  }
}

function onOpenChange(v: boolean) {
  if (!v) {
    loadError.value = ''
  }
}

async function loadMovements(p: number) {
  loading.value = true
  loadError.value = ''
  try {
    const res = await cashRegisterApi.getCashVaultMovements(props.branchId ?? undefined, p, pageSize.value)
    items.value = res.items
    page.value = res.page
    totalCount.value = res.totalCount
    totalPages.value = res.totalPages
  } catch (e: any) {
    loadError.value = e?.message || 'No se pudo cargar el historial.'
    items.value = []
    totalCount.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  loadMovements(p)
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      page.value = 1
      loadMovements(1)
    }
  }
)
</script>
