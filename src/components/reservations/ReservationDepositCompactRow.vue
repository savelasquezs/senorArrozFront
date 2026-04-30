<template>
  <div class="flex items-center gap-1 min-w-0 rounded border border-amber-100 bg-amber-50/50 px-1.5 py-1 text-[11px]">
    <BanknotesIcon v-if="deposit.isEffective" class="w-3.5 h-3.5 shrink-0 text-amber-700" />
    <BuildingLibraryIcon v-else-if="deposit.bankName" class="w-3.5 h-3.5 shrink-0 text-blue-600" />
    <DevicePhoneMobileIcon v-else class="w-3.5 h-3.5 shrink-0 text-violet-600" />
    <span class="font-medium truncate min-w-0 flex-1 text-left text-gray-800" :title="methodLabel">
      {{ methodLabel }}
    </span>
    <span class="shrink-0 tabular-nums font-semibold text-gray-900">{{ formatCurrency(deposit.amount) }}</span>
    <div v-if="showEditRemove" class="flex items-center shrink-0 gap-0.5">
      <button
        type="button"
        class="p-0.5 rounded text-gray-500 hover:bg-white/80 transition-colors"
        title="Editar monto"
        @click.stop="emit('edit', deposit)"
      >
        <PencilIcon class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="p-0.5 rounded text-red-600 hover:bg-red-50 transition-colors"
        title="Eliminar abono"
        @click.stop="emit('remove', deposit)"
      >
        <TrashIcon class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReservationDeposit } from '@/types/reservationDeposit'
import { useFormatting } from '@/composables/useFormatting'
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  deposit: ReservationDeposit
  showEditRemove?: boolean
}>()

const emit = defineEmits<{
  edit: [deposit: ReservationDeposit]
  remove: [deposit: ReservationDeposit]
}>()

const { formatCurrency } = useFormatting()

const methodLabel = computed(() => {
  if (props.deposit.isEffective) return 'Efectivo'
  if (props.deposit.bankName) return props.deposit.bankName
  if (props.deposit.appName) return props.deposit.appName
  return 'Abono'
})
</script>
