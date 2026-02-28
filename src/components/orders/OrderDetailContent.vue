<template>

    <div class="space-y-4 md:space-y-6" v-if="order">
        <!-- Header con ID y acciones -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
                <div class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">#{{ order.id }}</h1>
                    <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                </div>
                <p class="mt-1 text-xs sm:text-sm text-gray-500">
                    Creado el {{ formatDateTime(order.createdAt) }}
                </p>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <BaseButton v-if="!isDeliveryman" variant="secondary" size="sm" class="w-full sm:w-auto"
                    @click="$router.push({ name: 'OrdersList' })">
                    <ArrowLeftIcon class="w-4 h-4 mr-1" />
                    Volver
                </BaseButton>
                <BaseButton v-if="permissions.canCancel(order)" variant="danger" size="sm" class="w-full sm:w-auto"
                    @click="showCancelModal = true">
                    <XCircleIcon class="w-4 h-4 mr-1" />
                    Cancelar Pedido
                </BaseButton>
            </div>
        </div>

        <!-- Barra de progreso -->
        <div v-if="!isDeliveryman" class="bg-white rounded-lg shadow p-4 md:p-6">
            <OrderProgressBar :current-status="order.status" :status-times="order.statusTimes" :order-type="order.type"
                :clickable="true" @status-click="handleStatusChange" />
        </div>

        <!-- Tabs de contenido -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <!-- Tab headers -->
            <div class="border-b border-gray-200 overflow-x-auto">
                <nav class="-mb-px flex space-x-4 sm:space-x-8 px-3 sm:px-6 flex-nowrap" aria-label="Tabs">
                    <button v-for="tab in visibleTabs" :key="tab.id" :class="[
                        'whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2',
                        activeTab === tab.id
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    ]" @click="activeTab = tab.id">
                        <component :is="tab.icon" class="w-4 h-4 sm:w-5 sm:h-5 inline-block" />
                        <span class="hidden sm:inline">{{ tab.name }}</span>
                    </button>
                </nav>
            </div>

            <!-- Tab content -->
            <div class="p-4 sm:p-6">
                <!-- Tab: Información General -->
                <div v-if="activeTab === 'info'" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <!-- Cliente -->
                        <div class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Cliente</label>
                            <div class="flex flex-col gap-2 bg-gray-50 rounded-lg p-2 sm:p-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <p class="text-xs sm:text-sm font-medium text-gray-900">
                                            {{ order.customerName || order.guestName || 'Sin cliente' }}
                                        </p>
                                    </div>
                                    <BaseButton v-if="permissions.canEditOrder(order)" size="sm" variant="ghost"
                                        @click="showEditCustomerModal = true">
                                        <PencilIcon class="w-4 h-4" />
                                    </BaseButton>
                                </div>

                                <!-- Teléfonos del cliente -->
                                <div v-if="order.customerId && customer" class="space-y-1 mt-2">
                                    <PhoneNumberItem :phone-number="customer.phone1" />
                                    <PhoneNumberItem v-if="customer.phone2" :phone-number="customer.phone2" />
                                </div>
                                <!-- Fallback: mostrar customerPhone si no hay cliente cargado -->
                                <div v-else-if="order.customerPhone" class="mt-2">
                                    <PhoneNumberItem :phone-number="order.customerPhone" />
                                </div>
                                <!-- Loading state -->
                                <div v-if="order.customerId && customerLoading"
                                    class="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                    <BaseLoading size="sm" />
                                    <span>Cargando teléfonos...</span>
                                </div>
                                <!-- Error state -->
                                <div v-if="order.customerId && customerError" class="mt-2 text-xs text-red-500">
                                    {{ customerError }}
                                </div>
                            </div>
                        </div>


                        <!-- Guest Name -->
                        <div class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Nombre del invitado</label>
                            <BaseInput v-model="editableGuestName" placeholder="Nombre de quien recibe"
                                :disabled="!permissions.canEditOrder(order)" @blur="updateGuestName" />
                        </div>

                        <!-- Tipo de pedido - CLICKEABLE -->
                        <div class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Tipo de pedido</label>
                            <button v-if="permissions.canEditOrder(order)" @click="showEditOrderTypeModal = true"
                                class="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors cursor-pointer">
                                <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                                <PencilIcon class="w-4 h-4 text-gray-400" />
                            </button>
                            <div v-else class="bg-gray-50 rounded-lg p-3">
                                <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                            </div>
                        </div>

                        <!-- Dirección - SOLO SI DELIVERY O RESERVATION -->
                        <div v-if="order.type === 'delivery' || order.type === 'reservation'" class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Dirección de entrega</label>
                            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-2 sm:p-3">
                                <p class="text-xs sm:text-sm text-gray-900">
                                    {{ order.addressDescription || 'Sin dirección' }}
                                </p>
                                <BaseButton v-if="permissions.canEditOrder(order)" size="sm" variant="ghost"
                                    @click="showSelectAddressModal = true">
                                    <PencilIcon class="w-4 h-4" />
                                </BaseButton>
                            </div>
                        </div>

                        <!-- Domiciliario - SOLO SI DELIVERY -->
                        <div v-if="order.type === 'delivery'" class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Domiciliario</label>
                            <div class="flex items-center justify-between bg-gray-50 rounded-lg p-2 sm:p-3">
                                <p class="text-xs sm:text-sm text-gray-900">
                                    {{ order.deliveryManName || 'Sin asignar' }}
                                </p>
                                <BaseButton v-if="!isDeliveryman" size="sm" variant="ghost"
                                    @click="showAssignDeliveryModal = true">
                                    <PencilIcon class="w-4 h-4" />
                                </BaseButton>
                            </div>
                        </div>

                        <!-- Delivery Fee - SOLO SI DELIVERY -->
                        <div v-if="order.type === 'delivery'" class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Tarifa de domicilio</label>
                            <div class="bg-gray-50 rounded-lg p-2 sm:p-3">
                                <p class="text-xs sm:text-sm text-gray-900">{{ formatCurrency(order?.deliveryFee || 0)
                                }}</p>
                            </div>
                        </div>

                        <!-- Fecha de reserva - SOLO SI RESERVATION -->
                        <div v-if="order.type === 'reservation' && order.reservedFor" class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Tener listo a esta hora</label>
                            <div class="bg-gray-50 rounded-lg p-2 sm:p-3">
                                <p class="text-xs sm:text-sm text-gray-900">{{ formatDateTime(order.reservedFor) }}</p>
                            </div>
                        </div>

                        <!-- Tomado por -->
                        <div class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Tomado por</label>
                            <div class="bg-gray-50 rounded-lg p-2 sm:p-3">
                                <p class="text-xs sm:text-sm text-gray-900">{{ order.takenByName }}</p>
                            </div>
                        </div>

                        <!-- Sucursal -->
                        <div class="space-y-2">
                            <label class="text-xs sm:text-sm font-medium text-gray-700">Sucursal</label>
                            <div class="bg-gray-50 rounded-lg p-2 sm:p-3">
                                <p class="text-xs sm:text-sm text-gray-900">{{ order.branchName }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Notas -->
                    <div class="space-y-2">
                        <label class="text-xs sm:text-sm font-medium text-gray-700">Notas del pedido</label>
                        <textarea v-model="editableNotes" rows="3"
                            class="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm sm:text-base"
                            placeholder="Agregar notas..." :disabled="!permissions.canEditOrder(order)"
                            @blur="updateNotes" />
                    </div>
                </div>

                <!-- Tab: Productos -->
                <div v-if="activeTab === 'products'">
                    <OrderDetailProductsList v-if="order" :products="order?.orderDetails"
                        :delivery-fee="order?.deliveryFee || 0" :can-edit="permissions.canEditProducts(order)"
                        @save="handleProductsUpdate" />
                </div>

                <!-- Tab: Pagos -->
                <div v-if="activeTab === 'payments'">
                    <div class="mb-6">
                        <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Gestión de Pagos</h3>
                        <p class="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                            <span v-if="isDeliveryman">Visualiza los pagos del pedido para saber cuánto debes
                                cobrar.</span>
                            <span v-else>Administra los pagos del pedido. Los pagos bancarios pueden ser verificados y
                                los pagos por app pueden ser liquidados.</span>
                        </p>
                        <PersistedPaymentSelector v-if="order" :order="order" :bank-options="bankOptions"
                            :app-options="appOptions" @updated="handlePaymentUpdated" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Sección de entrega para domiciliarios -->
        <div v-if="isDeliveryman && order && order.status === 'on_the_way'"
            class="sticky bottom-0 bg-white border-t-2 border-emerald-500 shadow-lg p-4 md:p-6 mt-4 md:mt-6 z-10">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <!-- Valor a cobrar -->
                <div class="flex-1 text-center sm:text-left w-full sm:w-auto">
                    <p class="text-xs sm:text-sm text-gray-600 mb-1">Valor a cobrar</p>
                    <p class="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">
                        {{ formatCurrency(cashAmount) }}
                    </p>
                </div>

                <!-- Botón entregar -->
                <BaseButton variant="success" size="lg"
                    class="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold"
                    @click="handleDeliverOrder">
                    <CheckCircleIcon class="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    Entregar Pedido
                </BaseButton>
            </div>
        </div>
    </div>

    <!-- Modales -->
    <EditCustomerModal v-if="showEditCustomerModal && order" :open="showEditCustomerModal" :order="order"
        @close="handleCustomerModalClose" @updated="handleCustomerUpdated" />

    <SelectAddressModal v-if="showSelectAddressModal && order" :open="showSelectAddressModal" :order="order"
        @close="showSelectAddressModal = false" @updated="handleAddressUpdated" />

    <AssignDeliveryModal v-if="showAssignDeliveryModal && order" :open="showAssignDeliveryModal" :order="order"
        :pending-status-change="pendingStatusChange || undefined" @close="handleAssignDeliveryModalClose"
        @updated="handleDeliverymanUpdated" @status-changed="handleStatusChanged" />

    <CancelOrderModal v-if="showCancelModal && order" :open="showCancelModal" :order="order"
        @close="showCancelModal = false" @cancelled="handleOrderCancelled" />

    <!-- Modal de cambio de tipo -->
    <EditOrderTypeModal v-if="showEditOrderTypeModal && order" :open="showEditOrderTypeModal" :order="order"
        @close="showEditOrderTypeModal = false" @updated="handleOrderTypeUpdated"
        @type-changed-pending="handleTypePendingChange" @open-customer-modal="handleOpenCustomerModalFromType" />
</template>

<script setup lang="ts">
import OrderTypeBadge from '@/components/orders/OrderTypeBadge.vue'
import OrderProgressBar from '@/components/orders/OrderProgressBar.vue'
import OrderDetailProductsList from '@/components/orders/OrderDetailProductsList.vue'
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue'
import SelectAddressModal from '@/components/orders/SelectAddressModal.vue'
import AssignDeliveryModal from '@/components/orders/AssignDeliveryModal.vue'
import CancelOrderModal from '@/components/orders/CancelOrderModal.vue'
import EditOrderTypeModal from '@/components/orders/EditOrderTypeModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import PersistedPaymentSelector from '@/components/payments/PersistedPaymentSelector.vue'
import PhoneNumberItem from '@/components/customers/PhoneNumberItem.vue'
import { useFormatting } from '@/composables/useFormatting'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { useToast } from '@/composables/useToast'
import { getOrderTypeDisplayName } from '@/composables/useFormatting'
import { useOrderStatusChange } from '@/composables/useOrderStatusChange'
import { useRouter } from 'vue-router'
import type { OrderDetailView, OrderStatus, UpdateOrderDetailDto } from '@/types/order'
import type { Customer } from '@/types/customer'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrdersDataStore } from '@/store/ordersData'
import { useAuthStore } from '@/store/auth'
import { customerApi } from '@/services/MainAPI/customerApi'

