<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="close"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Registrar Abono</h2>
            <p class="text-sm text-gray-500 mt-0.5">
              Pedido #{{ order?.id }} —
              <span class="font-medium">{{ order?.customerName || order?.guestName || 'Cliente' }}</span>
            </p>
          </div>
          <button @click="close" class="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          <!-- Resumen del pedido -->
          <div class="bg-amber-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p class="text-gray-500">Total pedido</p>
              <p class="font-bold text-gray-800">{{ formatCurrency(order?.total ?? 0) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Ya abonado</p>
              <p class="font-bold text-green-700">{{ formatCurrency(totalDeposited) }}</p>
            </div>
            <div>
              <p class="text-gray-500">Pendiente</p>
              <p :class="['font-bold', pendingAmount > 0 ? 'text-amber-700' : 'text-green-700']">
                {{ formatCurrency(pendingAmount) }}
              </p>
            </div>
          </div>

          <!-- Historial de abonos anteriores -->
          <div v-if="deposits.length > 0">
            <h3 class="text-sm font-semibold text-gray-600 mb-2">Abonos registrados</h3>
            <div class="space-y-2">
              <div
                v-for="d in deposits"
                :key="d.id"
                class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
              >
                <div class="flex items-center gap-2">
                  <span v-if="d.isEffective" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Efectivo</span>
                  <span v-else class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {{ d.bankName || d.appName || 'Banco/App' }}
                  </span>
                  <span class="text-gray-500">{{ formatDate(d.receivedAt) }}</span>
                </div>
                <span class="font-semibold text-gray-800">{{ formatCurrency(d.amount) }}</span>
              </div>
            </div>
          </div>

          <!-- Formulario nuevo abono -->
          <div v-if="pendingAmount > 0" class="space-y-4 border-t border-gray-100 pt-4">
            <h3 class="text-sm font-semibold text-gray-600">Nuevo abono</h3>

            <!-- Monto -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                v-model.number="form.amount"
                :max="pendingAmount"
                min="1"
                placeholder="0"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p v-if="form.amount > pendingAmount" class="text-xs text-red-500 mt-1">
                Supera el pendiente de {{ formatCurrency(pendingAmount) }}
              </p>
            </div>

            <!-- Tipo de pago -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in paymentOptions"
                  :key="opt.value"
                  @click="selectPaymentType(opt.value)"
                  :class="[
                    'border rounded-lg py-2 px-3 text-sm font-medium transition',
                    form.paymentType === opt.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  ]"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Selector de banco -->
            <div v-if="form.paymentType === 'bank'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Banco</label>
              <select
                v-model="form.bankId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option :value="undefined">Seleccionar banco...</option>
                <option v-for="b in availableBanks" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>

            <!-- Selector de app -->
            <div v-if="form.paymentType === 'app'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Aplicación</label>
              <select
                v-model="form.appId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option :value="undefined">Seleccionar app...</option>
                <option v-for="a in availableApps" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </div>

            <!-- Notas -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <input
                type="text"
                v-model="form.notes"
                maxlength="200"
                placeholder="Ej: Anticipo por teléfono"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <!-- Error -->
            <p v-if="error" class="text-sm text-red-600 flex items-center gap-1">
              <ExclamationCircleIcon class="w-4 h-4 shrink-0" />
              {{ error }}
            </p>
          </div>

          <div v-else class="text-center py-4 text-sm text-green-700 bg-green-50 rounded-xl">
            <CheckCircleIcon class="w-6 h-6 mx-auto mb-1" />
            Este pedido está pagado en su totalidad.
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            @click="close"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            v-if="pendingAmount > 0"
            @click="submit"
            :disabled="!canSubmit || saving"
            class="px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="saving" class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            Registrar abono
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { reservationDepositApi } from '@/services/MainAPI/reservationDepositApi'
import { bankApi } from '@/services/MainAPI/bankApi'
import { appApi } from '@/services/MainAPI/appApi'
import type { ReservationDeposit } from '@/types/reservationDeposit'
import type { Bank, App } from '@/types/bank'

interface OrderSummary {
  id: number
  customerName?: string
  guestName?: string
  total: number
  branchId: number
}

const props = defineProps<{
  modelValue: boolean
  order: OrderSummary | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'deposited': [deposit: ReservationDeposit]
}>()

type PaymentType = 'cash' | 'bank' | 'app'

const paymentOptions = [
  { value: 'cash' as PaymentType, label: 'Efectivo' },
  { value: 'bank' as PaymentType, label: 'Banco' },
  { value: 'app' as PaymentType, label: 'App' },
]

const deposits = ref<ReservationDeposit[]>([])
const availableBanks = ref<Bank[]>([])
const availableApps = ref<App[]>([])
const saving = ref(false)
const error = ref('')

const form = ref({
  amount: 0,
  paymentType: 'cash' as PaymentType,
  bankId: undefined as number | undefined,
  appId: undefined as number | undefined,
  notes: '',
})

const totalDeposited = computed(() => deposits.value.reduce((s, d) => s + d.amount, 0))
const pendingAmount = computed(() => Math.max(0, (props.order?.total ?? 0) - totalDeposited.value))

const canSubmit = computed(() => {
  if (!form.value.amount || form.value.amount <= 0) return false
  if (form.value.amount > pendingAmount.value) return false
  if (form.value.paymentType === 'bank' && !form.value.bankId) return false
  if (form.value.paymentType === 'app' && !form.value.appId) return false
  return true
})

function selectPaymentType(type: PaymentType) {
  form.value.paymentType = type
  form.value.bankId = undefined
  form.value.appId = undefined
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value ?? 0)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

async function loadData() {
  if (!props.order) return
  deposits.value = []
  try {
    deposits.value = await reservationDepositApi.getByOrder(props.order.id)
  } catch {}

  if (!availableBanks.value.length) {
    try {
      const result = await bankApi.getBanks({ branchId: props.order.branchId, page: 1, pageSize: 50 })
      availableBanks.value = result.items.filter((b: any) => b.type === 0)
    } catch {}
  }

  if (!availableApps.value.length) {
    try {
      const result = await appApi.getApps({ branchId: props.order.branchId, page: 1, pageSize: 50 })
      availableApps.value = result.items
    } catch {}
  }
}

async function submit() {
  if (!canSubmit.value || !props.order) return
  error.value = ''
  saving.value = true
  try {
    const created = await reservationDepositApi.create({
      orderId: props.order.id,
      amount: form.value.amount,
      isEffective: form.value.paymentType === 'cash',
      bankId: form.value.paymentType === 'bank' ? form.value.bankId : undefined,
      appId: form.value.paymentType === 'app' ? form.value.appId : undefined,
      notes: form.value.notes || undefined,
    })
    deposits.value.push(created)
    form.value = { amount: 0, paymentType: 'cash', bankId: undefined, appId: undefined, notes: '' }
    emit('deposited', created)
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || 'Error al registrar el abono'
  } finally {
    saving.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (val) => {
  if (val && props.order) {
    form.value = { amount: 0, paymentType: 'cash', bankId: undefined, appId: undefined, notes: '' }
    error.value = ''
    loadData()
  }
})
</script>
