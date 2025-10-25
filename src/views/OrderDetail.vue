<template>
    <MainLayout>
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <BaseLoading size="lg" />
        </div>

        <!-- Error state -->
        <div v-else-if="errorMsg" class="text-center py-12">
            <p class="text-red-600">{{ errorMsg }}</p>
            <BaseButton variant="secondary" class="mt-4" @click="fetchOrderDetail">
                Reintentar
            </BaseButton>
        </div>

        <!-- Order detail -->
        <div v-else-if="order" class="space-y-6">
            <!-- Header con ID y acciones -->
            <div class="flex items-start justify-between">
                <div>
                    <div class="flex items-center space-x-3">
                        <h1 class="text-3xl font-bold text-gray-900">#{{ order.id }}</h1>
                        <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                    </div>
                    <p class="mt-1 text-sm text-gray-500">
                        Creado el {{ formatDateTime(order.createdAt) }}
                    </p>
                </div>

                <div class="flex items-center space-x-2">
                    <BaseButton variant="secondary" size="sm" @click="$router.push({ name: 'OrdersList' })">
                        <ArrowLeftIcon class="w-4 h-4 mr-1" />
                        Volver
                    </BaseButton>
                    <BaseButton v-if="permissions.canCancel(order)" variant="danger" size="sm"
                        @click="showCancelModal = true">
                        <XCircleIcon class="w-4 h-4 mr-1" />
                        Cancelar Pedido
                    </BaseButton>
                </div>
            </div>

            <!-- Barra de progreso -->
            <div class="bg-white rounded-lg shadow p-6">
                <OrderProgressBar :current-status="order.status" :status-times="order.statusTimes"
                    :order-type="order.type" :clickable="true" @status-click="handleStatusChange" />
            </div>

            <!-- Tabs de contenido -->
            <div class="bg-white rounded-lg shadow">
                <!-- Tab headers -->
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button v-for="tab in tabs" :key="tab.id" :class="[
                            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
                            activeTab === tab.id
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                        ]" @click="activeTab = tab.id">
                            <component :is="tab.icon" class="w-5 h-5 inline-block mr-2" />
                            {{ tab.name }}
                        </button>
                    </nav>
                </div>

                <!-- Tab content -->
                <div class="p-6">
                    <!-- Tab: Información General -->
                    <div v-if="activeTab === 'info'" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Cliente -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Cliente</label>
                                <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <div>
                                        <p class="text-sm font-medium text-gray-900">
                                            {{ order.customerName || order.guestName || 'Sin cliente' }}
                                        </p>
                                        <p v-if="order.customerPhone" class="text-xs text-gray-500">
                                            {{ order.customerPhone }}
                                        </p>
                                    </div>
                                    <BaseButton v-if="permissions.canEditOrder(order)" size="sm" variant="ghost"
                                        @click="showEditCustomerModal = true">
                                        <PencilIcon class="w-4 h-4" />
                                    </BaseButton>
                                </div>
                            </div>


                            <!-- Guest Name -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Nombre del invitado</label>
                                <BaseInput v-model="editableGuestName" placeholder="Nombre de quien recibe"
                                    :disabled="!permissions.canEditOrder(order)" @blur="updateGuestName" />
                            </div>

                            <!-- Tipo de pedido - CLICKEABLE -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Tipo de pedido</label>
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
                                <label class="text-sm font-medium text-gray-700">Dirección de entrega</label>
                                <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-900">
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
                                <label class="text-sm font-medium text-gray-700">Domiciliario</label>
                                <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-900">
                                        {{ order.deliveryManName || 'Sin asignar' }}
                                    </p>
                                    <BaseButton size="sm" variant="ghost" @click="showAssignDeliveryModal = true">
                                        <PencilIcon class="w-4 h-4" />
                                    </BaseButton>
                                </div>
                            </div>

                            <!-- Delivery Fee - SOLO SI DELIVERY -->
                            <div v-if="order.type === 'delivery'" class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Tarifa de domicilio</label>
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-900">{{ formatCurrency(order.deliveryFee || 0) }}</p>
                                </div>
                            </div>

                            <!-- Fecha de reserva - SOLO SI RESERVATION -->
                            <div v-if="order.type === 'reservation' && order.reservedFor" class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Tener listo a esta hora</label>
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-900">{{ formatDateTime(order.reservedFor) }}</p>
                                </div>
                            </div>

                            <!-- Tomado por -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Tomado por</label>
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-900">{{ order.takenByName }}</p>
                                </div>
                            </div>

                            <!-- Sucursal -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Sucursal</label>
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-900">{{ order.branchName }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Notas -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-gray-700">Notas del pedido</label>
                            <textarea v-model="editableNotes" rows="3"
                                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                placeholder="Agregar notas..." :disabled="!permissions.canEditOrder(order)"
                                @blur="updateNotes" />
                        </div>
                    </div>

                    <!-- Tab: Productos -->
                    <div v-if="activeTab === 'products'">
                        <OrderDetailProductsList :products="order.orderDetails" :delivery-fee="order.deliveryFee || 0"
                            :can-edit="permissions.canEditProducts(order)" @save="handleProductsUpdate" />
                    </div>

                    <!-- Tab: Pagos -->
                    <div v-if="activeTab === 'payments'">
                        <div class="mb-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Gestión de Pagos</h3>
                            <p class="text-sm text-gray-600 mb-4">
                                Administra los pagos del pedido. Los pagos bancarios pueden ser verificados y los pagos
                                por app pueden ser liquidados.
                            </p>
                            <PersistedPaymentSelector :bank-payments="order.bankPayments"
                                :app-payments="order.appPayments" :total="order.total" :total-payments="totalPayments"
                                :cash-amount="cashAmount" :can-add-payments="canAddPayments"
                                :can-edit="permissions.canEditPayments(order)"
                                :can-verify="permissions.canVerifyPayments()"
                                :can-settle="permissions.canSettleAppPayments()" :bank-options="bankOptions"
                                :app-options="appOptions" :suggested-amount="getSuggestedAmount()"
                                @add-app-payment="addAppPayment" @update-app-payment="updateAppPayment"
                                @remove-app-payment="removeAppPayment" @add-bank-payment="addBankPayment"
                                @update-bank-payment="updateBankPayment" @remove-bank-payment="removeBankPayment"
                                @verify-payment="handleVerifyPayment" @unverify-payment="handleUnverifyPayment"
                                @settle-payment="handleSettlePayment" @unsettle-payment="handleUnsettlePayment" />
                        </div>
                    </div>
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
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { OrderDetailView, OrderStatus, UpdateOrderDetailDto } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi'
import { appPaymentApi } from '@/services/MainAPI/appPaymentApi'
import { useFormatting } from '@/composables/useFormatting'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { useOrderStatusChange } from '@/composables/useOrderStatusChange'
import { usePersistedOrderPayments } from '@/composables/usePersistedOrderPayments'
import PersistedPaymentSelector from '@/components/payments/PersistedPaymentSelector.vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useToast } from '@/composables/useToast'
import { getOrderTypeDisplayName } from '@/composables/useFormatting'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrderTypeBadge from '@/components/orders/OrderTypeBadge.vue'
import OrderProgressBar from '@/components/orders/OrderProgressBar.vue'
import OrderDetailProductsList from '@/components/orders/OrderDetailProductsList.vue'
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue'
import SelectAddressModal from '@/components/orders/SelectAddressModal.vue'
import AssignDeliveryModal from '@/components/orders/AssignDeliveryModal.vue'
import CancelOrderModal from '@/components/orders/CancelOrderModal.vue'
import EditOrderTypeModal from '@/components/orders/EditOrderTypeModal.vue'
import {
    ArrowLeftIcon,
    XCircleIcon,
    PencilIcon,
    InformationCircleIcon,
    ShoppingBagIcon,
    CreditCardIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { formatDateTime, formatCurrency } = useFormatting()
const permissions = useOrderPermissions()
const { success, error } = useToast()

// Store para opciones de pagos
const ordersStore = useOrdersDraftsStore()

// Estado
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const order = ref<OrderDetailView | null>(null)
const activeTab = ref('info')
const editableGuestName = ref('')
const editableNotes = ref('')
const pendingOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(null)
const originalOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(null)

// Composable de cambio de estado
const {
    pendingStatusChange,
    showAssignDeliveryModal,
    handleStatusChange: handleStatusChangeComposable,
    executeStatusChange,
    clearPendingStatusChange
} = useOrderStatusChange()

// Composable de pagos persistidos
const {
    totalPayments,
    cashAmount,
    canAddPayments,
    hasSinglePayment,
    getSuggestedAmount,
    addAppPayment,
    updateAppPayment,
    removeAppPayment,
    addBankPayment,
    updateBankPayment,
    removeBankPayment,
    autoAdjustSinglePayment,
} = usePersistedOrderPayments(order, (updates) => {
    // Callback para actualización optimista
    if (order.value) {
        order.value = { ...order.value, ...updates }
    }
})

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

// Watch para auto-ajustar pago único cuando cambia el total
watch(() => order.value?.total, async (newTotal, oldTotal) => {
    if (!newTotal || !oldTotal || newTotal === oldTotal) return
    if (!hasSinglePayment.value) return

    await autoAdjustSinglePayment()
}, { deep: true })

// Modales
const showEditCustomerModal = ref(false)
const showSelectAddressModal = ref(false)
const showCancelModal = ref(false)
const showEditOrderTypeModal = ref(false)

// Tabs
const tabs = [
    { id: 'info', name: 'Información General', icon: InformationCircleIcon },
    { id: 'products', name: 'Productos', icon: ShoppingBagIcon },
    { id: 'payments', name: 'Pagos', icon: CreditCardIcon },
]

// Métodos
const fetchOrderDetail = async () => {
    loading.value = true
    errorMsg.value = null
    try {
        const orderId = parseInt(route.params.id as string)
        order.value = await orderApi.fetchDetail(orderId)
        editableGuestName.value = order.value.guestName || ''
        editableNotes.value = order.value.notes || ''
    } catch (err: any) {
        errorMsg.value = err.message || 'Error al cargar el pedido'
    } finally {
        loading.value = false
    }
}

// Cargar datos necesarios para pagos
const loadPaymentData = async () => {
    try {
        await Promise.all([
            ordersStore.loadBanks(),
            ordersStore.loadApps()
        ])
    } catch (err: any) {
        console.error('Error loading payment data:', err)
    }
}

const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order.value) return

    await handleStatusChangeComposable(
        order.value,
        newStatus,
        (updatedOrder) => {
            // ✅ Actualización optimista
            const orderAny = updatedOrder as any
            order.value = {
                ...order.value!,
                status: updatedOrder.status,
                statusDisplayName: orderAny.statusDisplayName,
                statusTimes: orderAny.statusTimes || order.value!.statusTimes,
                updatedAt: orderAny.updatedAt
            }
        }
    )
}

