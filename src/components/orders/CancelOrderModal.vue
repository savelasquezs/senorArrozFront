<template>
    <BaseDialog :model-value="open" title="Cancelar Pedido" size="lg"
        @update:model-value="(val) => !val && $emit('close')">
        <div class="space-y-4">
            <!-- Advertencia -->
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex">
                    <ExclamationTriangleIcon class="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">
                            Esta acción cancelará el pedido y todos sus pagos asociados
                        </h3>
                        <div class="mt-2 text-sm text-red-700">
                            <ul class="list-disc list-inside space-y-1">
                                <li>El pedido pasará a estado "Cancelado"</li>
                                <li>No se podrá revertir esta acción</li>
                                <li>Los pagos asociados se marcarán como cancelados</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Info del pedido -->
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-600">Pedido:</span>
                        <span class="ml-2 font-medium text-gray-900">#{{ order.id }}</span>
                    </div>
                    <div>
                        <span class="text-gray-600">Tipo:</span>
                        <span class="ml-2 font-medium text-gray-900">{{ order.typeDisplayName }}</span>
                    </div>
                    <div>
                        <span class="text-gray-600">Cliente:</span>
                        <span class="ml-2 font-medium text-gray-900">
                            {{ order.customerName || order.guestName || 'Sin cliente' }}
                        </span>
                    </div>
                    <div>
                        <span class="text-gray-600">Total:</span>
                        <span class="ml-2 font-medium text-gray-900">{{ formatCurrency(order.total) }}</span>
                    </div>
                </div>
            </div>

            <!-- Razón de cancelación (obligatorio) -->
            <div>
                <label for="cancelReason" class="block text-sm font-medium text-gray-700 mb-1">
                    Razón de cancelación <span class="text-red-500">*</span>
                </label>
                <textarea id="cancelReason" v-model="cancelReason" rows="4"
                    class="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="Describe por qué se está cancelando este pedido..." required />
                <p class="mt-1 text-xs text-gray-500">
                    La razón de cancelación es obligatoria y quedará registrada en el historial del pedido
                </p>
            </div>

            <!-- Confirmación adicional -->
            <div class="flex items-start">
                <input id="confirmCancel" v-model="confirmed" type="checkbox"
                    class="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded" />
                <label for="confirmCancel" class="ml-2 block text-sm text-gray-700">
                    Confirmo que deseo cancelar este pedido y entiendo que esta acción no se puede revertir
                </label>
            </div>
        </div>

        <template #footer>
            <BaseButton variant="secondary" @click="$emit('close')">
                Volver
            </BaseButton>
            <BaseButton variant="danger" :loading="cancelling" :disabled="!canCancel" @click="handleCancel">
                Confirmar Cancelación
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { OrderListItem } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

interface Props {
    open: boolean
    order: OrderListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    cancelled: []
}>()

const { formatCurrency } = useFormatting()
const { success, error } = useToast()

// Estado
const cancelling = ref(false)
const cancelReason = ref('')
const confirmed = ref(false)

// Computed
const canCancel = computed(() => {
    return cancelReason.value.trim().length > 10 && confirmed.value
})

// Métodos
const handleCancel = async () => {
    if (!canCancel.value) return

    cancelling.value = true
    try {
        await orderApi.cancel(props.order.id, cancelReason.value.trim())

        success('Pedido cancelado', 5000, 'El pedido ha sido cancelado correctamente')
        emit('cancelled')
        emit('close')

        // Resetear estado
        cancelReason.value = ''
        confirmed.value = false
    } catch (err: any) {
        error('Error al cancelar pedido', err.message)
    } finally {
        cancelling.value = false
    }
}
</script>
