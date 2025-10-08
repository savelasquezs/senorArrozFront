<template>
    <div class="order-sidebar bg-white border-l border-gray-200 h-full flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200">
            <OrderHeader :order-type="activeOrder?.type || 'delivery'" :order-number="activeOrder?.id?.slice(-4)"
                :customer-name="getCustomerName(activeOrder?.customerId)"
                :selected-customer="getCustomer(activeOrder?.customerId)"
                :selected-address="getAddress(activeOrder?.addressId)"
                :total-items="activeOrder?.orderDetails?.length || 0" :total-amount="activeOrder?.total || 0"
                :loading="false" @type-change="handleOrderTypeChange" @clear="clearActiveOrder"
                @customer-selected="handleCustomerSelect" @address-selected="handleAddressSelect" />

            <!-- Create New Order Button -->
            <div class="mt-4 flex justify-center">
                <BaseButton @click="() => createNewOrder()" variant="primary" size="sm" class="w-full">
                    <PlusIcon class="w-4 h-4 mr-1" />
                    Nuevo Pedido
                </BaseButton>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="activeOrders.length === 0" class="text-center py-8 px-4">
                <ShoppingBagIcon class="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
                <p class="text-gray-500 mb-4">Crea tu primer pedido para comenzar</p>
                <BaseButton @click="() => createNewOrder()" variant="primary">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Crear Pedido
                </BaseButton>
            </div>

            <!-- Order Tabs -->
            <div v-else class="space-y-1 p-2">
                <div v-for="order in activeOrders" :key="order.id" @click="setActiveOrder(order.id)" :class="[
                    'order-tab p-3 rounded-lg border cursor-pointer transition-all',
                    activeOrderId === order.id
                        ? 'border-indalo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                ]">
                    <!-- Tab Header -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center">
                            <!-- Order Type Icon -->
                            <div :class="[
                                'w-6 h-6 rounded-full flex items-center justify-center mr-2',
                                getOrderTypeConfig(order.type).bgClass,
                                getOrderTypeConfig(order.type).iconClass
                            ]">
                                <component :is="getOrderTypeConfig(order.type).icon" class="w-3 h-3" />
                            </div>

                            <div>
                                <div class="text-sm font-medium text-gray-900">
                                    Pedido {{ order.id.slice(-4) }}
                                </div>
                                <div class="text-xs text-gray-500">
                                    {{ getOrderTypeConfig(order.type).label }}
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center space-x-1">
                            <!-- Dirty indicator -->
                            <div v-if="order.isDirty" class="w-2 h-2 bg-yellow-400 rounded-full"
                                title="Cambios no guardados" />

                            <!-- Close button -->
                            <BaseButton @click.stop="closeOrder(order.id)" variant="outline" size="sm">
                                <XMarkIcon class="w-3 h-3" />
                            </BaseButton>
                        </div>
                    </div>

                    <!-- Order Info -->
                    <div class="text-xs text-gray-600 space-y-1">


                        <div v-if="order.type === 'reservation' && order.reservedFor" class="flex items-center">
                            <ClockIcon class="w-3 h-3 mr-1" />
                            {{ formatReservationDate(order.reservedFor) }}
                        </div>
                    </div>

                    <!-- Order Summary -->
                    <div class="mt-2 pt-2 border-t border-gray-200">
                        <div class="flex justify-between text-xs">
                            <span>{{ order.orderDetails.length }} productos</span>
                            <span class="font-medium">{{ formatCurrency(order.total) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Selected Order Content -->
            <div v-if="activeOrder" class="border-t border-gray-200 mt-4">
                <div class="overflow-y-auto max-h-96">
                    <OrderTab :order="activeOrder" />
                </div>
            </div>
        </div>

        <!-- Confirmation Dialog -->
        <BaseDialog v-model="showCloseConfirm" title="Confirmar Cierre" size="md">
            <div class="text-center">
                <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-yellow-400 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">¿Qué deseas hacer?</h3>
                <p class="text-gray-500 mb-6">
                    El pedido "{{ orderToClose?.id?.slice(-4) }}" tiene cambios pendientes.
                </p>

                <div class="flex space-x-3 justify-center">
                    <BaseButton @click="saveAndClose" variant="primary" size="sm">
                        Guardar y Cerrar
                    </BaseButton>
                    <BaseButton @click="discardAndClose" variant="danger" size="sm">
                        Descartar Cambios
                    </BaseButton>
                    <BaseButton @click="cancelClose" variant="outline" size="sm">
                        Cancelar
                    </BaseButton>
                </div>
            </div>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useToast } from '@/composables/useToast'
import type { ActiveOrder, OrderType } from '@/types/order'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import OrderTab from '@/components/OrderTab.vue'
import OrderHeader from '@/components/orders/OrderHeader.vue'

// Icons
import {
    PlusIcon,
    XMarkIcon,
    ShoppingBagIcon,
    UserIcon,
    HomeIcon,
    ClockIcon,
    ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

// Composables
const ordersStore = useOrdersStore()
const { success, error: showError } = useToast()

// State
const showCloseConfirm = ref(false)
const orderToClose = ref<ActiveOrder | null>(null)

// Computed
const activeOrders = computed(() => ordersStore.activeOrdersList)
const activeOrderId = computed(() => ordersStore.activeOrderId)
const activeOrder = computed(() => ordersStore.activeOrder)

// Methods
const createNewOrder = (type: OrderType = 'delivery') => {
    try {
        ordersStore.createActiveOrder(type)
        success('Pedido creado', 2000, `Nuevo pedido ${type} creado`)
    } catch (error) {
        showError('Error', 'No se pudo crear el pedido')
    }
}

const setActiveOrder = (orderId: string) => {
    ordersStore.setActiveOrder(orderId)
}

const closeOrder = (orderId: string) => {
    const order = ordersStore.activeOrders.get(orderId)
    if (!order) return

    if (order.isDirty) {
        orderToClose.value = order
        showCloseConfirm.value = true
    } else {
        confirmClose(orderId)
    }
}

const confirmClose = (orderId: string) => {
    const order = ordersStore.activeOrders.get(orderId)
    if (order) {
        ordersStore.activeOrders.delete(orderId)
        if (ordersStore.activeOrderId === orderId) {
            ordersStore.activeOrderId = null
        }
    }
}

const saveAndClose = async () => {
    if (!orderToClose.value) return

    try {
        // Here you would typically save the order or prompt for save action
        confirmClose(orderToClose.value.id)
        success('Pedido guardado', 2000, 'El pedido se ha guardado correctamente')
    } catch (error) {
        showError('Error', 'No se pudo guardar el pedido')
    }

    showCloseConfirm.value = false
    orderToClose.value = null
}

const discardAndClose = () => {
    if (!orderToClose.value) return

    confirmClose(orderToClose.value.id)
    showCloseConfirm.value = false
    orderToClose.value = null
}

const cancelClose = () => {
    showCloseConfirm.value = false
    orderToClose.value = null
}

const getOrderTypeConfig = (type: OrderType) => {
    const configs = {
        onsite: {
            label: 'En Local',
            bgClass: 'bg-green-100',
            iconClass: 'text-green-600',
            icon: 'BuildingStorefrontIcon'
        },
        delivery: {
            label: 'Domicilio',
            bgClass: 'bg-blue-100',
            iconClass: 'text-blue-600',
            icon: 'TruckIcon'
        },
        reservation: {
            label: 'Reserva',
            bgClass: 'bg-purple-100',
            iconClass: 'text-purple-600',
            icon: 'CalendarIcon'
        }
    }
    return configs[type]
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

const formatReservationDate = (date: string): string => {
    return new Date(date).toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Helper methods for OrderHeader
const getCustomerName = (customerId?: number): string => {
    if (!customerId) return ''
    const customer = ordersStore.customers.find(c => c.id === customerId)
    return customer?.name || ''
}

const getCustomer = (customerId?: number) => {
    if (!customerId) return undefined
    return ordersStore.customers.find(c => c.id === customerId)
}

const getAddress = (addressId?: number) => {
    if (!addressId) return undefined
    // This would need to be implemented in the store to fetch addresses
    // For now, returning undefined
    return undefined
}

// OrderHeader event handlers
const handleOrderTypeChange = (newType: OrderType) => {
    if (activeOrder.value) {
        activeOrder.value.type = newType
        activeOrder.value.isDirty = true
    }
}

const clearActiveOrder = () => {
    if (activeOrderId.value) {
        closeOrder(activeOrderId.value)
    }
}

const handleCustomerSelect = (customer: any) => {
    if (activeOrder.value) {
        activeOrder.value.customerId = customer?.id || null
        activeOrder.value.isDirty = true
    }
}

const handleAddressSelect = (address: any) => {
    if (activeOrder.value) {
        activeOrder.value.addressId = address?.id || null
        activeOrder.value.isDirty = true
    }
}
</script>

<style scoped>
.order-sidebar {
    width: 400px;
    min-width: 400px;
}

.order-tab {
    min-height: 120px;
}
</style>
