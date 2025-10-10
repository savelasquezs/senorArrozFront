<template>
    <div class="order-sidebar bg-white border-l border-gray-200 h-full flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Pedidos Activos</h2>

            <!-- Order Tabs -->
            <OrderTabs />
        </div>

        <!-- Order Content -->
        <div class="flex-1 overflow-y-auto">
            <!-- No Order State -->
            <div v-if="!currentOrder" class="flex items-center justify-center h-full p-6">
                <div class="text-center">
                    <ShoppingCartIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No hay pedidos activos</h3>
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
            <div v-else class="flex flex-col h-full">
                <!-- Order Header -->
                <div class="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
                    <div class="flex items-center justify-between mb-3">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">{{ currentOrder.tabName }}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <BaseBadge :type="getOrderTypeConfig(currentOrder.type).variant" size="sm">
                                    {{ getOrderTypeConfig(currentOrder.type).label }}
                                </BaseBadge>
                                <span class="text-sm text-gray-500">
                                    {{ currentOrder.orderItems.length }} items
                                </span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-lg font-bold text-green-600">
                                {{ formatCurrency(currentOrder.total) }}
                            </div>
                            <div class="text-xs text-gray-500">Total</div>
                        </div>
                    </div>
                </div>

                <!-- Scrollable Content -->
                <div class="flex-1 overflow-y-auto">
                    <!-- Order Items -->
                    <div class="p-4">
                        <OrderItemList :tab-id="currentTabId || ''" @add-products="handleAddProducts"
                            @edit-item="handleEditItem" />
                    </div>

                    <!-- Order Actions -->
                    <div class="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
                        <!-- Customer Section -->
                        <CustomerSection :selected-customer="getCustomer(currentOrder.customerId)"
                            :selected-address="getAddress(currentOrder.addressId)" :order-type="currentOrder.type"
                            @customer-selected="handleCustomerSelect" @address-selected="handleAddressSelect"
                            @view-customer-detail="handleViewCustomerDetail"
                            @order-type-changed="handleOrderTypeChanged" />

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
        </div>

        <!-- Customer Detail Modal -->
        <CustomerDetailModal v-if="showCustomerDetail && selectedCustomer" :show="showCustomerDetail"
            :customer="selectedCustomer" @close="closeCustomerDetail" @customer-updated="handleCustomerUpdated" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useOrderPersistence } from '@/composables/useOrderPersistence'
import { useOrderValidation } from '@/composables/useOrderValidation'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import type { Customer, CustomerAddress } from '@/types/customer'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
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
const { formatCurrency } = useFormatting()
const { success, error: showError } = useToast()
const customersStore = useCustomersStore()

// State
const showCustomerDetail = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const selectedAddress = ref<CustomerAddress | null>(null)

// Computed
const currentOrder = computed(() => ordersStore.currentOrder)
const currentTabId = computed(() => ordersStore.currentTabId)
const { canSubmitOrder } = useOrderValidation(currentOrder.value || undefined)

const canSaveOrder = computed(() => {
    return currentOrder.value && currentOrder.value.orderItems.length > 0
})

// Order type configurations
const getOrderTypeConfig = (type: string) => {
    const configs = {
        onsite: { label: 'En el Local', variant: 'info' },
        delivery: { label: 'Domicilio', variant: 'warning' },
        reservation: { label: 'Reserva', variant: 'success' }
    }
    return configs[type as keyof typeof configs] || configs.onsite
}

// Methods
const createNewOrder = () => {
    ordersStore.createNewTab()
}

const getCustomer = (customerId: number | null) => {
    if (!customerId) return null
    return customersStore.list?.items.find((c: any) => c.id === customerId) || null
}

const getAddress = (addressId: number | null) => {
    if (!addressId || !selectedCustomer.value) return null
    return selectedCustomer.value.addresses?.find((a: CustomerAddress) => a.id === addressId) || null
}

const handleCustomerSelect = (customer: Customer | null) => {
    selectedCustomer.value = customer
    if (customer && customer.addresses && customer.addresses.length > 0) {
        const primaryAddress = customer.addresses.find((a: CustomerAddress) => a.isPrimary) || customer.addresses[0]
        selectedAddress.value = primaryAddress
        ordersStore.updateCustomer(customer)
        ordersStore.updateAddress(primaryAddress)
    } else {
        selectedAddress.value = null
        ordersStore.updateCustomer(customer)
        ordersStore.updateAddress(null)
    }
}

const handleOrderTypeChanged = (type: 'onsite' | 'delivery' | 'reservation') => {
    ordersStore.updateOrderType(type)
}

const handleAddressSelect = (address: any) => {
    if (!currentTabId.value) return
    ordersStore.updateAddress(address)
}

const handleViewCustomerDetail = (customer: any) => {
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

const handleEditItem = (itemTempId: string) => {
    // This would open an edit modal for the item
    console.log('Edit item:', itemTempId)
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
watch(currentOrder, (newOrder) => {
    if (newOrder) {
        // Update selected customer when switching tabs
        const customer = getCustomer(newOrder.customerId)
        selectedCustomer.value = customer

        // Update selected address when switching tabs
        if (customer) {
            const address = getAddress(newOrder.addressId)
            selectedAddress.value = address
        } else {
            selectedAddress.value = null
        }
    }
}, { immediate: true })
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
