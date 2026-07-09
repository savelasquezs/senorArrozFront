<template>
  <BaseCard>
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <PrinterIcon class="w-6 h-6 text-gray-600" />
        Impresion termica
      </h3>
      <p class="text-sm text-gray-600">
        Nombres de cola Windows, reglas de encolado y token del agente que consulta la API en cada sucursal.
      </p>

      <BranchPrintSettingsForm :branch-id="branchId" :initial="printSettings" @saved="$emit('saved')" />

      <div
        v-if="printSettings && (printSettings.enableKitchenJobs || printSettings.enableDeliveryJobs)"
        class="pt-4 mt-4 border-t border-gray-100 space-y-3"
      >
        <p class="text-sm text-gray-600">
          Encola un ticket de prueba (datos ficticios) para verificar la impresora y el agente, sin pedido real.
        </p>
        <div class="flex flex-wrap gap-2">
          <BaseButton
            v-if="printSettings.enableKitchenJobs"
            variant="outline"
            size="sm"
            :loading="testPrintLoading === 'kitchen'"
            @click="$emit('test-print', 'kitchen')"
          >
            Impresion prueba (cocina)
          </BaseButton>
          <BaseButton
            v-if="printSettings.enableDeliveryJobs"
            variant="outline"
            size="sm"
            :loading="testPrintLoading === 'delivery'"
            @click="$emit('test-print', 'delivery')"
          >
            Impresion prueba (domicilio)
          </BaseButton>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { PrinterIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BranchPrintSettingsForm from '@/components/branches/BranchPrintSettingsForm.vue'
import type { BranchPrintSettings } from '@/types/common'

type PrintTestKind = 'kitchen' | 'delivery'

defineProps<{
  branchId: number
  printSettings: BranchPrintSettings | null | undefined
  testPrintLoading: PrintTestKind | null
}>()

defineEmits<{
  saved: []
  'test-print': [kind: PrintTestKind]
}>()
</script>
