<template>
    <div class="order-sidebar bg-white border-l border-gray-200 h-full flex flex-col min-h-0">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 flex-shrink-0">
            <!-- Order Tabs -->
            <OrderTabs />
        </div>

        <!-- Order Content -->
        <div class="flex-1 overflow-y-auto min-h-0">
            <!-- No Order State -->
            <div v-if="!currentOrder" class="flex items-center justify-center h-full p-6">
                <div class="text-center">
                    <ShoppingCartIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p class="text-gray-500 mb-4">Crea un nuevo pedido para comenzar</p>
                    <BaseButton @click="createNewOrder" variant="primary">
                        <span class="flex items-center">
                            <PlusIcon class="w-4 h-4 mr-2" />
                            Crear Nuevo Pedido
                        </span>
                    </BaseButton>
                </div>
            </div>

            <!-- Order Content -->
            <div v-else class="space-y-4 pb-4">
                <!-- Order Items -->
                <div class="px-4">
                    <CustomerSection :selected-customer="getCustomer(currentOrder.customerId)"
                        :selected-address="getAddress(currentOrder.addressId, getCustomer(currentOrder.customerId))"
                        :order-type="currentOrder.type" mode="draft" @view-customer-detail="handleViewCustomerDetail" />

                    <!-- Guest Name / Recipient Name -->
                    <div class="py-3 border-b border-gray-200">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Nombre de quien recibe
                            <span v-if="currentOrder.type === 'delivery' || currentOrder.type === 'reservation'"
                                class="text-red-500">*</span>
                        </label>
                        <BaseInput :model-value="currentOrder.guestName || ''"
                            @update:model-value="(value) => updateGuestName(String(value || ''))"
                            placeholder="Ej: Juan Pérez, María López..." :error="guestNameError" />
                        <p class="text-xs text-gray-500 mt-1">
                            Nombre de quien recibirá el pedido (editable)
                        </p>
                    </div>

                    <OrderItemList :tab-id="currentTabId || ''" @add-products="handleAddProducts" />
                    <PaymentSelector :order="currentOrder" @payment-updated="handlePaymentUpdated" />
                </div>

                <!-- Order Actions -->
                <div class="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-3">
                    <!-- Order Notes -->
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700">Notas del Pedido</label>
                        <BaseInput :model-value="currentOrder.notes || ''"
                            @update:model-value="(value) => updateOrderNotes(String(value || ''))"
                            placeholder="Agregar notas especiales..." type="textarea" rows="2" />
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2">
                        <BaseButton @click="handleSubmitOrder" variant="primary" size="sm" class="w-full"
                            :disabled="!canSubmitOrder" :title="submitButtonTooltip">
                            <span class="flex items-center justify-center">
                                <PaperAirplaneIcon class="w-4 h-4 mr-2" />
                                Enviar Pedido
                            </span>
                        </BaseButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- Customer Detail Modal -->
        <CustomerDetailModal v-if="selectedCustomer" :show="showCustomerDetail" :customer="selectedCustomer"
            @close="closeCustomerDetail" @customer-updated="handleCustomerUpdated" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOrderPersistence } from '@/composables/useOrderPersistence'
import { useOrderValidation } from '@/composables/useOrderValidation'
import { useOrderTabs } from '@/composables/useOrderTabs'
import { useOrderSubmission } from '@/composables/useOrderSubmission'

import { useToast } from '@/composables/useToast'
import type { Customer, CustomerAddress } from '@/types/customer'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import OrderTabs from '@/components/orders/OrderTabs.vue'
import OrderItemList from '@/components/orders/OrderItemList.vue'
import CustomerSection from '@/components/customers/CustomerSection.vue'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'
import PaymentSelector from '@/components/payments/PaymentSelector.vue'

// Icons
import {
    ShoppingCartIcon,
    PlusIcon,
    PaperAirplaneIcon
} from '@heroicons/vue/24/outline'

// Composables
const { ordersStore } = useOrderPersistence()
const { createNewTab, closeTab } = useOrderTabs()
const { submitOrder } = useOrderSubmission()
const { success, error: showError } = useToast()

// State
const showCustomerDetail = ref(false)
const selectedCustomer = ref<Customer | null>(null)

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const currentTabId = computed(() => ordersStore.currentTabId)
const { canSubmitOrder, orderErrors } = useOrderValidation(currentOrder.value || undefined)

