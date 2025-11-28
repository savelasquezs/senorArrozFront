<template>
    <BaseDialog :model-value="isOpen" @update:model-value="handleClose" :title="title" size="md">
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Selector de domiciliario (solo en modo crear) -->
            <div v-if="!editingAdvance">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Domiciliario <span class="text-red-500">*</span>
                </label>
                <select v-model="formData.deliverymanId" required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    :disabled="!deliverymen || deliverymen.length === 0">
                    <option :value="null" disabled>Seleccionar domiciliario</option>
                    <option v-for="dm in deliverymen" :key="dm.deliverymanId" :value="dm.deliverymanId">
                        {{ dm.deliverymanName }} ({{ dm.ordersCount }} pedidos)
                    </option>
                </select>
                <p v-if="!deliverymen || deliverymen.length === 0" class="text-xs text-amber-600 mt-1">
                    No hay domiciliarios con pedidos entregados hoy
                </p>
            </div>

            <!-- Monto -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Monto <span class="text-red-500">*</span>
                </label>
                <input v-model.number="formData.amount" type="number" required min="1" step="1000" :max="maxAmount"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ingrese el monto" />
                <div v-if="suggestedAmount > 0" class="mt-2 space-y-1">
                    <p class="text-sm text-gray-600">
                        Valor sugerido:
                        <button type="button" @click="formData.amount = suggestedAmount"
                            class="font-semibold text-emerald-600 hover:text-emerald-700 underline">
                            {{ formatCurrency(suggestedAmount) }}
                        </button>
                    </p>
                    <p class="text-xs text-gray-500">
                        (Deja al domiciliario solo con la base)
                    </p>
                </div>
                <p v-if="maxAmount > 0" class="text-xs text-gray-500 mt-1">
                    Máximo disponible: {{ formatCurrency(maxAmount) }}
                </p>
            </div>

            <!-- Comentarios -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Comentario (opcional)
                </label>
                <textarea v-model="formData.notes" rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="Ej: Abono por cierre de turno"></textarea>
            </div>
        </form>

        <template #footer>
            <BaseButton @click="handleClose" variant="secondary">
                Cancelar
            </BaseButton>
            <BaseButton @click="handleSubmit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ editingAdvance ? 'Actualizar' : 'Crear' }} abono
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { DeliverymanAdvance, DeliverymanStats } from '@/types/deliveryman.ts'
import { useFormatting } from '@/composables/useFormatting'
import { useDeliverymanStats } from '@/composables/useDeliverymanStats.ts'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Props {
    isOpen: boolean
    deliverymen?: DeliverymanStats[]
    editingAdvance?: DeliverymanAdvance | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    deliverymen: () => [],
    editingAdvance: null,
    loading: false
})

const emit = defineEmits<{
    'close': []
    'submit': [data: { deliverymanId: number; amount: number; notes?: string }]
}>()

const { formatCurrency } = useFormatting()
const { calculateSuggestedAdvance, calculateMaxAdvance } = useDeliverymanStats()

const formData = ref({
    deliverymanId: null as number | null,
    amount: 0,
    notes: ''
})

const title = computed(() => props.editingAdvance ? 'Editar abono' : 'Nuevo abono')

// Encontrar el deliveryman seleccionado
const selectedDeliveryman = computed(() => {
    if (!formData.value.deliverymanId) return null
    return props.deliverymen.find(dm => dm.deliverymanId === formData.value.deliverymanId)
})

// Calcular monto sugerido y máximo
const suggestedAmount = computed(() => {
    if (!selectedDeliveryman.value) return 0
    return calculateSuggestedAdvance(
        selectedDeliveryman.value.totalCash,
        selectedDeliveryman.value.totalAdvances
    )
})

const maxAmount = computed(() => {
    if (!selectedDeliveryman.value) return 0
    return calculateMaxAdvance(
        selectedDeliveryman.value.totalCash,
        selectedDeliveryman.value.totalAdvances,
        selectedDeliveryman.value.baseAmount
    )
})

const isFormValid = computed(() => {
    return formData.value.deliverymanId &&
        formData.value.amount > 0 &&
        formData.value.amount <= maxAmount.value
})

// Cargar datos al editar
watch(() => props.editingAdvance, (advance) => {
    if (advance) {
        formData.value = {
            deliverymanId: advance.deliverymanId,
            amount: advance.amount,
            notes: advance.notes || ''
        }
    }
}, { immediate: true })

// Limpiar formulario al abrir/cerrar
watch(() => props.isOpen, (isOpen) => {
    if (isOpen && !props.editingAdvance) {
        formData.value = {
            deliverymanId: null,
            amount: 0,
            notes: ''
        }
    }
})

const handleSubmit = () => {
    if (!isFormValid.value) return

    emit('submit', {
        deliverymanId: formData.value.deliverymanId!,
        amount: formData.value.amount,
        notes: formData.value.notes || undefined
    })
}

const handleClose = () => {
    emit('close')
}
</script>