const updateGuestName = async () => {
    if (!order.value || editableGuestName.value === order.value.guestName) return

    try {
        await orderApi.update(order.value.id, {
            guestName: editableGuestName.value || undefined,
        })
        success('Actualizado', 5000, 'Nombre del invitado actualizado')
        await fetchOrderDetail()
    } catch (err: any) {
        error('Error', err.message)
    }
}

const updateNotes = async () => {
    if (!order.value || editableNotes.value === order.value.notes) return

    try {
        await orderApi.update(order.value.id, {
            notes: editableNotes.value || undefined,
        })
        success('Actualizado', 5000, 'Notas actualizadas')
        await fetchOrderDetail()
    } catch (err: any) {
        error('Error', err.message)
    }
}

const handleProductsUpdate = async (products: UpdateOrderDetailDto[]) => {
    if (!order.value) return

    try {
        await orderApi.update(order.value.id, {
            orderDetails: products,
        })
        success('Productos actualizados', 5000, 'Los productos del pedido han sido actualizados')
        await fetchOrderDetail()
    } catch (err: any) {
        error('Error al actualizar productos', err.message)
    }
}

const handleVerifyPayment = async (paymentId: number) => {
    try {
        await bankPaymentApi.verify(paymentId)
        success('Pago verificado', 5000, 'El pago bancario ha sido verificado')
        await fetchOrderDetail()
    } catch (err: any) {
        error('Error', err.message)
    }
}

