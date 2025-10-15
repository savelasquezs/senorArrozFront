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
                        :order-type="currentOrder.type" @customer-selected="handleCustomerSelect"
                        @address-selected="handleAddressSelect" @view-customer-detail="handleViewCustomerDetail"
                        @order-type-changed="handleOrderTypeChanged" />
                    <OrderItemList :tab-id="currentTabId || ''" @add-products="handleAddProducts" />
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
                        <BaseButton @click="handleSaveOrder" variant="outline" size="sm" class="flex-1"
                            :disabled="!canSaveOrder">
                            <span class="flex items-center justify-center">
                                <DocumentIcon class="w-4 h-4 mr-2" />
                                Guardar
                            </span>
                        </BaseButton>
                        <BaseButton @click="handleSubmitOrder" variant="primary" size="sm" class="flex-1"
                            :disabled="!canSubmitOrder">
                            <span class="flex items-center justify-center">
                                <PaperAirplaneIcon class="w-4 h-4 mr-2" />
                                Enviar
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

import { useToast } from '@/composables/useToast'
import type { Customer, CustomerAddress } from '@/types/customer'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'

import BaseInput from '@/components/ui/BaseInput.vue'
import OrderTabs from '@/components/orders/OrderTabs.vue'
import OrderItemList from '@/components/orders/OrderItemList.vue'
import CustomerSection from '@/components/orders/CustomerSection.vue'
import CustomerDetailModal from '@/components/orders/CustomerDetailModal.vue'

// Icons
import {
    ShoppingCartIcon,
    PlusIcon,
    DocumentIcon,
    PaperAirplaneIcon
} from '@heroicons/vue/24/outline'

// Composables
const { ordersStore } = useOrderPersistence()
const { success, error: showError } = useToast()

// State
const showCustomerDetail = ref(false)
const selectedCustomer = ref<Customer | null>(null)

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const currentTabId = computed(() => ordersStore.currentTabId)
const { canSubmitOrder } = useOrderValidation(currentOrder.value || undefined)

const canSaveOrder = computed(() => {
    return currentOrder.value && currentOrder.value.orderItems.length > 0
})



// Methods
const createNewOrder = () => {
    ordersStore.createNewTab()
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

const handleCustomerSelect = (customer: Customer | null) => {

    // Solo actualizar el store, no mantener ref local
    ordersStore.updateCustomer(customer)
    // Auto-selección ya la maneja CustomerSection, aquí solo recibimos el evento
}

const handleOrderTypeChanged = (type: 'onsite' | 'delivery' | 'reservation') => {
    ordersStore.updateOrderType(type)
}

const handleAddressSelect = (address: CustomerAddress | null) => {
    ordersStore.updateAddress(address)
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

const handleAddProducts = () => {
    // This would focus on the product grid or open a product selector
    console.log('Add products from grid')
}

const handleSaveOrder = () => {
    if (!canSaveOrder.value) return

    try {
        // Save order logic would go here
        success('Pedido guardado', 2000, 'El pedido se ha guardado correctamente')
    } catch (error: any) {
        showError('Error al guardar pedido', error.message || 'No se pudo guardar el pedido')
    }
}

const handleSubmitOrder = () => {
    if (!canSubmitOrder.value) return

    try {
        // Submit order logic would go here
        success('Pedido enviado', 2000, 'El pedido se ha enviado correctamente')
    } catch (error: any) {
        showError('Error al enviar pedido', error.message || 'No se pudo enviar el pedido')
    }
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
