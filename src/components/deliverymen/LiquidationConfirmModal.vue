<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')" title="Liquidación completada" size="md" icon-variant="success">
        <div class="space-y-4">
            <div class="flex items-center justify-center">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon class="w-10 h-10 text-green-600" />
                </div>
            </div>

            <div class="text-center">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">
                    ¡Domiciliario liquidado exitosamente!
                </h3>
                <p class="text-gray-600">
                    Se ha creado un abono de <span class="font-semibold">{{ formatCurrency(amount) }}</span>
                </p>
            </div>

            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Domiciliario:</span>
                    <span class="font-medium text-gray-900">{{ deliverymanName }}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Monto liquidado:</span>
                    <span class="font-semibold text-green-600">{{ formatCurrency(amount) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Balance final:</span>
                    <span class="font-medium text-gray-900">{{ formatCurrency(baseAmount) }}</span>
                </div>
            </div>

            <div class="border-t pt-4">
                <p class="text-sm text-gray-600 text-center mb-4">
                    ¿Deseas registrar este monto como gasto en el sistema?
                </p>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div class="flex items-start">
                        <InformationCircleIcon class="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                        <p class="text-sm text-blue-800">
                            Puedes crear el gasto ahora o hacerlo más tarde desde la sección de gastos.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">
                Cerrar
            </BaseButton>
            <BaseButton @click="$emit('go-to-expenses')" variant="primary">
                Ir a Gastos
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { useFormatting } from '@/composables/useFormatting'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { CheckCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'

interface Props {
    isOpen: boolean
    deliverymanName: string
    amount: number
    baseAmount: number
}

defineProps<Props>()
defineEmits<{
    'close': []
    'go-to-expenses': []
}>()

const { formatCurrency } = useFormatting()
</script>

