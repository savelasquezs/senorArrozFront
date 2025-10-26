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

            <!-- Selector de cliente con dirección -->
            <div>
                <CustomerSection :selected-customer="selectedCustomer" :selected-address="selectedAddress"
                    :order-type="props.order.type" :show-type-selector="false" mode="persisted"
                    @customer-selected="handleCustomerSelected" @address-selected="handleAddressSelected"
                    @view-customer-detail="handleViewCustomerDetail" />
            </div>

            <!-- Guest Name / Recipient Name -->
            <div class="py-3 border-b border-gray-200">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de quien recibe
                    <span v-if="props.order.type === 'delivery' || props.order.type === 'reservation'"
                        class="text-red-500">*</span>
                </label>
                <BaseInput :model-value="selectedGuestName"
                    @update:model-value="(value) => selectedGuestName = String(value || '')"
                    placeholder="Ej: Juan Pérez, María López..." :error="guestNameError" />
            </div>

            <!-- Delivery Fee - SOLO SI TIPO ES DELIVERY -->
            <div v-if="props.order.type === 'delivery'" class="py-3 border-b border-gray-200">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Tarifa de domicilio
                    <span class="text-red-500">*</span>
                    <span v-if="isSuggestedValue" class="text-xs text-blue-600 ml-2">(sugerido por la dirección)</span>
                </label>
                <BaseInput v-model="deliveryFee" type="number" placeholder="0" :error="deliveryFeeError"
                    @input="markAsManuallyEdited" />
                <p class="text-xs text-gray-500 mt-1">
                    Costo del domicilio para este pedido
                    <span v-if="isSuggestedValue" class="text-blue-600">• Valor sugerido por la dirección
                        seleccionada</span>
                </p>
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
import { useOrdersDataStore } from '@/store/ordersData'
import { useToast } from '@/composables/useToast'
import { useDeliveryFee } from '@/composables/useDeliveryFee'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CustomerSection from '@/components/customers/CustomerSection.vue'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

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
const ordersStore = useOrdersDataStore()
const permissions = useOrderPermissions()

// Estado
const saving = ref(false)
const selectedCustomerId = ref<number | null>(props.order.customerId)
const selectedAddressId = ref<number | null>(props.order.addressId)
const selectedGuestName = ref<string | null>(props.order.guestName || props.order.customerName || null)
const { deliveryFee, autoCompleteFromAddress, markAsManuallyEdited, isSuggestedValue } = useDeliveryFee(props.order.deliveryFee || 0)
const showCustomerDetail = ref(false)
const selectedCustomer = computed(() => {
    if (!selectedCustomerId.value) return null
    return ordersStore.customers.find(c => c.id === selectedCustomerId.value) || null
})

const selectedAddress = computed(() => {
    if (!selectedAddressId.value || !selectedCustomer.value) return null
    return selectedCustomer.value.addresses?.find(a => a.id === selectedAddressId.value) || null
})

const canEdit = computed(() => permissions.canEditOrder(props.order))

const canSave = computed(() => {
    // Si no se puede editar, no se puede guardar
    if (!canEdit.value) return false

    // Si es delivery y no hay deliveryFee válido, no se puede guardar
    if (props.order.type === 'delivery' && (!deliveryFee.value || deliveryFee.value < 0)) {
        return false
    }

    // Si es delivery/reservation y no hay cliente, no se puede guardar
    if ((props.order.type === 'delivery' || props.order.type === 'reservation') && !selectedCustomerId.value) {
        return false
    }

    // Si es delivery/reservation y no hay dirección, no se puede guardar
    if ((props.order.type === 'delivery' || props.order.type === 'reservation') && !selectedAddressId.value) {
        return false
    }

    // Si es delivery/reservation y no hay guestName, no se puede guardar
    if ((props.order.type === 'delivery' || props.order.type === 'reservation') && !selectedGuestName.value?.trim()) {
        return false
    }

    // Verificar si hubo algún cambio
    const hasCustomerChange = selectedCustomerId.value !== props.order.customerId
    const hasAddressChange = selectedAddressId.value !== props.order.addressId
    const hasGuestNameChange = selectedGuestName.value !== props.order.guestName
    const hasDeliveryFeeChange = deliveryFee.value !== props.order.deliveryFee

    return hasCustomerChange || hasAddressChange || hasGuestNameChange || hasDeliveryFeeChange
})

const guestNameError = computed(() => {
    const requiresGuestName = props.order.type === 'delivery' || props.order.type === 'reservation'
    if (requiresGuestName && !selectedGuestName.value?.trim()) {
        return 'El nombre de quien recibe es obligatorio para este tipo de pedido'
    }
    return ''
})

const deliveryFeeError = computed(() => {
    if (props.order.type === 'delivery' && (!deliveryFee.value || deliveryFee.value < 0)) {
        return 'La tarifa de domicilio es obligatoria'
    }
    return ''
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

    // Auto-fill guestName with customer name if not already set
    if (customer && customer.name && !selectedGuestName.value?.trim()) {
        selectedGuestName.value = customer.name
    } else if (!customer) {
        // Customer removed, clear guestName
        selectedGuestName.value = null
    }

    // Si se limpia el cliente, también limpiar la dirección
    if (!customer) {
        selectedAddressId.value = null
    }
}

const handleAddressSelected = (address: CustomerAddress | null) => {
    selectedAddressId.value = address?.id || null

    // ✅ Auto-completar deliveryFee usando el composable
    autoCompleteFromAddress(address)
}

const handleViewCustomerDetail = () => {
    showCustomerDetail.value = true
}

const handleCloseCustomerDetail = () => {
    showCustomerDetail.value = false
}

const handleSave = async () => {
    if (!selectedCustomerId.value) return

    saving.value = true
    try {
        const updateData: any = {
            customerId: selectedCustomerId.value,
        }

        // Incluir guestName si cambió
        if (selectedGuestName.value !== props.order.guestName) {
            updateData.guestName = selectedGuestName.value || undefined
        }

        // Incluir deliveryFee si cambió y es delivery
        if (props.order.type === 'delivery' && deliveryFee.value !== props.order.deliveryFee) {
            updateData.deliveryFee = deliveryFee.value
        }

        // Manejar addressId según el tipo
        if (props.order.type === 'delivery' || props.order.type === 'reservation') {
            // Incluir addressId si existe
            if (selectedAddressId.value) {
                updateData.addressId = selectedAddressId.value
            }
        } else {
            // Si es onsite, eliminar addressId
            updateData.addressId = null
        }

        const updatedOrder = await ordersStore.update(props.order.id, updateData)

        showSuccess('Cliente actualizado', 5000)

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
