<template>
    <BaseDialog :model-value="open" title="Cambiar Tipo de Pedido"
        @update:model-value="(val) => !val && $emit('close')">
        <div class="space-y-4">
            <!-- Info del pedido -->
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-sm text-gray-600">
                    Pedido <span class="font-medium text-gray-900">#{{ order.id }}</span>
                </div>
                <div class="mt-1 text-xs text-gray-500">
                    {{ order.typeDisplayName }} - {{ order.statusDisplayName }}
                </div>
            </div>

            <!-- Selector de tipo -->
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Tipo de pedido</label>
                <BaseRadioGroup v-model="selectedType" :options="orderTypeOptions" name="order-type" size="sm" />
            </div>

            <!-- Campo condicional: Fecha de reserva (solo si tipo === 'reservation') -->
            <div v-if="selectedType === 'reservation'" class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">
                    Tener listo a esta hora
                    <span class="text-red-500">*</span>
                </label>
                <input v-model="reservedFor" type="datetime-local"
                    class="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    :min="minDateTime" />
                <p class="text-xs text-gray-500">
                    Fecha y hora en que el pedido debe estar listo
                </p>
            </div>

            <!-- Advertencias según tipo seleccionado -->
            <div v-if="validationWarning" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p class="text-sm text-yellow-800">{{ validationWarning }}</p>
            </div>
        </div>

        <template #footer>
            <BaseButton variant="secondary" @click="$emit('close')">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="!canSave" @click="handleSave">
                Guardar cambios
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderListItem, OrderDetailView, Order } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseRadioGroup from '@/components/ui/BaseRadioGroup.vue'

interface Props {
    open: boolean
    order: OrderListItem | OrderDetailView
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: [order?: Order]
}>()

const { success, error } = useToast()

// Estado
const saving = ref(false)
const selectedType = ref<'onsite' | 'delivery' | 'reservation'>(props.order.type)
const reservedFor = ref<string>('')

// Options for order type selector
const orderTypeOptions = [
    { value: 'onsite', label: 'En el Local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
]

// Computed properties
const minDateTime = computed(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
})

const canSave = computed(() => {
    // Sin cambios
    if (selectedType.value === props.order.type) return false

    // Cambio a delivery: requiere cliente + dirección + guestName
    if (selectedType.value === 'delivery') {
        if (!props.order.customerId || !props.order.addressId || !props.order.guestName) {
            return false
        }
    }

    // Cambio a reservation: requiere guestName + reservedFor
    if (selectedType.value === 'reservation') {
        if (!props.order.guestName || !reservedFor.value) {
            return false
        }
    }

    return true
})

const validationWarning = computed(() => {
    if (selectedType.value === 'delivery' && !props.order.customerId) {
        return 'Para cambiar a Domicilio, primero debes asignar un cliente y una dirección'
    }
    if (selectedType.value === 'delivery' && !props.order.addressId) {
        return 'Para cambiar a Domicilio, primero debes asignar una dirección al cliente'
    }
    if (selectedType.value === 'delivery' && !props.order.guestName) {
        return 'Para cambiar a Domicilio, debes especificar el nombre de quien recibe'
    }
    if (selectedType.value === 'reservation' && !props.order.guestName) {
        return 'Para cambiar a Reserva, debes especificar el nombre de quien recibe'
    }
    return ''
})

// Watch for changes in selectedType to reset reservedFor
watch(selectedType, (newType) => {
    if (newType !== 'reservation') {
        reservedFor.value = ''
    } else if (props.order.reservedFor) {
        // Convert existing reservedFor to datetime-local format
        const date = new Date(props.order.reservedFor)
        reservedFor.value = date.toISOString().slice(0, 16)
    }
})

// Initialize reservedFor if order is already a reservation
watch(() => props.open, (isOpen) => {
    if (isOpen) {
        selectedType.value = props.order.type
        if (props.order.type === 'reservation' && props.order.reservedFor) {
            const date = new Date(props.order.reservedFor)
            reservedFor.value = date.toISOString().slice(0, 16)
        } else {
            reservedFor.value = ''
        }
    }
}, { immediate: true })

// Methods
const handleSave = async () => {
    saving.value = true
    try {
        const updateData: any = {
            type: selectedType.value
        }

        // Si cambia a reservation, incluir reservedFor
        if (selectedType.value === 'reservation') {
            updateData.reservedFor = new Date(reservedFor.value)
        }

        // Si cambia desde reservation a otro tipo, limpiar reservedFor
        if (props.order.type === 'reservation' && selectedType.value !== 'reservation') {
            updateData.reservedFor = null
        }

        // Si cambia desde delivery a otro tipo, limpiar deliveryFee
        if (props.order.type === 'delivery' && selectedType.value !== 'delivery') {
            updateData.deliveryFee = null
        }

        // Si cambia a onsite, limpiar addressId
        if (selectedType.value === 'onsite') {
            updateData.addressId = null
        }

        const updatedOrder = await orderApi.update(props.order.id, updateData)

        success('Tipo de pedido actualizado', 5000)
        emit('updated', updatedOrder)
        emit('close')
    } catch (err: any) {
        error('Error al actualizar tipo', err.message)
    } finally {
        saving.value = false
    }
}
</script>
