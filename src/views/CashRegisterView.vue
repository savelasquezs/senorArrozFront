<template>
  <MainLayout>
    <div class="p-6 space-y-6 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Cuadre de Caja</h1>
          <p class="text-sm text-gray-500 mt-1">
            Último cuadre:
            <span v-if="expected?.lastClosureAt" class="font-medium text-gray-700">
              {{ formatDate(expected.lastClosureAt) }}
            </span>
            <span v-else class="text-orange-500">Sin cuadres previos</span>
          </p>
        </div>
        <BaseButton @click="loadData" variant="outline" size="sm" :loading="loading">
          <ArrowPathIcon class="w-4 h-4 mr-1" /> Actualizar
        </BaseButton>
      </div>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="bg-gray-100 animate-pulse rounded-lg h-40" />
      </div>

      <template v-else-if="expected">

        <!-- ===== SECCIÓN 1: EFECTIVO ===== -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="bg-yellow-50 border-b border-yellow-100 px-6 py-4 flex items-center gap-3">
            <BanknotesIcon class="w-5 h-5 text-yellow-600" />
            <h2 class="text-lg font-semibold text-gray-800">Conteo de Efectivo</h2>
          </div>

          <div class="p-6 space-y-4">
            <!-- Denominaciones -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div
                v-for="denom in DENOMINATIONS"
                :key="denom"
                class="flex flex-col items-center gap-1"
              >
                <span class="text-xs font-medium text-gray-500">{{ formatCurrency(denom) }}</span>
                <input
                  type="number"
                  min="0"
                  v-model.number="denominationCounts[denom]"
                  @input="recalcClosingCash"
                  class="w-full text-center border border-gray-300 rounded-lg py-2 px-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="0"
                />
                <span class="text-xs text-gray-400">
                  = {{ formatCurrency(denom * (denominationCounts[denom] || 0)) }}
                </span>
              </div>
            </div>

            <!-- Totales -->
            <div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div class="bg-gray-50 rounded-lg p-3 text-center">
                <p class="text-xs text-gray-500">Apertura</p>
                <p class="text-lg font-bold text-gray-700">{{ formatCurrency(expected.openingCash) }}</p>
              </div>
              <div class="bg-green-50 rounded-lg p-3 text-center">
                <p class="text-xs text-gray-500">Sistema espera</p>
                <p class="text-lg font-bold text-green-700">{{ formatCurrency(expected.expectedCash) }}</p>
                <p class="text-xs text-gray-400 mt-1">
                  Ventas: {{ formatCurrency(expected.cashFromOrders) }} |
                  Gastos: -{{ formatCurrency(expected.cashExpenses) }} |
                  Adelantos: -{{ formatCurrency(expected.advances) }}
                </p>
              </div>
              <div :class="['rounded-lg p-3 text-center', cashDifference === 0 ? 'bg-green-50' : 'bg-red-50']">
                <p class="text-xs text-gray-500">Contado en caja</p>
                <p :class="['text-lg font-bold', cashDifference === 0 ? 'text-green-700' : 'text-red-700']">
                  {{ formatCurrency(closingCash) }}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  Diferencia: {{ formatCurrency(cashDifference) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== SECCIÓN 2: PRÉSTAMOS INFORMALES ===== -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="bg-orange-50 border-b border-orange-100 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <ClockIcon class="w-5 h-5 text-orange-600" />
              <h2 class="text-lg font-semibold text-gray-800">Préstamos Informales</h2>
            </div>
            <BaseButton variant="outline" size="sm" @click="addLoan">
              <PlusIcon class="w-4 h-4 mr-1" /> Agregar
            </BaseButton>
          </div>

          <div class="p-6">
            <p class="text-sm text-gray-500 mb-4">
              Dinero que salió de caja pero se espera que regrese (ej: domiciliario en ruta al cierre).
            </p>

            <div v-if="informalLoans.length === 0" class="text-center py-6 text-gray-400 text-sm">
              Sin préstamos informales registrados
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(loan, idx) in informalLoans"
                :key="idx"
                class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <input
                  v-model="loan.concept"
                  type="text"
                  placeholder="Concepto"
                  class="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <input
                  v-model.number="loan.amount"
                  type="number"
                  min="0"
                  placeholder="Monto"
                  class="w-32 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <button @click="removeLoan(idx)" class="text-red-400 hover:text-red-600">
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-if="informalLoans.length > 0" class="mt-3 flex justify-end">
              <span class="text-sm font-medium text-gray-700">
                Total: {{ formatCurrency(totalLoans) }}
              </span>
            </div>
          </div>
        </div>

        <!-- ===== SECCIÓN 3: CONCILIACIÓN BANCOS ===== -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
            <BuildingLibraryIcon class="w-5 h-5 text-blue-600" />
            <h2 class="text-lg font-semibold text-gray-800">Bancos y Aplicaciones</h2>
          </div>

          <div class="p-6 space-y-4">
            <p class="text-sm text-gray-500">
              Ingresa el saldo real de cada banco/app. La diferencia debe ser <strong>$0</strong> para guardar el cuadre.
            </p>

            <div v-if="bankReconciliations.length === 0" class="text-center py-6 text-gray-400 text-sm">
              No hay bancos configurados para esta sucursal.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="recon in bankReconciliations"
                :key="recon.bankId"
                class="grid grid-cols-4 gap-3 items-center p-3 rounded-lg"
                :class="recon.actualBalance - recon.expectedBalance === 0 ? 'bg-green-50' : 'bg-red-50'"
              >
                <div class="col-span-1">
                  <p class="text-sm font-medium text-gray-800">{{ recon.bankName }}</p>
                  <p class="text-xs text-gray-400">Sistema: {{ formatCurrency(recon.expectedBalance) }}</p>
                </div>
                <div class="col-span-1">
                  <label class="text-xs text-gray-500 block mb-1">Saldo real</label>
                  <input
                    v-model.number="recon.actualBalance"
                    type="number"
                    min="0"
                    step="100"
                    class="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div class="col-span-1 text-center">
                  <p class="text-xs text-gray-500">Diferencia</p>
                  <p
                    :class="[
                      'text-base font-bold',
                      recon.actualBalance - recon.expectedBalance === 0 ? 'text-green-700' : 'text-red-600'
                    ]"
                  >
                    {{ formatCurrency(recon.actualBalance - recon.expectedBalance) }}
                  </p>
                </div>
                <div class="col-span-1 text-center">
                  <CheckCircleIcon
                    v-if="recon.actualBalance - recon.expectedBalance === 0"
                    class="w-6 h-6 text-green-500 mx-auto"
                  />
                  <ExclamationCircleIcon
                    v-else
                    class="w-6 h-6 text-red-500 mx-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== BOTÓN GUARDAR ===== -->
        <div class="flex justify-end gap-3 pt-2">
          <div v-if="!canSave" class="text-sm text-red-600 flex items-center gap-1">
            <ExclamationCircleIcon class="w-4 h-4" />
            {{ saveBlockReason }}
          </div>
          <BaseButton
            variant="primary"
            :disabled="!canSave"
            :loading="saving"
            @click="saveClosure"
            class="px-8"
          >
            Guardar Cuadre
          </BaseButton>
        </div>

      </template>

      <!-- Estado vacío -->
      <div v-else-if="!loading" class="text-center py-16 text-gray-400">
        <BanknotesIcon class="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p>No se pudieron cargar los datos del cuadre.</p>
        <BaseButton variant="outline" class="mt-4" @click="loadData">Reintentar</BaseButton>
      </div>

    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import type {
  CashRegisterExpected,
  CloseBankReconciliationDto,
  CloseInformalLoanDto,
} from '@/types/cashRegister'
import { DENOMINATIONS } from '@/types/cashRegister'

// ===== STATE =====
const loading = ref(false)
const saving = ref(false)
const expected = ref<CashRegisterExpected | null>(null)

const denominationCounts = ref<Record<number, number>>(
  Object.fromEntries(DENOMINATIONS.map((d) => [d, 0]))
)
const closingCash = ref(0)

const informalLoans = ref<CloseInformalLoanDto[]>([])

const bankReconciliations = ref<
  Array<CloseBankReconciliationDto & { bankName: string }>
>([])

// ===== COMPUTED =====
const cashDifference = computed(() => closingCash.value - (expected.value?.expectedCash ?? 0))

const totalLoans = computed(() => informalLoans.value.reduce((sum, l) => sum + (l.amount || 0), 0))

const allBanksCuadred = computed(() =>
  bankReconciliations.value.every((r) => r.actualBalance - r.expectedBalance === 0)
)

const canSave = computed(
  () => !saving.value && allBanksCuadred.value && bankReconciliations.value.length > 0
)

const saveBlockReason = computed(() => {
  if (!allBanksCuadred.value) return 'Hay bancos con diferencia distinta de $0'
  return ''
})

// ===== METHODS =====
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
    value ?? 0
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function recalcClosingCash() {
  closingCash.value = DENOMINATIONS.reduce(
    (sum, d) => sum + d * (denominationCounts.value[d] || 0),
    0
  )
}

function addLoan() {
  informalLoans.value.push({ concept: '', amount: 0 })
}

function removeLoan(idx: number) {
  informalLoans.value.splice(idx, 1)
}

async function loadData() {
  loading.value = true
  try {
    expected.value = await cashRegisterApi.getExpected()

    // Inicializar conciliaciones con valores del sistema
    bankReconciliations.value = expected.value.banks.map((b) => ({
      bankId: b.bankId,
      bankName: b.bankName,
      expectedBalance: b.expectedBalance,
      actualBalance: b.expectedBalance, // Por defecto asumimos que cuadra
      adjustments: '[]',
    }))
  } catch (e: any) {
    console.error('Error cargando datos del cuadre:', e)
  } finally {
    loading.value = false
  }
}

async function saveClosure() {
  if (!canSave.value || !expected.value) return
  saving.value = true
  try {
    const dto = {
      closedAt: new Date().toISOString(),
      denominationCounts: JSON.stringify(
        Object.fromEntries(
          DENOMINATIONS.filter((d) => (denominationCounts.value[d] || 0) > 0).map((d) => [
            d,
            denominationCounts.value[d],
          ])
        )
      ),
      closingCash: closingCash.value,
      bankReconciliations: bankReconciliations.value.map(({ bankId, expectedBalance, actualBalance, adjustments }) => ({
        bankId,
        expectedBalance,
        actualBalance,
        adjustments,
      })),
      informalLoans: informalLoans.value.filter((l) => l.concept && l.amount > 0),
    }

    await cashRegisterApi.closeCashRegister(dto)
    alert('Cuadre guardado exitosamente')
    await loadData()

    // Resetear conteos
    denominationCounts.value = Object.fromEntries(DENOMINATIONS.map((d) => [d, 0]))
    closingCash.value = 0
    informalLoans.value = []
  } catch (e: any) {
    alert('Error al guardar cuadre: ' + (e.message || 'Error desconocido'))
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>