const handleUnverifyPayment = async (paymentId: number) => {
    try {
        await bankPaymentApi.unverify(paymentId)
        success('Verificación removida', 5000, 'El pago bancario ha sido desverificado')
        await fetchOrderDetail()
    } catch (err: any) {
        error('Error', err.message)
    }
}

const handleSettlePayment = async (paymentId: number) => {
    try {
        await appPaymentApi.settle(paymentId)
        success('Pago liquidado', 5000, 'El pago por app ha sido liquidado')
        await fetchOrderDetail()
    } catch (err: any) {
        error('Error', err.message)
    }
}

const handleUnsettlePayment = async (paymentId: number) => {
    try {
        await appPaymentApi.unsettle(paymentId)
        success('Liquidación removida', 5000, 'El pago por app ha sido desliquidado')
        await fetchOrderDetail()
    } catch (err: any) {
        error('Error', err.message)
    }
}

const handleAssignDeliveryModalClose = () => {
    clearPendingStatusChange()
}

const handleDeliverymanUpdated = (updatedOrder?: any) => {
    if (!order.value || !updatedOrder) return

    const orderAny = updatedOrder as any
    order.value = {
        ...order.value,
        deliveryManId: orderAny.deliveryManId || null,
        deliveryManName: orderAny.deliveryManName || null,
        status: orderAny.status,
        statusDisplayName: orderAny.statusDisplayName,
        statusTimes: orderAny.statusTimes || order.value.statusTimes,
        updatedAt: orderAny.updatedAt
    }
}

