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

            <!-- Selector de cliente con tipo de pedido y dirección -->
            <div>
                <CustomerSection :selected-customer="selectedCustomer" :selected-address="selectedAddress"
                    :order-type="orderType" @customer-selected="handleCustomerSelected"
                    @address-selected="handleAddressSelected" @view-customer-detail="handleViewCustomerDetail"
                    @order-type-changed="handleOrderTypeChanged" />
            </div>

            <!-- Información actual (solo si hay cliente) -->
            <div v-if="order.customerName"
                class="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p class="font-medium text-blue-900">Cliente actual:</p>
                <p class="mt-1">{{ order.customerName }}</p>
                <p v-if="order.customerPhone" class="text-blue-700 text-xs">{{ order.customerPhone }}</p>
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

    <!-- Modal de detalle del cliente -->
    <CustomerDetailModal v-if="selectedCustomer" :show="showCustomerDetail" :customer="selectedCustomer"
        @close="handleCloseCustomerDetail" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { OrderListItem, Order } from '@/types/order'
import type { Customer, CustomerAddress } from '@/types/customer'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useOrdersStore } from '@/store/orders'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CustomerSection from '@/components/customers/CustomerSection.vue'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'

interface Props {
    open: boolean
    order: OrderListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: [order?: Order]
}>()

const { success: showSuccess, error: showError } = useToast()
const ordersStore = useOrdersStore()

// Estado
const saving = ref(false)
const selectedCustomerId = ref<number | null>(props.order.customerId)
const selectedAddressId = ref<number | null>(props.order.addressId)
const orderType = ref<'onsite' | 'delivery' | 'reservation'>(props.order.type)
const showCustomerDetail = ref(false)

// Computed
const selectedCustomer = computed(() => {
    if (!selectedCustomerId.value) return null
    return ordersStore.customers.find(c => c.id === selectedCustomerId.value) || null
})

const selectedAddress = computed(() => {
    if (!selectedAddressId.value || !selectedCustomer.value) return null
    return selectedCustomer.value.addresses?.find(a => a.id === selectedAddressId.value) || null
})

const canSave = computed(() => {
    if (!selectedCustomerId.value) return false

    // Si es delivery/reservation y no hay dirección, no se puede guardar
    if ((orderType.value === 'delivery' || orderType.value === 'reservation') && !selectedAddressId.value) {
        return false
    }

    // Verificar si hubo algún cambio
    const hasCustomerChange = selectedCustomerId.value !== props.order.customerId
    const hasTypeChange = orderType.value !== props.order.type
    const hasAddressChange = selectedAddressId.value !== props.order.addressId

    return hasCustomerChange || hasTypeChange || hasAddressChange
})

// Lifecycle
onMounted(async () => {
    if (ordersStore.customers.length === 0) {
        await ordersStore.loadCustomers()
    }
})

// Métodos
const handleCustomerSelected = (customer: Customer | null) => {
    selectedCustomerId.value = customer?.id || null

    // Si se limpia el cliente, también limpiar la dirección
    if (!customer) {
        selectedAddressId.value = null
    }
}

const handleAddressSelected = (address: CustomerAddress | null) => {
    selectedAddressId.value = address?.id || null
}

const handleViewCustomerDetail = () => {
    showCustomerDetail.value = true
}

const handleCloseCustomerDetail = () => {
    showCustomerDetail.value = false
}

const handleOrderTypeChanged = (newType: 'onsite' | 'delivery' | 'reservation') => {
    orderType.value = newType

    // Si cambia a onsite, limpiar dirección
    if (newType === 'onsite') {
        selectedAddressId.value = null
    }
}

const handleSave = async () => {
    if (!selectedCustomerId.value) return

    saving.value = true
    try {
        const updateData: any = {
            customerId: selectedCustomerId.value,
        }

        // Incluir tipo si cambió
        if (orderType.value !== props.order.type) {
            updateData.type = orderType.value
        }

        // Manejar addressId según el tipo
        if (orderType.value === 'delivery' || orderType.value === 'reservation') {
            // Incluir addressId si existe
            if (selectedAddressId.value) {
                updateData.addressId = selectedAddressId.value
            }
        } else {
            // Si es onsite, eliminar addressId
            updateData.addressId = null
        }

        const updatedOrder = await orderApi.update(props.order.id, updateData)

        const message = orderType.value !== props.order.type
            ? 'Cliente y tipo de pedido actualizados'
            : 'Cliente actualizado'

        showSuccess('Pedido actualizado', 5000, message)

        // ✅ Emitir el pedido actualizado para actualización optimista
        emit('updated', updatedOrder)
        emit('close')
    } catch (error: any) {
        showError('Error al actualizar pedido', error.message)
    } finally {
        saving.value = false
    }
}
</script>