import type { OrderListItem } from '@/types/order'


import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

import {
    ArrowLeftIcon,
    XCircleIcon,
    PencilIcon,
    InformationCircleIcon,
    ShoppingBagIcon,
    CreditCardIcon,
    CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { ref, computed, watch } from 'vue'
const permissions = useOrderPermissions()
const authStore = useAuthStore()
const isDeliveryman = computed(() => authStore.userRole === 'Deliveryman')
const pendingOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(null)
const originalOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(null)
// Estado local (solo lo que no está en el store)
const editableGuestName = ref('')
const editableNotes = ref('')
const customer = ref<Customer | null>(null)
const customerLoading = ref(false)
const customerError = ref<string | null>(null)

const props = defineProps<{
    flatOrder: OrderListItem
}>()

const emit = defineEmits<{
    (e: 'delivered', orderId: number): void
}>()
const order = ref<OrderDetailView | null>(null)



const { formatDateTime, formatCurrency } = useFormatting()
const activeTab = ref('info')
const router = useRouter()

const { success, error } = useToast()

// Modales
const showEditCustomerModal = ref(false)

const { pendingStatusChange, showAssignDeliveryModal, handleStatusChange: handleStatusChangeComposable, executeStatusChange, clearPendingStatusChange } = useOrderStatusChange()

const ordersStore = useOrdersDraftsStore()

// Store
const ordersDataStore = useOrdersDataStore()

// Opciones para selectores de pagos
const bankOptions = computed(() => {
    return ordersStore.banks
        .filter(bank => bank.active)
        .map(bank => ({ value: bank.id, label: bank.name }))
})

const appOptions = computed(() => {
    return ordersStore.apps
        .filter(app => app.active)
        .map(app => ({ value: app.id, label: app.name }))
})

const showSelectAddressModal = ref(false)
const showCancelModal = ref(false)
const showEditOrderTypeModal = ref(false)


// Tabs
const tabs = [
    { id: 'info', name: 'Información General', icon: InformationCircleIcon },
    { id: 'products', name: 'Productos', icon: ShoppingBagIcon },
    { id: 'payments', name: 'Pagos', icon: CreditCardIcon },
]

// Filtrar tabs para domiciliarios (los domiciliarios pueden ver pagos pero no editarlos)
const visibleTabs = computed(() => {
    // Todos los tabs están disponibles para todos los usuarios
    // Los permisos de edición se manejan dentro de cada componente
    return tabs
})
const loadCustomer = async (customerId: number) => {
    if (!customerId) return

    customerLoading.value = true
    customerError.value = null

    try {
        const response = await customerApi.getCustomerById(customerId)
        customer.value = response.data
    } catch (err: any) {
        console.error('Error loading customer:', err)
        customerError.value = 'No se pudieron cargar los teléfonos'
        customer.value = null
    } finally {
        customerLoading.value = false
    }
}

// Computed para calcular efectivo a cobrar
const cashAmount = computed(() => {
    if (!order.value) return 0
    const totalPayments = (order.value.bankPayments?.reduce((sum, p) => sum + p.amount, 0) || 0) +
        (order.value.appPayments?.reduce((sum, p) => sum + p.amount, 0) || 0)
    return Math.max(0, order.value.total - totalPayments)
})

// Sincronizar order del store
const ordersDataStoreCurrent = computed(() => ordersDataStore.current)
watch(ordersDataStoreCurrent, (newOrder) => {
    if (newOrder) {
        order.value = newOrder
        editableGuestName.value = newOrder.guestName || ''
        editableNotes.value = newOrder.notes || ''
        // Cargar cliente completo si hay customerId
        if (newOrder.customerId) {
            loadCustomer(newOrder.customerId)
        } else {
            customer.value = null
        }
    }
}, { immediate: true })

// Cargar datos del cliente completo

const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order.value) return

    await handleStatusChangeComposable(
        order.value,
        newStatus,
        (updatedOrder) => {
            // ✅ Actualización optimista usando helper
            updateOrderStatus(updatedOrder)
        }
    )
}