const handleStatusChanged = async (newStatus: OrderStatus) => {
    if (!order.value) return

    await executeStatusChange(
        order.value.id,
        newStatus,
        (updatedOrder) => {
            const orderAny = updatedOrder as any
            order.value = {
                ...order.value!,
                deliveryManId: orderAny.deliveryManId || null,
                deliveryManName: orderAny.deliveryManName || null,
                status: orderAny.status,
                statusDisplayName: orderAny.statusDisplayName,
                statusTimes: orderAny.statusTimes || order.value!.statusTimes,
                updatedAt: orderAny.updatedAt
            }
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
    order.value = {
        ...order.value!,
        type: orderAny.type,
        typeDisplayName: orderAny.typeDisplayName,
        deliveryFee: orderAny.deliveryFee || null,
        reservedFor: orderAny.reservedFor || null,
        addressId: orderAny.addressId || null,
        addressDescription: orderAny.addressDescription || null,
        updatedAt: orderAny.updatedAt
    }

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
    order.value = {
        ...order.value,
        type: newType,
        typeDisplayName: getOrderTypeDisplayName(newType)
    }
}

const handleOpenCustomerModalFromType = () => {
    showEditCustomerModal.value = true
}

const handleCustomerModalClose = () => {
    // Si había un cambio de tipo pendiente y se canceló el modal de cliente
    if (pendingOrderType.value && originalOrderType.value && order.value) {
        // Revertir el tipo
        order.value = {
            ...order.value,
            type: originalOrderType.value,
            typeDisplayName: getOrderTypeDisplayName(originalOrderType.value)
        }
        pendingOrderType.value = null
        originalOrderType.value = null
    }
}

const handleCustomerUpdated = async (updatedOrder?: any) => {
    if (!updatedOrder) return
    const orderAny = updatedOrder as any

    // Si había un cambio de tipo pendiente, guardarlo junto con los datos del cliente
    if (pendingOrderType.value) {
        try {
            // ✅ Enviar tipo + datos del cliente en una sola petición
            const finalUpdate = await orderApi.update(order.value!.id, {
                type: pendingOrderType.value,
                customerId: orderAny.customerId,
                addressId: orderAny.addressId,
                guestName: orderAny.guestName,
                deliveryFee: orderAny.deliveryFee
            })

            // Actualización optimista con la respuesta del backend
            order.value = {
                ...order.value!,
                type: finalUpdate.type,
                typeDisplayName: getOrderTypeDisplayName(finalUpdate.type),
                customerId: finalUpdate.customerId || null,
                customerName: finalUpdate.customerName || null,
                customerPhone: finalUpdate.customerPhone || null,
                addressId: finalUpdate.addressId || null,
                addressDescription: finalUpdate.addressDescription || null,
                guestName: finalUpdate.guestName || null,
                deliveryFee: finalUpdate.deliveryFee || null,
                updatedAt: finalUpdate.updatedAt
            }

            // Limpiar estado temporal
            pendingOrderType.value = null
            originalOrderType.value = null
        } catch (err: any) {
            error('Error al actualizar pedido', err.message)
        }
    } else {
        // Actualización normal (sin cambio de tipo)
        order.value = {
            ...order.value!,
            customerId: orderAny.customerId,
            customerName: orderAny.customerName,
            customerPhone: orderAny.customerPhone,
            guestName: orderAny.guestName,
            deliveryFee: orderAny.deliveryFee || order.value!.deliveryFee,
            updatedAt: orderAny.updatedAt
        }
    }

    // ✅ Cerrar el modal después de actualizar exitosamente
    showEditCustomerModal.value = false
}

const handleAddressUpdated = (updatedOrder?: any) => {
    if (!updatedOrder) return
    const orderAny = updatedOrder as any
    order.value = {
        ...order.value!,
        addressId: orderAny.addressId,
        addressDescription: orderAny.addressDescription,
        updatedAt: orderAny.updatedAt
    }
}

// Lifecycle
onMounted(async () => {
    await Promise.all([
        fetchOrderDetail(),
        loadPaymentData()
    ])
})
</script>
