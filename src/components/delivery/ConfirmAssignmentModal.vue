<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')" title="Confirmar asignación">
        <div class="space-y-4">
            <p class="text-gray-700">Ingresa tu contraseña para confirmar la asignación de los siguientes pedidos:</p>

            <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div v-for="order in orders" :key="order.id" class="mb-3 pb-3 border-b border-gray-200 last:border-0">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-lg text-gray-900">#{{ order.id }}</span>
                        <BaseBadge variant="success">{{ order.statusDisplayName }}</BaseBadge>
                    </div>
                    <div v-if="order.addressDescription" class="text-sm text-gray-600">
                        📍 {{ order.addressDescription }}
                    </div>
                    <div v-if="order.addressAdditionalInfo" class="text-xs text-gray-600 mt-0.5">
                        {{ order.addressAdditionalInfo }}
                    </div>
                    <div v-if="order.neighborhoodName" class="text-xs text-gray-500 mt-1">
                        Barrio: {{ order.neighborhoodName }}
                    </div>
                    <p v-if="orderNotes(order)"
                        class="mt-2 text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5 whitespace-pre-wrap break-words">
                        <span class="font-semibold">Notas del pedido: </span>{{ orderNotes(order) }}
                    </p>
                </div>
            </div>

            <p v-if="assignmentError" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {{ assignmentError }}
            </p>

            <div class="space-y-2">
                <PasswordInput v-model="password" label="Contraseña" placeholder="Ingresa tu contraseña"
                    :error="passwordError" />
            </div>

            <p class="text-sm text-gray-500">
                Se imprimirá automáticamente la factura de cada pedido.
            </p>
        </div>

        <template #footer>
            <div class="flex gap-3 justify-end">
                <BaseButton @click="$emit('close')" variant="outline" :disabled="isLoading">
                    Cancelar
                </BaseButton>
                <BaseButton @click="handleConfirm" variant="primary" :loading="isLoading">
                    Confirmar asignación
                </BaseButton>
            </div>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OrderListItem } from '@/types/order'
import { useDeliveryStore } from '@/store/delivery'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

interface Props {
    isOpen: boolean
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [], assigned: [] }>()

const orderNotes = (order: OrderListItem): string => (order.notes ?? '').trim()

const deliveryStore = useDeliveryStore()
const { success, error } = useToast()
const isLoading = ref(false)
const password = ref('')
const passwordError = ref('')
const assignmentError = ref('')

const handleConfirm = async () => {
    passwordError.value = ''
    assignmentError.value = ''

    if (!password.value) {
        passwordError.value = 'La contraseña es requerida'
        return
    }

    try {
        isLoading.value = true

        const orderIds = props.orders.map(o => o.id)
        const assigned = await deliveryStore.assignOrders(orderIds, password.value)

        // Placeholder de impresión
        console.log('TODO: Imprimir facturas para pedidos:', assigned.map(o => o.id))

        success(`${assigned.length} pedido(s) asignado(s) correctamente`, 5000)

        emit('assigned')
        emit('close')

        // Limpiar password
        password.value = ''
    } catch (err: any) {
        const msg = err.message || 'Error al asignar pedidos'
        assignmentError.value = msg
        error('No se pudo asignar', msg)
    } finally {
        isLoading.value = false
    }
}
</script>
