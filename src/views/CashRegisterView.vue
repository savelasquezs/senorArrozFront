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
        <div class="flex items-center gap-2">
          <BaseButton
            v-if="canViewClosureHistory"
            variant="outline"
            size="sm"
            @click="showHistoryModal = true"
          >
            Historial de cuadres
          </BaseButton>
          <BaseButton @click="loadData" variant="outline" size="sm" :loading="loading">
            <ArrowPathIcon class="w-4 h-4 mr-1" /> Actualizar
          </BaseButton>
        </div>
      </div>

      <div
        v-if="expected && expected.undeliveredOrdersCount > 0"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2"
        role="alert"
      >
        <ExclamationCircleIcon class="w-5 h-5 shrink-0 text-red-600" />
        <span>
          <strong>No puedes guardar el cuadre:</strong>
          {{
            expected.undeliveredOrdersCount === 1
              ? ' hay 1 pedido sin entregar.'
              : ` hay ${expected.undeliveredOrdersCount} pedidos sin entregar.`
          }}
          Entrega o cancela esos pedidos antes de cuadrar caja.
        </span>
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
                  @input="onDenominationInput"
                  @blur="onDenominationBlur(denom)"
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
                  Abonos reservas: +{{ formatCurrency(expected.cashDeposits) }} |
                  Gastos: -{{ formatCurrency(expected.cashExpenses) }} |
                  Abonos domic. (transferencia): -{{ formatCurrency(expected.advancesBankTransfer) }} |
                  Prést. informales (activos): {{ formatCurrency(-(expected.informalLoansActiveTotal ?? 0)) }}
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

        <!-- ===== SECCIÓN 2: PRÉSTAMOS INFORMALES (persistidos; afectan el efectivo esperado) ===== -->
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="bg-orange-50 border-b border-orange-100 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <ClockIcon class="w-5 h-5 text-orange-600" />
              <h2 class="text-lg font-semibold text-gray-800">Préstamos informales</h2>
            </div>
            <div class="flex rounded-lg border border-orange-200/80 bg-white/80 p-0.5 text-sm">
              <button
                type="button"
                :class="[
                  'px-3 py-1.5 rounded-md font-medium transition-colors',
                  loansTab === 'active' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-orange-50',
                ]"
                @click="loansTab = 'active'"
              >
                Activos
              </button>
              <button
                type="button"
                :class="[
                  'px-3 py-1.5 rounded-md font-medium transition-colors',
                  loansTab === 'inactive' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-orange-50',
                ]"
                @click="loansTab = 'inactive'"
              >
                Inactivos
              </button>
            </div>
          </div>

          <div class="p-6">
            <p class="text-sm text-gray-500 mb-4">
              Se guardan al instante (no hace falta cerrar caja). La suma de los activos se resta del efectivo esperado arriba.
            </p>

            <div v-if="informalLoansLoading" class="text-center py-8 text-gray-500 text-sm">Cargando…</div>

            <template v-else>
              <div v-if="branchInformalLoans.length === 0" class="text-center py-6 text-gray-400 text-sm">
                {{ loansTab === 'active' ? 'Sin préstamos activos' : 'Sin préstamos dados de baja' }}
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="loan in branchInformalLoans"
                  :key="loan.id"
                  class="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg sm:flex-row sm:items-center sm:gap-3"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ loan.concept }}</p>
                    <p class="text-xs text-gray-500 tabular-nums">{{ formatCurrency(loan.amount) }}</p>
                    <p v-if="loansTab === 'inactive' && loan.deactivatedAt" class="text-xs text-gray-400 mt-1">
                      Baja: {{ formatDate(loan.deactivatedAt) }}
                      <span v-if="loan.deactivatedByName"> · {{ loan.deactivatedByName }}</span>
                    </p>
                    <p v-if="loansTab === 'inactive' && loan.deactivationNotes" class="text-xs text-gray-500 mt-0.5 italic">
                      {{ loan.deactivationNotes }}
                    </p>
                  </div>
                  <div v-if="loansTab === 'active'" class="shrink-0">
                    <BaseButton variant="outline" size="sm" class="text-red-700 border-red-200" @click="openDeactivateLoan(loan)">
                      Dar de baja
                    </BaseButton>
                  </div>
                </div>
              </div>

              <div v-if="loansTab === 'active' && branchInformalLoans.length > 0" class="mt-3 flex justify-end">
                <span class="text-sm font-medium text-gray-700">
                  Total activos: {{ formatCurrency(totalActiveLoans) }}
                </span>
              </div>

              <div v-if="loansTab === 'active'" class="mt-6 pt-4 border-t border-gray-100">
                <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Registrar préstamo</p>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div class="flex-1">
                    <label class="text-xs text-gray-500 block mb-1">Concepto</label>
                    <input
                      v-model="newLoanConcept"
                      type="text"
                      placeholder="Ej. Domiciliario ruta noche"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <div class="w-full sm:w-40">
                    <label class="text-xs text-gray-500 block mb-1">Monto (COP)</label>
                    <input
                      v-model.number="newLoanAmount"
                      type="number"
                      step="1000"
                      placeholder="0"
                      class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <BaseButton variant="primary" class="shrink-0" :loading="savingLoan" @click="submitNewLoan">
                    <PlusIcon class="w-4 h-4 mr-1" /> Registrar
                  </BaseButton>
                </div>
              </div>
            </template>
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
                <div class="col-span-1 flex flex-col items-center gap-1">
                  <CheckCircleIcon
                    v-if="recon.actualBalance - recon.expectedBalance === 0"
                    class="w-6 h-6 text-green-500 mx-auto"
                  />
                  <ExclamationCircleIcon
                    v-else
                    class="w-6 h-6 text-red-500 mx-auto"
                  />
                  <BaseButton variant="outline" size="sm" class="text-xs px-2 py-0.5" @click="toggleMovements(recon.bankId)">
                    {{ movementsBankId === recon.bankId ? 'Ocultar' : 'Ver' }} movimientos
                  </BaseButton>
                </div>
              </div>
            </div>

            <div v-if="movementsBankId != null && expected" class="mt-4">
              <BankMovementsPanel
                :key="movementsBankId"
                :bank-id="movementsBankId"
                :branch-id="authStore.branchId ?? undefined"
                embedded
                lock-date-range
                :initial-from-date="closureFromYmd"
                :initial-to-date="closureToYmd"
              />
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

    <CashClosureHistoryModal
      v-model="showHistoryModal"
      :branch-id="authStore.branchId"
    />

    <BaseDialog
      v-model="deactivateDialogOpen"
      title="Dar de baja préstamo informal"
      size="md"
      @update:model-value="onDeactivateDialogToggle"
    >
      <p class="text-sm text-gray-600 mb-3">
        Opcional: nota interna (quién devolvió, acuerdo, etc.).
      </p>
      <textarea
        v-model="deactivateNotes"
        rows="3"
        maxlength="500"
        placeholder="Nota (opcional)"
        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
      <template #footer>
        <BaseButton variant="outline" @click="deactivateDialogOpen = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :loading="deactivatingLoan" @click="confirmDeactivateLoan">
          Confirmar baja
        </BaseButton>
      </template>
    </BaseDialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CashClosureHistoryModal from '@/components/cashRegister/CashClosureHistoryModal.vue'
