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

    <BaseDialog v-model="showReservationAssociationsConfirm" title="Modificar reserva" size="sm">
        <p class="text-sm text-gray-600">
            Esta reserva tiene abonos y/o transferencias asociadas. Al confirmar tambiÃ©n se eliminarÃ¡n las
            transferencias y abonos asociados.
        </p>
        <template #footer>
            <BaseButton variant="secondary" :disabled="saving" @click="showReservationAssociationsConfirm = false">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" class="bg-red-600 hover:bg-red-700" :loading="saving"
                @click="confirmSaveDeletingAssociations">
                Confirmar
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderListItem, Order } from '@/types/order'
import type { Customer, CustomerAddress } from '@/types/customer'
import { useOrdersDataStore } from '@/store/ordersData'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'
import { useDeliveryFee } from '@/composables/useDeliveryFee'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CustomerSection from '@/components/customers/CustomerSection.vue'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { toPaymentSnapshot, type OrderPaymentSnapshot } from '@/utils/orderPaymentCoverage'

interface Props {
    open: boolean
    order: OrderListItem
    deleteReservationAssociatedPaymentsConfirmed?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: [order?: Order, paymentSnapshotBefore?: OrderPaymentSnapshot]
}>()

const { success: showSuccess, error: showError } = useToast()
const ordersStore = useOrdersDataStore()
const customersStore = useCustomersStore()
const permissions = useOrderPermissions()

/** Cliente en edición (una sola ficha + direcciones; sin listados masivos). */
const displayCustomer = ref<Customer | null>(null)

// Estado
const saving = ref(false)
const showReservationAssociationsConfirm = ref(false)
const selectedCustomerId = ref<number | null>(props.order.customerId)
const selectedAddressId = ref<number | null>(props.order.addressId)
const selectedGuestName = ref<string | null>(props.order.guestName || props.order.customerName || null)
const { deliveryFee, autoCompleteFromAddress, markAsManuallyEdited, isSuggestedValue } = useDeliveryFee(
    props.order.deliveryFee == null ? 0 : Number(props.order.deliveryFee)
)
const showCustomerDetail = ref(false)
const selectedCustomer = computed(() => {
    if (!selectedCustomerId.value) return null
    if (displayCustomer.value?.id !== selectedCustomerId.value) return null
    return displayCustomer.value
})

const selectedAddress = computed(() => {
    if (!selectedAddressId.value || !selectedCustomer.value) return null
    return selectedCustomer.value.addresses?.find(a => a.id === selectedAddressId.value) || null
})

const canEdit = computed(() => permissions.canEditOrder(props.order))

const canSave = computed(() => {
    // Si no se puede editar, no se puede guardar
    if (!canEdit.value) return false

    // Si es delivery, tarifa debe ser un número >= 0
    if (props.order.type === 'delivery' && (deliveryFee.value == null || Number.isNaN(Number(deliveryFee.value)) || deliveryFee.value < 0)) {
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
    const prevFee = props.order.deliveryFee == null ? 0 : Math.round(Number(props.order.deliveryFee))
    const hasDeliveryFeeChange =
        props.order.type === 'delivery' && Math.round(Number(deliveryFee.value)) !== prevFee

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
    if (props.order.type === 'delivery' && (deliveryFee.value == null || Number.isNaN(Number(deliveryFee.value)) || deliveryFee.value < 0)) {
        return 'Indica una tarifa de domicilio válida (0 o más)'
    }
    return ''
})

const hasReservationAssociatedPayments = computed(() =>
    props.order.type === 'reservation' &&
    !props.deleteReservationAssociatedPaymentsConfirmed &&
    ((props.order.reservationDeposits?.length ?? 0) > 0 || (props.order.bankPayments?.length ?? 0) > 0)
)

async function hydrateCustomerWithAddresses(customer: Customer): Promise<void> {
    try {
        await customersStore.fetchAddresses(customer.id)
        displayCustomer.value = {
            ...customer,
            addresses: [...customersStore.addresses],
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        showError('Direcciones', msg || 'No se pudieron cargar las direcciones')
        displayCustomer.value = { ...customer, addresses: customer.addresses ?? [] }
    }
}

async function loadCustomerProfileForModal() {
    selectedCustomerId.value = props.order.customerId ?? null
    selectedAddressId.value = props.order.addressId ?? null
    selectedGuestName.value = props.order.guestName || props.order.customerName || null

    if (!props.order.customerId) {
        displayCustomer.value = null
        return
    }
    try {
        await customersStore.fetchById(props.order.customerId)
        const c = customersStore.current
        if (!c) {
            displayCustomer.value = null
            return
        }
        await hydrateCustomerWithAddresses(c)
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        showError('Cliente', msg || 'No se pudo cargar el cliente')
        displayCustomer.value = null
    }
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            void loadCustomerProfileForModal()
        }
    },
    { immediate: true }
)