const handleDeliverOrder = async () => {
    if (!order.value) return
    emit('delivered', order.value.id)

}

const updateGuestName = async () => {
    if (!order.value || editableGuestName.value === order.value.guestName) return

    try {
        await ordersDataStore.update(order.value.id, {
            guestName: editableGuestName.value || undefined,
        })
        success('Actualizado', 5000, 'Nombre del invitado actualizado')
        // ✅ No necesita recargar, update ya actualizó current
    } catch (err: any) {
        error('Error', err.message)
    }
}

const updateNotes = async () => {
    if (!order.value || editableNotes.value === order.value.notes) return

    try {
        await ordersDataStore.update(order.value.id, {
            notes: editableNotes.value || undefined,
        })
        success('Actualizado', 5000, 'Notas actualizadas')
        // ✅ No necesita recargar
    } catch (err: any) {
        error('Error', err.message)
    }
}

const handleProductsUpdate = async (products: UpdateOrderDetailDto[]) => {
    if (!order.value) return

    try {
        await ordersDataStore.update(order.value.id, {
            orderDetails: products,
        })
        success('Productos actualizados', 5000, 'Los productos del pedido han sido actualizados')
        // ✅ No necesita recargar
    } catch (err: any) {
        error('Error al actualizar productos', err.message)
    }
}