import BankMovementsPanel from '@/components/payments/banks/BankMovementsPanel.vue'
import { useAuthStore } from '@/store/auth'
import { formatYmdBogota } from '@/utils/colombiaDate'
import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import { useToast } from '@/composables/useToast'
import type { BranchInformalLoan, CashRegisterExpected, CloseBankReconciliationDto } from '@/types/cashRegister'
import { DENOMINATIONS } from '@/types/cashRegister'

const authStore = useAuthStore()
const { success: toastSuccess, error: toastError } = useToast()

const showHistoryModal = ref(false)
const canViewClosureHistory = computed(() => authStore.isAdmin || authStore.isSuperadmin)

function emptyDenominationCounts(): Record<number, number> {
  return Object.fromEntries(DENOMINATIONS.map((d) => [d, 0]))
}

// ===== STATE =====
const loading = ref(false)
const saving = ref(false)
const expected = ref<CashRegisterExpected | null>(null)

const denominationCounts = ref<Record<number, number>>(emptyDenominationCounts())
const closingCash = ref(0)

const loansTab = ref<'active' | 'inactive'>('active')
const branchInformalLoans = ref<BranchInformalLoan[]>([])
const informalLoansLoading = ref(false)
const newLoanConcept = ref('')
const newLoanAmount = ref<number>(0)
const savingLoan = ref(false)
const deactivateDialogOpen = ref(false)
const deactivateNotes = ref('')
const loanToDeactivate = ref<BranchInformalLoan | null>(null)
const deactivatingLoan = ref(false)

const bankReconciliations = ref<
  Array<CloseBankReconciliationDto & { bankName: string }>
>([])

