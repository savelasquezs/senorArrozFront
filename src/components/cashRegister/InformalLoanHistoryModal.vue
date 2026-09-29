<template>
  <BaseDialog v-model="open" title="Historial de préstamos informales" size="5xl">
    <div class="space-y-4 -mt-2">
      <p class="text-sm text-gray-500">Préstamos, abonos y gastos vinculados de la sucursal.</p>

      <div v-if="loadError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ loadError }}</div>
      <div v-if="loading" class="py-12 text-center text-sm text-gray-500">Cargando...</div>

      <template v-else>
        <div v-if="items.length === 0" class="py-8 text-center text-sm text-gray-400">No hay préstamos registrados.</div>
        <div v-else class="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <article v-for="loan in items" :key="loan.id" class="rounded-xl border border-gray-200 bg-white p-3">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-semibold text-gray-900">{{ loan.concept }}</h3>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="loan.deactivatedAt ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'">
                    {{ loan.deactivatedAt ? 'Inactivo' : 'Activo' }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-gray-500">
                  Registrado {{ formatDate(loan.createdAt) }} por {{ loan.createdByName }}
                </p>
              </div>
              <div class="grid grid-cols-3 gap-3 text-right text-xs tabular-nums">
                <div><span class="block text-gray-400">Inicial</span><strong>{{ formatCurrency(loan.initialAmount) }}</strong></div>
                <div><span class="block text-gray-400">Abonado</span><strong class="text-emerald-700">{{ formatCurrency(loan.totalPaid) }}</strong></div>
                <div><span class="block text-gray-400">Saldo</span><strong class="text-orange-800">{{ formatCurrency(loan.amount) }}</strong></div>
              </div>
            </div>

            <div v-if="loan.payments.length" class="mt-3 overflow-x-auto rounded-lg border border-gray-100">
              <table class="min-w-full text-xs">
                <thead class="bg-gray-50 text-left text-gray-500">
                  <tr><th class="px-3 py-2">Fecha</th><th class="px-3 py-2">Tipo</th><th class="px-3 py-2 text-right">Abono</th><th class="px-3 py-2 text-right">Saldo</th><th class="px-3 py-2">Registro</th><th class="px-3 py-2">Nota</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="payment in loan.payments" :key="payment.id">
                    <td class="whitespace-nowrap px-3 py-2">{{ formatDate(payment.createdAt) }}</td>
                    <td class="px-3 py-2">
                      <span class="rounded-full px-2 py-0.5 font-medium"
                        :class="payment.kind === 'expense' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'">
                        {{ payment.kind === 'expense' ? `Gasto #${payment.expenseHeaderId}` : 'Efectivo' }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-right font-medium tabular-nums">{{ formatCurrency(payment.amount) }}</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(payment.balanceAfter) }}</td>
                    <td class="px-3 py-2">{{ payment.createdByName || `Usuario #${payment.createdById}` }}</td>
                    <td class="max-w-xs truncate px-3 py-2 text-gray-500" :title="payment.notes || ''">{{ payment.notes || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="mt-3 text-xs italic text-gray-400">Sin abonos registrados.</p>
          </article>
        </div>

        <div v-if="totalPages > 1" class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="text-gray-500">{{ totalCount }} préstamo(s) · Página {{ page }} de {{ totalPages }}</span>
          <div class="flex gap-2">
            <BaseButton variant="outline" size="sm" :disabled="page <= 1" @click="loadHistory(page - 1)">Anterior</BaseButton>
            <BaseButton variant="outline" size="sm" :disabled="page >= totalPages" @click="loadHistory(page + 1)">Siguiente</BaseButton>
          </div>
        </div>
      </template>
    </div>

    <template #footer><BaseButton variant="outline" @click="open = false">Cerrar</BaseButton></template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import type { BranchInformalLoanHistory } from '@/types/cashRegister'
import { defaultBusinessCalendar } from '@/utils/datetime'

const props = defineProps<{ modelValue: boolean; branchId?: number | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const open = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const loading = ref(false)
const loadError = ref('')
const items = ref<BranchInformalLoanHistory[]>([])
const page = ref(1)
const totalCount = ref(0)
const totalPages = ref(0)

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(value ?? 0)
const formatDate = (value: string) => defaultBusinessCalendar.formatDateMediumTime(value)

async function loadHistory(targetPage = 1) {
  loading.value = true
  loadError.value = ''
  try {
    const result = await cashRegisterApi.getInformalLoanHistory(props.branchId ?? undefined, targetPage, 10)
    items.value = result.items
    page.value = result.page
    totalCount.value = result.totalCount
    totalPages.value = result.totalPages
  } catch (error: any) {
    loadError.value = error?.message || 'No se pudo cargar el historial.'
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, value => {
  if (value) void loadHistory(1)
})
</script>
