<template>
  <MainLayout>
    <div class="p-6 space-y-6 max-w-4xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Movimientos entre Bancos</h1>
          <p class="text-sm text-gray-500 mt-1">Transferencias entre cuentas de la sucursal</p>
        </div>
        <BaseButton @click="showCreateModal = true" variant="primary" size="sm">
          <PlusIcon class="w-4 h-4 mr-1" /> Nueva Transferencia
        </BaseButton>
      </div>

      <!-- Lista de transferencias -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-700">Historial</h2>
          <BaseButton variant="outline" size="sm" @click="loadTransfers" :loading="loading">
            <ArrowPathIcon class="w-4 h-4" />
          </BaseButton>
        </div>

        <div v-if="loading" class="p-6 space-y-3">
          <div v-for="i in 5" :key="i" class="h-14 bg-gray-100 animate-pulse rounded-lg" />
        </div>

        <div v-else-if="transfers.length === 0" class="p-12 text-center text-gray-400">
          <ArrowsRightLeftIcon class="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Sin transferencias registradas</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="t in transfers"
            :key="t.id"
            class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 text-sm">
                <span class="font-medium text-gray-800">{{ t.fromBankName }}</span>
                <ArrowRightIcon class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span class="font-medium text-gray-800">{{ t.toBankName }}</span>
              </div>
              <p v-if="t.note" class="text-xs text-gray-400 mt-0.5 truncate">{{ t.note }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-base font-bold text-green-700">{{ formatCurrency(t.amount) }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(t.createdAt) }}</p>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p class="text-sm text-gray-500">Página {{ currentPage }} de {{ totalPages }}</p>
          <div class="flex gap-2">
            <BaseButton variant="outline" size="sm" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
              Anterior
            </BaseButton>
            <BaseButton variant="outline" size="sm" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
              Siguiente
            </BaseButton>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal crear transferencia -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="showCreateModal = false"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900">Nueva Transferencia</h3>
            <button @click="showCreateModal = false" class="text-gray-400 hover:text-gray-600">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Origen</label>
              <select
                v-model.number="form.fromBankId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option :value="UNSELECTED" disabled>Seleccionar…</option>
                <option :value="CASH">Efectivo (caja)</option>
                <option
                  v-for="b in banks"
                  :key="b.id"
                  :value="b.id"
                  :disabled="form.toBankId > 0 && b.id === form.toBankId"
                >{{ b.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Destino</label>
              <select
                v-model.number="form.toBankId"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option :value="UNSELECTED" disabled>Seleccionar…</option>
                <option :value="CASH">Efectivo (caja)</option>
                <option
                  v-for="b in banks"
                  :key="b.id"
                  :value="b.id"
                  :disabled="form.fromBankId > 0 && b.id === form.fromBankId"
                >{{ b.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                v-model.number="form.amount"
                type="number"
                min="1"
                step="100"
                placeholder="0"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
              <input
                v-model="form.note"
                type="text"
                placeholder="Ej: Cambio de efectivo"
                maxlength="200"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div v-if="createError" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {{ createError }}
          </div>

          <div class="flex gap-3 justify-end pt-2">
            <BaseButton variant="outline" @click="showCreateModal = false">Cancelar</BaseButton>
            <BaseButton
              variant="primary"
              :loading="creating"
              :disabled="!formValid"
              @click="createTransfer"
            >
              Transferir
            </BaseButton>
          </div>
        </div>
      </div>
    </Teleport>

  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  PlusIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { bankTransferApi } from '@/services/MainAPI/bankTransferApi'
import { bankApi } from '@/services/MainAPI/bankApi'
import type { BankTransfer } from '@/types/cashRegister'
import type { Bank } from '@/types/bank'

/** Sin elegir; 0 = efectivo de caja; &gt;0 = id de banco */
const UNSELECTED = -1
const CASH = 0

// ===== STATE =====
const loading = ref(false)
const transfers = ref<BankTransfer[]>([])
const banks = ref<Bank[]>([])
const currentPage = ref(1)
const totalPages = ref(1)

const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')

const form = ref({
  fromBankId: UNSELECTED,
  toBankId: UNSELECTED,
  amount: 0,
  note: '',
})

// ===== COMPUTED =====
const formValid = computed(() => {
  const f = form.value.fromBankId
  const t = form.value.toBankId
  if (f === UNSELECTED || t === UNSELECTED) return false
  if (f === CASH && t === CASH) return false
  if (f > 0 && t > 0 && f === t) return false
  if (f === CASH && t <= 0) return false
  if (t === CASH && f <= 0) return false
  return form.value.amount > 0
})

// ===== METHODS =====
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value ?? 0)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

async function loadTransfers() {
  loading.value = true
  try {
    const result = await bankTransferApi.getBankTransfers({
      page: currentPage.value,
      pageSize: 15,
      sortOrder: 'desc',
    })
    transfers.value = result.items
    totalPages.value = result.totalPages ?? Math.ceil(result.totalCount / 15)
  } catch (e: any) {
    console.error('Error cargando transferencias:', e)
  } finally {
    loading.value = false
  }
}

async function loadBanks() {
  try {
    const result = await bankApi.getBanks({ page: 1, pageSize: 50 })
    banks.value = result.items
  } catch (e) {
    console.error('Error cargando bancos:', e)
  }
}

function changePage(page: number) {
  currentPage.value = page
  loadTransfers()
}

async function createTransfer() {
  if (!formValid.value) return
  creating.value = true
  createError.value = ''
  try {
    await bankTransferApi.createBankTransfer({
      fromBankId: form.value.fromBankId === CASH ? null : form.value.fromBankId,
      toBankId: form.value.toBankId === CASH ? null : form.value.toBankId,
      amount: form.value.amount,
      note: form.value.note || undefined,
    })
    showCreateModal.value = false
    form.value = { fromBankId: UNSELECTED, toBankId: UNSELECTED, amount: 0, note: '' }
    await loadTransfers()
  } catch (e: any) {
    createError.value = e.message || 'Error al crear la transferencia'
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadTransfers(), loadBanks()])
})
</script>