const movementsBankId = ref<number | null>(null)

function denomsStorageKey(): string {
  return `senor-arroz:cash-register-denoms:${authStore.branchId ?? 0}`
}

/** Identifica el periodo entre el último cuadre y el próximo; si cambia, el borrador guardado no aplica. */
function closureContext(exp: CashRegisterExpected): string {
  return exp.lastClosureAt ?? ''
}

const PERSIST_DENOMS_DEBOUNCE_MS = 250
let persistDenomsTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersistDenominationDraft() {
  if (typeof window === 'undefined') return
  if (persistDenomsTimer !== null) {
    clearTimeout(persistDenomsTimer)
    persistDenomsTimer = null
  }
  persistDenomsTimer = window.setTimeout(() => {
    persistDenomsTimer = null
    persistDenominationDraft()
  }, PERSIST_DENOMS_DEBOUNCE_MS)
}

function cancelPersistDenominationDraftTimer() {
  if (persistDenomsTimer !== null) {
    clearTimeout(persistDenomsTimer)
    persistDenomsTimer = null
  }
}

function flushPersistDenominationDraft() {
  cancelPersistDenominationDraftTimer()
  persistDenominationDraft()
}

function persistDenominationDraft() {
  const exp = expected.value
  if (!exp || typeof localStorage === 'undefined') return
  const counts: Record<string, number> = {}
  for (const d of DENOMINATIONS) {
    counts[String(d)] = denominationCounts.value[d] ?? 0
  }
  try {
    localStorage.setItem(
      denomsStorageKey(),
      JSON.stringify({
        v: 1,
        context: closureContext(exp),
        counts,
      })
    )
  } catch {
    /* quota u otro error: ignorar */
  }
}

function clearDenominationDraft() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(denomsStorageKey())
  } catch {
    /* ignore */
  }
}

/** Restaura conteos desde localStorage; sin datos válidos no modifica el estado actual. */
function hydrateDenominationDraft(exp: CashRegisterExpected) {
  if (typeof localStorage === 'undefined') return
  let raw: string | null
  try {
    raw = localStorage.getItem(denomsStorageKey())
  } catch {
    return
  }
  if (!raw) return

  let parsed: { v?: number; context?: string; counts?: Record<string, number> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearDenominationDraft()
    return
  }

  const ctx = closureContext(exp)
  if (parsed.context !== ctx) {
    clearDenominationDraft()
    denominationCounts.value = emptyDenominationCounts()
    recalcClosingCash()
    return
  }

  if (!parsed.counts || typeof parsed.counts !== 'object') return

  const next = emptyDenominationCounts()
  for (const d of DENOMINATIONS) {
    const v = parsed.counts[String(d)]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      next[d] = Math.floor(v)
    }
  }
  denominationCounts.value = next
  recalcClosingCash()
}

function onDenominationInput() {
  recalcClosingCash()
  schedulePersistDenominationDraft()
}

/** Normaliza el valor al salir del campo y guarda de inmediato (evita perder el último debounce). */
function onDenominationBlur(denom: number) {
  const raw = denominationCounts.value[denom]
  const n =
    typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0
  denominationCounts.value[denom] = n
  recalcClosingCash()
  flushPersistDenominationDraft()
}

// ===== COMPUTED =====
const cashDifference = computed(() => closingCash.value - (expected.value?.expectedCash ?? 0))

const totalActiveLoans = computed(() =>
  branchInformalLoans.value.reduce((sum, l) => sum + (l.amount || 0), 0)
)

const allBanksCuadred = computed(() =>
  bankReconciliations.value.every((r) => r.actualBalance - r.expectedBalance === 0)
)

const undeliveredCount = computed(() => expected.value?.undeliveredOrdersCount ?? 0)

const canSave = computed(
  () =>
    !saving.value &&
    undeliveredCount.value === 0 &&
    allBanksCuadred.value &&
    bankReconciliations.value.length > 0
)

const saveBlockReason = computed(() => {
  const n = undeliveredCount.value
  if (n > 0) {
    return n === 1
      ? 'Hay 1 pedido sin entregar; entrégalo o cancélalo antes de guardar.'
      : `Hay ${n} pedidos sin entregar; entrégalos o cancélalos antes de guardar.`
  }
  if (bankReconciliations.value.length === 0) return 'No hay bancos configurados para esta sucursal.'
  if (!allBanksCuadred.value) return 'Hay bancos con diferencia distinta de $0'
  return ''
})