const guestNameError = computed(() => {
    if (!currentOrder.value) return ''
    // Required for delivery and reservation orders
    const requiresGuestName = currentOrder.value.type === 'delivery' || currentOrder.value.type === 'reservation'
    if (requiresGuestName && !currentOrder.value.guestName?.trim()) {
        return 'El nombre de quien recibe es obligatorio para este tipo de pedido'
    }
    return ''
})

const submitButtonTooltip = computed(() => {
    if (!currentOrder.value) {
        return 'No hay pedido activo'
    }

    if (canSubmitOrder.value) {
        return 'Enviar pedido al sistema'
    }

    // Show what's missing
    const errors = orderErrors.value
    if (errors.length === 0) {
        return 'Completando validaciones...'
    }

    if (errors.length === 1) {
        return `Falta: ${errors[0]}`
    }

    return `Faltan ${errors.length} requisitos (click para ver detalles)`
})

// Methods
const createNewOrder = () => {
    createNewTab()
}

const getCustomer = (customerId: number | null) => {
    if (!customerId) return null
    // Buscar en ordersStore.customers que tiene las direcciones completas
    return ordersStore.customers.find((c: Customer) => c.id === customerId) || null
}

const getAddress = (addressId: number | null, customer: Customer | null) => {
    if (!addressId || !customer) return null
    return customer.addresses?.find((a: CustomerAddress) => a.id === addressId) || null
}

// CustomerSelection y AddressSelection ahora se manejan internamente en CustomerSection (modo 'draft')

const handlePaymentUpdated = () => {
    // Payment updated, totals recalculate automatically
    console.log('Payment updated')
}

const handleViewCustomerDetail = (customer: any) => {
    console.log('handleViewCustomerDetail', customer)
    selectedCustomer.value = customer
    showCustomerDetail.value = true
}

const closeCustomerDetail = () => {
    showCustomerDetail.value = false
    selectedCustomer.value = null
}

const handleCustomerUpdated = (customer: any) => {
    // Customer updated, refresh if needed
    console.log('Customer updated:', customer)
}

const updateOrderNotes = (notes: string) => {
    if (!currentTabId.value) return
    ordersStore.updateOrderNotes(notes)
}

const updateGuestName = (name: string) => {
    if (!currentTabId.value) return
    ordersStore.updateGuestName(name)
}

const handleAddProducts = () => {
    // This would focus on the product grid or open a product selector
    console.log('Add products from grid')
}

const handleSubmitOrder = async () => {
    // Show errors if not valid
    if (!canSubmitOrder.value) {
        if (orderErrors.value.length > 0) {
            showError(
                'No se puede enviar el pedido',
                orderErrors.value.length === 1
                    ? orderErrors.value[0]
                    : `${orderErrors.value.length} requisitos faltantes`
            )

            // Show individual errors if multiple
            if (orderErrors.value.length > 1) {
                orderErrors.value.slice(0, 3).forEach((error, index) => {
                    setTimeout(() => {
                        showError('Requisito', error)
                    }, (index + 1) * 600)
                })
            }
        }
        return
    }

    // If valid, submit
    if (!currentOrder.value) return

    try {
        // Submit the order
        const createdOrder = await submitOrder(currentOrder.value)

        // Close the current tab and clean up
        if (currentTabId.value) {
            closeTab(currentTabId.value)
        }

        // Show success message
        success(
            'Pedido creado exitosamente',
            3000,
            `Pedido #${createdOrder.id} - Total: ${formatCurrency(createdOrder.total)}`
        )

    } catch (error: any) {
        console.error('Error submitting order:', error)
        showError(
            'Error al crear pedido',
            error.message || 'No se pudo crear el pedido. Intenta nuevamente.'
        )
    }
}

// Helper for currency formatting
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount)
}

// Watchers
watch(currentOrder, () => {
    // Ya no necesitamos actualizar refs locales, las props se actualizan automáticamente desde el store
    showCustomerDetail.value = false
}, { immediate: false })
</script>

<style scoped>
.order-sidebar {
    min-width: 400px;
    max-width: 500px;
}

@media (max-width: 1024px) {
    .order-sidebar {
        min-width: 350px;
        max-width: 400px;
    }
}

@media (max-width: 768px) {
    .order-sidebar {
        min-width: 100%;
        max-width: 100%;
    }
}
</style>
