<template>
    <BaseDialog :model-value="open" title="Editar Cliente del Pedido"
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

            <!-- Selector de cliente -->
            <div>
                <CustomerSection :customer-id="order.customerId || undefined" :order-type="order.type"
                    @customer-selected="handleCustomerSelected" />
            </div>

            <!-- Información actual -->
            <div v-if="order.customerName" class="text-sm text-gray-600">
                <p class="font-medium">Cliente actual:</p>
                <p class="mt-1">{{ order.customerName }}</p>
                <p v-if="order.customerPhone" class="text-gray-500">{{ order.customerPhone }}</p>
            </div>
        </div>

        <template #footer>
            <BaseButton variant="secondary" @click="$emit('close')">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving"
                :disabled="!selectedCustomerId || selectedCustomerId === order.customerId" @click="handleSave">
                Guardar cambios
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OrderListItem } from '@/types/order'
import type { Customer } from '@/types/customer'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CustomerSection from '@/components/customers/CustomerSection.vue'

interface Props {
    open: boolean
    order: OrderListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: []
}>()

const { success: showSuccess, error: showError } = useToast()

// Estado
const saving = ref(false)
const selectedCustomerId = ref<number | null>(null)

// Métodos
const handleCustomerSelected = (customer: Customer | null) => {
    selectedCustomerId.value = customer?.id || null
}

const handleSave = async () => {
    if (!selectedCustomerId.value) return

    saving.value = true
    try {
        await orderApi.update(props.order.id, {
            customerId: selectedCustomerId.value,
        })

        showSuccess('Cliente actualizado', 5000, 'El cliente del pedido ha sido actualizado')
        emit('updated')
        emit('close')
    } catch (error: any) {
        showError('Error al actualizar cliente', error.message)
    } finally {
        saving.value = false
    }
}
</script>
