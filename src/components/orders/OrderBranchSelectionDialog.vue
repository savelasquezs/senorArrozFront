<template>
    <BaseDialog :model-value="modelValue" title="Sucursal que atenderá el pedido" size="md"
        @update:model-value="$emit('update:modelValue', $event)">
        <p class="mb-4 text-sm text-gray-600">
            Esta dirección puede ser atendida desde las siguientes sucursales. Elige cuál preparará y despachará este pedido.
        </p>

        <div class="space-y-2">
            <button v-for="option in options" :key="option.branchId" type="button"
                class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
                @click="$emit('select', option.branchId)">
                <span>
                    <span class="block font-semibold text-gray-900">{{ option.branchName }}</span>
                    <span v-if="option.neighborhoodName" class="block text-xs text-gray-500">
                        {{ option.neighborhoodName }}
                    </span>
                </span>
                <span class="shrink-0 text-sm font-semibold text-emerald-700">
                    {{ formatCurrency(option.deliveryFee) }}
                </span>
            </button>
        </div>

        <div v-if="allowCalculateCurrent" class="mt-4 border-t border-gray-200 pt-4">
            <BaseButton variant="outline" class="w-full" @click="$emit('calculate-current')">
                Calcular domicilio desde {{ currentBranchName }}
            </BaseButton>
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import type { OrderBranchOption } from '@/helpers/orderBranchOptions'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'

defineProps<{
    modelValue: boolean
    options: OrderBranchOption[]
    currentBranchName: string
    allowCalculateCurrent: boolean
}>()

defineEmits<{
    'update:modelValue': [value: boolean]
    select: [branchId: number]
    'calculate-current': []
}>()

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
}).format(amount)
</script>
