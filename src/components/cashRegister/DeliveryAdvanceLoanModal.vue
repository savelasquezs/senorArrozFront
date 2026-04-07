<template>
  <BaseDialog
    v-model="open"
    title="Préstamo por pedidos domicilio"
    size="4xl"
    @update:model-value="onToggle"
  >
    <p class="text-sm text-gray-600 mb-4">
      Selecciona pedidos <strong>listos</strong> o <strong>en camino</strong>, el vuelto por pedido y un domiciliario
      <strong>liquidado (total + bloqueado)</strong>. Se creará un préstamo informal y esos pedidos no bloquearán el
      cuadre hasta que des el préstamo de baja o queden entregados.
    </p>

    <div v-if="loading" class="py-12 text-center text-gray-500 text-sm">Cargando…</div>

    <template v-else>
      <div v-if="orders.length === 0" class="py-8 text-center text-gray-400 text-sm">
        No hay pedidos domicilio en listo ni en camino.
      </div>

      <div v-else class="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
        <div
          v-for="row in orders"
          :key="row.id"
          class="border border-gray-200 rounded-lg p-3 space-y-2"
          :class="selection[row.id] ? 'bg-orange-50/40 border-orange-200' : 'bg-white'"
        >
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              class="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              :checked="!!selection[row.id]"
              @change="onOrderCheck(row, ($event.target as HTMLInputElement).checked)"
            />
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span class="font-semibold text-gray-900">#{{ row.id }}</span>
                <span class="text-sm text-gray-500">{{ formatCurrency(row.total) }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{{
                  statusLabel(row.status)
                }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5 break-words">{{ row.addressSummary || '—' }}</p>
            </div>
          </label>

          <div v-if="selection[row.id]" class="pl-7 space-y-1.5">
            <p class="text-xs font-medium text-gray-600">Vuelto (obligatorio):</p>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in getOptions(row.total)"
                :key="`${row.id}-${opt.targetCarry}`"
                class="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <input
                  v-model.number="vueltoByOrderId[row.id]"
                  type="radio"
                  class="text-orange-600 focus:ring-orange-500"
                  :value="opt.vueltoAdd"
                  :name="`vuelto-${row.id}`"
                />
                <span v-if="opt.vueltoAdd === 0" class="text-gray-700">Sin vuelto (total redondo)</span>
                <span v-else class="text-gray-700">
                  +{{ formatCurrency(opt.vueltoAdd) }} → llevar {{ formatCurrency(opt.targetCarry) }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <label class="text-xs font-medium text-gray-600 block">Domiciliario liquidado (bloqueado, modo total)</label>
        <select
          v-model.number="deliverymanId"
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option :value="0" disabled>Elegir…</option>
          <option v-for="d in deliverymen" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <p v-if="deliverymen.length === 0" class="text-xs text-amber-700">
          No hay domiciliarios con liquidación total y tarjeta bloqueada hoy.
        </p>
      </div>
    </template>

    <template #footer>
      <BaseButton variant="outline" type="button" @click="open = false">Cancelar</BaseButton>
      <BaseButton variant="primary" type="button" :loading="saving" :disabled="!canSubmit" @click="submit">
        Confirmar préstamo
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import { useToast } from '@/composables/useToast'
import { getDeliveryAdvanceVueltoOptions } from '@/utils/deliveryAdvanceVueltos'
import type { DeliveryAdvanceOrderRow } from '@/types/cashRegister'

const props = defineProps<{
  modelValue: boolean
  branchId?: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const { success: toastSuccess, error: toastError } = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const saving = ref(false)
const orders = ref<DeliveryAdvanceOrderRow[]>([])
const deliverymen = ref<{ id: number; name: string }[]>([])

const selection = ref<Record<number, boolean>>({})
const vueltoByOrderId = ref<Record<number, number>>({})
const deliverymanId = ref(0)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
    value ?? 0
  )
}

function statusLabel(s: string): string {
  if (s === 'ready') return 'Listo'
  if (s === 'on_the_way') return 'En camino'
  return s
}

function getOptions(total: number) {
  return getDeliveryAdvanceVueltoOptions(total)
}

function onOrderCheck(row: DeliveryAdvanceOrderRow, checked: boolean) {
  if (checked) {
    selection.value = { ...selection.value, [row.id]: true }
    const opts = getOptions(row.total)
    const first = opts[0]?.vueltoAdd ?? 0
    vueltoByOrderId.value = { ...vueltoByOrderId.value, [row.id]: first }
  } else {
    const { [row.id]: _sel, ...restSel } = selection.value
    selection.value = restSel
    const { [row.id]: _vu, ...restVu } = vueltoByOrderId.value
    vueltoByOrderId.value = restVu
  }
}

const selectedCount = computed(() => Object.values(selection.value).filter(Boolean).length)

const canSubmit = computed(() => {
  if (loading.value || orders.value.length === 0) return false
  if (selectedCount.value === 0) return false
  if (!deliverymanId.value) return false
  for (const row of orders.value) {
    if (!selection.value[row.id]) continue
    const v = vueltoByOrderId.value[row.id]
    if (v === undefined) return false
    const ok = getOptions(row.total).some((o) => o.vueltoAdd === v)
    if (!ok) return false
  }
  return true
})

async function load() {
  loading.value = true
  try {
    const [o, d] = await Promise.all([
      cashRegisterApi.getDeliveryAdvanceOrders(props.branchId ?? undefined),
      cashRegisterApi.getLiquidatedFullBlockedDeliverymen(props.branchId ?? undefined),
    ])
    orders.value = o
    deliverymen.value = d
    selection.value = {}
    vueltoByOrderId.value = {}
    deliverymanId.value = 0
  } catch (e: any) {
    toastError('No se pudo cargar', e?.message || 'Error')
    orders.value = []
    deliverymen.value = []
  } finally {
    loading.value = false
  }
}

function onToggle(v: boolean) {
  if (!v) return
  void load()
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) void load()
  }
)

async function submit() {
  if (!canSubmit.value) return
  const lines: { orderId: number; vueltoAdd: number }[] = []
  for (const row of orders.value) {
    if (!selection.value[row.id]) continue
    lines.push({ orderId: row.id, vueltoAdd: vueltoByOrderId.value[row.id] })
  }
  saving.value = true
  try {
    await cashRegisterApi.createInformalLoan(
      {
        deliveryAdvance: {
          deliverymanId: deliverymanId.value,
          lines,
        },
      },
      props.branchId ?? undefined
    )
    toastSuccess('Préstamo registrado', 4000)
    open.value = false
    emit('success')
  } catch (e: any) {
    toastError('No se pudo registrar', e?.message || 'Error')
  } finally {
    saving.value = false
  }
}
</script>