const handlePaymentUpdated = (updates: Partial<OrderDetailView>) => {
    ordersDataStore.updateCurrent(updates)
}

const handleAssignDeliveryModalClose = () => {
    clearPendingStatusChange()
}

const handleDeliverymanUpdated = (updatedOrder?: any) => {
    if (!order.value || !updatedOrder) return
    updateOrderDeliveryman(updatedOrder)
}

const handleStatusChanged = async (newStatus: OrderStatus) => {
    if (!order.value) return

    await executeStatusChange(
        order.value.id,
        newStatus,
        (updatedOrder) => {
            updateOrderDeliveryman(updatedOrder)
        }
    )
}

const handleOrderCancelled = () => {
    router.push({ name: 'Orders' })
}

// Handlers optimistas para actualización sin recarga
const handleOrderTypeUpdated = (updatedOrder?: any) => {
    if (!updatedOrder) return

    const orderAny = updatedOrder as any
    handleModalUpdated({
        type: orderAny.type,
        typeDisplayName: orderAny.typeDisplayName,
        deliveryFee: orderAny.deliveryFee || null,
        reservedFor: orderAny.reservedFor || null,
        addressId: orderAny.addressId || null,
        addressDescription: orderAny.addressDescription || null,
        updatedAt: orderAny.updatedAt
    })

    // Limpiar estado temporal
    pendingOrderType.value = null
    originalOrderType.value = null
}