const closureFromYmd = computed(() => {
  if (!expected.value) return ''
  const d = expected.value.lastClosureAt
    ? new Date(expected.value.lastClosureAt)
    : new Date(expected.value.asOf)
  return formatYmdBogota(d)
})

const closureToYmd = computed(() => {
  if (!expected.value) return ''
  return formatYmdBogota(new Date(expected.value.asOf))
})

// ===== METHODS =====
function toggleMovements(bankId: number) {
  movementsBankId.value = movementsBankId.value === bankId ? null : bankId
}

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

async function refreshExpectedPreservingBankActuals() {
  const branchId = authStore.branchId ?? undefined
  const exp = await cashRegisterApi.getExpected(branchId)
  expected.value = exp
  for (const b of exp.banks) {
    const row = bankReconciliations.value.find((r) => r.bankId === b.bankId)
    if (row) row.expectedBalance = b.expectedBalance
  }
}

async function loadBranchInformalLoans() {
  informalLoansLoading.value = true
  try {
    const scope = loansTab.value === 'inactive' ? 'inactive' : 'active'
    branchInformalLoans.value = await cashRegisterApi.getInformalLoans(authStore.branchId ?? undefined, scope)
  } catch (e) {
    console.error('Error cargando préstamos informales:', e)
    branchInformalLoans.value = []
  } finally {
    informalLoansLoading.value = false
  }
}

watch(loansTab, () => {
  void loadBranchInformalLoans()
})

async function submitNewLoan() {
  const c = newLoanConcept.value.trim()
  if (!c) {
    toastError('Concepto obligatorio', 'Escribe un concepto para el préstamo.')
    return
  }
  savingLoan.value = true
  try {
    await cashRegisterApi.createInformalLoan(
      { concept: c, amount: Number(newLoanAmount.value) || 0 },
      authStore.branchId ?? undefined
    )
    newLoanConcept.value = ''
    newLoanAmount.value = 0
    toastSuccess('Préstamo registrado', 4000)
    await refreshExpectedPreservingBankActuals()
    await loadBranchInformalLoans()
  } catch (e: any) {
    toastError('No se pudo registrar', e.message || 'Error')
  } finally {
    savingLoan.value = false
  }
}

function openDeactivateLoan(loan: BranchInformalLoan) {
  loanToDeactivate.value = loan
  deactivateNotes.value = ''
  deactivateDialogOpen.value = true
}

function onDeactivateDialogToggle(open: boolean) {
  if (!open) {
    loanToDeactivate.value = null
    deactivateNotes.value = ''
  }
}

async function confirmDeactivateLoan() {
  const loan = loanToDeactivate.value
  if (!loan) return
  deactivatingLoan.value = true
  try {
    await cashRegisterApi.deactivateInformalLoan(
      loan.id,
      { notes: deactivateNotes.value.trim() || undefined },
      authStore.branchId ?? undefined
    )
    deactivateDialogOpen.value = false
    loanToDeactivate.value = null
    toastSuccess('Préstamo dado de baja', 4000)
    await refreshExpectedPreservingBankActuals()
    await loadBranchInformalLoans()
  } catch (e: any) {
    toastError('No se pudo dar de baja', e.message || 'Error')
  } finally {
    deactivatingLoan.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const branchId = authStore.branchId ?? undefined
    expected.value = await cashRegisterApi.getExpected(branchId)
    movementsBankId.value = null

    // Inicializar conciliaciones con valores del sistema
    bankReconciliations.value = expected.value.banks.map((b) => ({
      bankId: b.bankId,
      bankName: b.bankName,
      expectedBalance: b.expectedBalance,
      actualBalance: b.expectedBalance, // Por defecto asumimos que cuadra
      adjustments: '[]',
    }))

    hydrateDenominationDraft(expected.value)
    await loadBranchInformalLoans()
  } catch (e: any) {
    console.error('Error cargando datos del cuadre:', e)
  } finally {
    loading.value = false
  }
}

async function saveClosure() {
  if (!canSave.value || !expected.value) return
  cancelPersistDenominationDraftTimer()
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
    }

    await cashRegisterApi.closeCashRegister(dto, authStore.branchId ?? undefined)
    toastSuccess('Cuadre guardado', 5000)
    clearDenominationDraft()
    denominationCounts.value = emptyDenominationCounts()
    closingCash.value = 0
    await loadData()
  } catch (e: any) {
    toastError('No se pudo guardar el cuadre', e.message || 'Error desconocido')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)

onBeforeUnmount(() => {
  flushPersistDenominationDraft()
})
</script>
