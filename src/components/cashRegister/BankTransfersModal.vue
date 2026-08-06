<template>
  <BaseDialog
    :model-value="modelValue"
    title="Movimientos entre Bancos"
    size="4xl"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-500">Transferencias entre cuentas de la sucursal y el efectivo de caja.</p>
        <BaseButton variant="primary" size="sm" @click="openCreateDialog">
          <PlusIcon class="mr-1 h-4 w-4" /> Nueva transferencia
        </BaseButton>
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
          <h3 class="text-base font-semibold text-gray-700">Historial</h3>
          <BaseButton variant="outline" size="sm" :loading="loading" @click="loadTransfers">
            <ArrowPathIcon class="h-4 w-4" />
          </BaseButton>
        </div>

        <div v-if="loading" class="space-y-3 p-6">
          <div v-for="item in 5" :key="item" class="h-14 animate-pulse rounded-lg bg-gray-100" />
        </div>

        <div v-else-if="loadError" class="p-8 text-center">
          <p class="text-sm text-red-600">{{ loadError }}</p>
          <BaseButton variant="outline" size="sm" class="mt-3" @click="loadModalData">Reintentar</BaseButton>
        </div>

        <div v-else-if="transfers.length === 0" class="p-12 text-center text-gray-400">
          <ArrowsRightLeftIcon class="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>Sin transferencias registradas</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="transfer in transfers"
            :key="transfer.id"
            class="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50 sm:px-6"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 text-sm">
                <span class="font-medium text-gray-800">{{ transfer.fromBankName }}</span>
                <ArrowRightIcon class="h-4 w-4 shrink-0 text-gray-400" />
                <span class="font-medium text-gray-800">{{ transfer.toBankName }}</span>
              </div>
              <p v-if="transfer.note" class="mt-0.5 truncate text-xs text-gray-400">{{ transfer.note }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-base font-bold text-green-700">{{ formatCurrency(transfer.amount) }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(transfer.createdAt) }}</p>
            </div>
          </div>
        </div>

        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-6"
        >
          <p class="text-sm text-gray-500">Página {{ currentPage }} de {{ totalPages }}</p>
          <div class="flex gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              :disabled="currentPage === 1 || loading"
              @click="changePage(currentPage - 1)"
            >
              Anterior
            </BaseButton>
            <BaseButton
              variant="outline"
              size="sm"
              :disabled="currentPage === totalPages || loading"
              @click="changePage(currentPage + 1)"
            >
              Siguiente
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <BaseDialog
      v-model="showCreateDialog"
      title="Nueva transferencia"
      size="md"
      z-class="z-[60]"
      :close-on-backdrop="!creating"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Origen</label>
          <select
            v-model.number="form.fromBankId"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option :value="UNSELECTED" disabled>Seleccionar…</option>
            <option :value="CASH">Efectivo (caja)</option>
            <option
              v-for="bank in banks"
              :key="bank.id"
              :value="bank.id"
              :disabled="form.toBankId > 0 && bank.id === form.toBankId"
            >
              {{ bank.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Destino</label>
          <select
            v-model.number="form.toBankId"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option :value="UNSELECTED" disabled>Seleccionar…</option>
            <option :value="CASH">Efectivo (caja)</option>
            <option
              v-for="bank in banks"
              :key="bank.id"
              :value="bank.id"
              :disabled="form.fromBankId > 0 && bank.id === form.fromBankId"
            >
              {{ bank.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Monto</label>
          <input
            v-model.number="form.amount"
            type="number"
            min="1"
            step="100"
            placeholder="0"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700">Nota (opcional)</label>
          <input
            v-model="form.note"
            type="text"
            maxlength="200"
            placeholder="Ej: Cambio de efectivo"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div v-if="createError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ createError }}</div>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton variant="outline" :disabled="creating" @click="showCreateDialog = false">Cancelar</BaseButton>
          <BaseButton variant="primary" :loading="creating" :disabled="!formValid" @click="createTransfer">
            Transferir
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
} from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { bankApi } from '@/services/MainAPI/bankApi'
import { bankTransferApi } from '@/services/MainAPI/bankTransferApi'
import type { Bank } from '@/types/bank'
import type { BankTransfer } from '@/types/cashRegister'
import { defaultBusinessCalendar } from '@/utils/datetime'

const props = defineProps<{
  modelValue: boolean
  branchId: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const UNSELECTED = -1
const CASH = 0
const PAGE_SIZE = 15

const loading = ref(false)
const loadError = ref('')
const transfers = ref<BankTransfer[]>([])
const banks = ref<Bank[]>([])
const currentPage = ref(1)
const totalPages = ref(1)
const showCreateDialog = ref(false)
const creating = ref(false)
const createError = ref('')
const form = ref(emptyForm())

function emptyForm() {
  return { fromBankId: UNSELECTED, toBankId: UNSELECTED, amount: 0, note: '' }
}

const formValid = computed(() => {
  const from = form.value.fromBankId
  const to = form.value.toBankId
  if (from === UNSELECTED || to === UNSELECTED) return false
  if (from === CASH && to === CASH) return false
  if (from > 0 && to > 0 && from === to) return false
  if (from === CASH && to <= 0) return false
  if (to === CASH && from <= 0) return false
  return Number(form.value.amount) > 0
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value ?? 0)
}

function formatDate(iso: string): string {
  return defaultBusinessCalendar.formatDateTimeCompact(iso)
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

async function loadTransfers() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await bankTransferApi.getBankTransfers({
      branchId: props.branchId,
      page: currentPage.value,
      pageSize: PAGE_SIZE,
      sortOrder: 'desc',
    })
    transfers.value = result.items
    totalPages.value = result.totalPages ?? Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE))
  } catch (error) {
    loadError.value = messageFrom(error, 'No se pudo cargar el historial de movimientos.')
  } finally {
    loading.value = false
  }
}

async function loadBanks() {
  const result = await bankApi.getBanks({
    branchId: props.branchId,
    page: 1,
    pageSize: 100,
    active: true,
  })
  banks.value = result.items
}

async function loadModalData() {
  loadError.value = ''
  try {
    await Promise.all([loadTransfers(), loadBanks()])
  } catch (error) {
    loadError.value = messageFrom(error, 'No se pudieron cargar los bancos de la sucursal.')
  }
}

function openCreateDialog() {
  createError.value = ''
  form.value = emptyForm()
  showCreateDialog.value = true
}

async function changePage(page: number) {
  currentPage.value = page
  await loadTransfers()
}

async function createTransfer() {
  if (!formValid.value) return
  creating.value = true
  createError.value = ''
  try {
    await bankTransferApi.createBankTransfer({
      fromBankId: form.value.fromBankId === CASH ? null : form.value.fromBankId,
      toBankId: form.value.toBankId === CASH ? null : form.value.toBankId,
      amount: Number(form.value.amount),
      note: form.value.note.trim() || undefined,
    })
    form.value = emptyForm()
    showCreateDialog.value = false
    emit('update:modelValue', false)
    emit('saved')
  } catch (error) {
    createError.value = messageFrom(error, 'Error al crear la transferencia')
  } finally {
    creating.value = false
  }
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      showCreateDialog.value = false
      return
    }
    currentPage.value = 1
    await loadModalData()
  },
  { immediate: true },
)
</script>