const handleTypePendingChange = (newType: 'onsite' | 'delivery' | 'reservation') => {
    if (!order.value) return

    // Guardar tipo original si es la primera vez
    if (!originalOrderType.value) {
        originalOrderType.value = order.value.type
    }

    // Actualizar temporalmente el tipo en la UI
    pendingOrderType.value = newType
    updateOrderType(newType)
}

const handleOpenCustomerModalFromType = () => {
    showEditCustomerModal.value = true
}

const handleCustomerModalClose = () => {
    // Si había un cambio de tipo pendiente y se canceló el modal de cliente
    if (pendingOrderType.value && originalOrderType.value && order.value) {
        // Revertir el tipo
        updateOrderType(originalOrderType.value)
        pendingOrderType.value = null
        originalOrderType.value = null
    }
}
const updateOrderStatus = (updatedOrder: any) => {
    const orderAny = updatedOrder as any
    ordersDataStore.updateCurrent({
        status: updatedOrder.status,
        statusDisplayName: orderAny.statusDisplayName,
        statusTimes: orderAny.statusTimes || order.value!.statusTimes,
        updatedAt: orderAny.updatedAt
    })
}

const updateOrderDeliveryman = (updatedOrder: any) => {
    const orderAny = updatedOrder as any
    ordersDataStore.updateCurrent({
        deliveryManId: orderAny.deliveryManId || null,
        deliveryManName: orderAny.deliveryManName || null,
        status: orderAny.status,
        statusDisplayName: orderAny.statusDisplayName,
        statusTimes: orderAny.statusTimes || order.value!.statusTimes,
        updatedAt: orderAny.updatedAt
    })
}