// Métodos
const handleCustomerSelected = async (customer: Customer | null) => {
    selectedCustomerId.value = customer?.id ?? null

    if (customer && customer.name && !selectedGuestName.value?.trim()) {
        selectedGuestName.value = customer.name
    } else if (!customer) {
        selectedGuestName.value = null
    }

    if (!customer) {
        displayCustomer.value = null
        selectedAddressId.value = null
        return
    }

    await hydrateCustomerWithAddresses(customer)
}

const handleAddressSelected = (address: CustomerAddress | null | undefined) => {
    selectedAddressId.value = address?.id ?? null

    if (address && displayCustomer.value && !displayCustomer.value.addresses?.some((a) => a.id === address.id)) {
        const prev = displayCustomer.value.addresses ?? []
        displayCustomer.value = {
            ...displayCustomer.value,
            addresses: [...prev, address],
        }
    }

    autoCompleteFromAddress(address ?? null)
}

const handleViewCustomerDetail = () => {
    showCustomerDetail.value = true
}

const handleCloseCustomerDetail = () => {
    showCustomerDetail.value = false
}

const handleSave = async () => {
    if (hasReservationAssociatedPayments.value) {
        showReservationAssociationsConfirm.value = true
        return
    }

    await saveOrderChanges(false)
}

const confirmSaveDeletingAssociations = async () => {
    showReservationAssociationsConfirm.value = false
    await saveOrderChanges(true)
}

const saveOrderChanges = async (deleteReservationAssociatedPayments: boolean) => {
    saving.value = true
    try {
        const updateData: Record<string, unknown> = {}

        if (selectedCustomerId.value !== props.order.customerId) {
            updateData.customerId = selectedCustomerId.value
        }

        // Incluir guestName si cambió
        if (selectedGuestName.value !== props.order.guestName) {
            updateData.guestName = selectedGuestName.value || undefined
        }

        // Incluir deliveryFee si cambió y es delivery (0 es válido)
        const prevFee = props.order.deliveryFee == null ? 0 : Math.round(Number(props.order.deliveryFee))
        const nextFee = Math.round(Number(deliveryFee.value))
        if (props.order.type === 'delivery' && nextFee !== prevFee) {
            updateData.deliveryFee = nextFee
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

        if (deleteReservationAssociatedPayments || props.deleteReservationAssociatedPaymentsConfirmed) {
            updateData.deleteReservationAssociatedPayments = true
        }

        const paymentSnapshotBefore = toPaymentSnapshot(props.order)
        const updatedOrder = await ordersStore.update(props.order.id, updateData)

        showSuccess('Cliente actualizado', 5000)

        // ✅ Emitir el pedido actualizado para actualización optimista
        emit('updated', updatedOrder, paymentSnapshotBefore)
        emit('close')
    } catch (error: any) {
        showError('Error al actualizar pedido', error.message)
    } finally {
        saving.value = false
    }
}
</script>
