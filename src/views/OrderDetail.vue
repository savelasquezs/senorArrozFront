<template>
    <div class="container mx-auto px-4 py-6">
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
                    <BaseButton variant="secondary" size="sm" @click="$router.push({ name: 'Orders' })">
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

                            <!-- Dirección -->
                            <div v-if="order.type === 'delivery'" class="space-y-2">
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

                            <!-- Domiciliario -->
                            <div class="space-y-2">
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

                            <!-- Guest Name -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Nombre del invitado</label>
                                <BaseInput v-model="editableGuestName" placeholder="Nombre de quien recibe"
                                    :disabled="!permissions.canEditOrder(order)" @blur="updateGuestName" />
                            </div>

                            <!-- Tipo de pedido -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Tipo de pedido</label>
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <p class="text-sm text-gray-900">{{ order.typeDisplayName }}</p>
                                </div>
                            </div>

                            <!-- Fecha de reserva (si aplica) -->
                            <div v-if="order.reservedFor" class="space-y-2">
                                <label class="text-sm font-medium text-gray-700">Fecha de reserva</label>
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
                        <OrderPaymentsList :bank-payments="order.bankPayments" :app-payments="order.appPayments"
                            :total="order.total" :can-edit="permissions.canEditPayments(order)"
                            @verify-payment="handleVerifyPayment" @unverify-payment="handleUnverifyPayment"
                            @settle-payment="handleSettlePayment" @unsettle-payment="handleUnsettlePayment" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Modales -->
        <EditCustomerModal v-if="order" :open="showEditCustomerModal" :order="order"
            @close="showEditCustomerModal = false" @updated="fetchOrderDetail" />

        <SelectAddressModal v-if="order" :open="showSelectAddressModal" :order="order"
            @close="showSelectAddressModal = false" @updated="fetchOrderDetail" />

        <AssignDeliveryModal v-if="order" :open="showAssignDeliveryModal" :order="order"
            :pending-status-change="pendingStatusChange || undefined" @close="handleAssignDeliveryModalClose"
            @updated="handleDeliverymanUpdated" @status-changed="handleStatusChanged" />

        <CancelOrderModal v-if="order" :open="showCancelModal" :order="order" @close="showCancelModal = false"
            @cancelled="handleOrderCancelled" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { OrderDetailView, OrderStatus, UpdateOrderDetailDto } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi'
import { appPaymentApi } from '@/services/MainAPI/appPaymentApi'
import { useFormatting } from '@/composables/useFormatting'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { useOrderStatusChange } from '@/composables/useOrderStatusChange'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrderTypeBadge from '@/components/orders/OrderTypeBadge.vue'
import OrderProgressBar from '@/components/orders/OrderProgressBar.vue'
import OrderDetailProductsList from '@/components/orders/OrderDetailProductsList.vue'
import OrderPaymentsList from '@/components/orders/OrderPaymentsList.vue'
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue'
import SelectAddressModal from '@/components/orders/SelectAddressModal.vue'
import AssignDeliveryModal from '@/components/orders/AssignDeliveryModal.vue'
import CancelOrderModal from '@/components/orders/CancelOrderModal.vue'
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
const { formatDateTime } = useFormatting()
const permissions = useOrderPermissions()
const { success, error } = useToast()

// Estado
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const order = ref<OrderDetailView | null>(null)
const activeTab = ref('info')
const editableGuestName = ref('')
const editableNotes = ref('')

// Composable de cambio de estado
const {
    pendingStatusChange,
    showAssignDeliveryModal,
    handleStatusChange: handleStatusChangeComposable,
    executeStatusChange,
    clearPendingStatusChange
} = useOrderStatusChange()

// Modales
const showEditCustomerModal = ref(false)
const showSelectAddressModal = ref(false)
const showCancelModal = ref(false)

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

// Lifecycle
onMounted(() => {
    fetchOrderDetail()
})
</script>