const updateOrderType = (newType: 'onsite' | 'delivery' | 'reservation') => {
    ordersDataStore.updateCurrent({
        type: newType,
        typeDisplayName: getOrderTypeDisplayName(newType)
    })
}
const handleCustomerUpdated = async (updatedOrder?: any) => {
    if (!updatedOrder) return
    const orderAny = updatedOrder as any

    // Si había un cambio de tipo pendiente, guardarlo junto con los datos del cliente
    if (pendingOrderType.value) {
        try {
            // ✅ Enviar tipo + datos del cliente en una sola petición
            const finalUpdate = await ordersDataStore.update(order.value!.id, {
                type: pendingOrderType.value,
                customerId: orderAny.customerId,
                addressId: orderAny.addressId,
                guestName: orderAny.guestName,
                deliveryFee: orderAny.deliveryFee
            })

            // Actualización optimista con la respuesta del backend
            updateOrderCustomer(finalUpdate)

            // Limpiar estado temporal
            pendingOrderType.value = null
            originalOrderType.value = null
        } catch (err: any) {
            error('Error al actualizar pedido', err.message)
        }
    } else {
        // Actualización normal (sin cambio de tipo) - usar handler unificado
        handleModalUpdated({
            customerId: orderAny.customerId,
            customerName: orderAny.customerName,
            customerPhone: orderAny.customerPhone,
            guestName: orderAny.guestName,
            deliveryFee: orderAny.deliveryFee || order.value?.deliveryFee || 0,
            updatedAt: orderAny.updatedAt
        })
    }

    // Recargar cliente completo si hay customerId nuevo o cambiado
    if (orderAny.customerId) {
        await loadCustomer(orderAny.customerId)
    } else {
        customer.value = null
    }

    // ✅ Cerrar el modal después de actualizar exitosamente
    showEditCustomerModal.value = false
}

const handleAddressUpdated = (updatedOrder?: any) => {
    if (!updatedOrder) return
    const orderAny = updatedOrder as any
    handleModalUpdated({
        addressId: orderAny.addressId,
        addressDescription: orderAny.addressDescription,
        updatedAt: orderAny.updatedAt
    })
}
// Handler unificado para todos los modales autónomos
const handleModalUpdated = (updates: Partial<OrderDetailView>) => {
    ordersDataStore.updateCurrent(updates)
}

const updateOrderCustomer = (updatedOrder: any) => {
    const orderAny = updatedOrder as any
    ordersDataStore.updateCurrent({
        type: orderAny.type,
        typeDisplayName: getOrderTypeDisplayName(orderAny.type),
        customerId: orderAny.customerId || null,
        customerName: orderAny.customerName || null,
        customerPhone: orderAny.customerPhone || null,
        addressId: orderAny.addressId || null,
        addressDescription: orderAny.addressDescription || null,
        guestName: orderAny.guestName || null,
        deliveryFee: orderAny.deliveryFee || null,
        updatedAt: orderAny.updatedAt
    })
}



</script>