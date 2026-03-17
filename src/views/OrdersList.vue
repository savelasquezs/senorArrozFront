<template>
    <MainLayout>
        <!-- Header -->
        <div class="mb-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900">Pedidos</h1>
                    <p class="mt-1 text-sm text-gray-500">
                        Gestiona y visualiza todos los pedidos del sistema
                    </p>
                </div>
                <div class="flex items-center space-x-3">
                    <BaseButton @click="navigateToNewOrder" variant="primary">
                        <PlusIcon class="w-4 h-4 mr-2" />
                        Nuevo Pedido
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="mb-6 border-b border-gray-200">
            <nav class="-mb-px flex space-x-6">
                <button
                    v-for="tab in tabs" :key="tab.value"
                    @click="switchTab(tab.value)"
                    :class="[
                        'pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5',
                        activeTab === tab.value
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]"
                >
                    <component :is="tab.icon" class="w-4 h-4" />
                    {{ tab.label }}
                </button>
            </nav>
        </div>

        <!-- ===== TAB: PEDIDOS DEL DÍA ===== -->
        <template v-if="activeTab === 'orders'">
        <!-- Filtros - Diseño Compacto -->
        <div class="bg-white rounded-lg shadow mb-6">
            <!-- Fila de filtros -->
            <div class="p-4 border-b border-gray-200">
                <div class="flex flex-wrap items-center gap-3">
                    <!-- Búsqueda (más ancha) -->
                    <div class="flex-1 min-w-[250px]">
                        <BaseInput v-model="filters.search" placeholder="Buscar por ID, cliente, teléfono..."
                            @input="applyFilters">
                            <template #icon>
                                <MagnifyingGlassIcon class="w-4 h-4" />
                            </template>
                        </BaseInput>
                    </div>

                    <!-- Filtros compactos -->
                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Tipo -->
                        <div class="w-40">
                            <BaseSelect v-model="filters.type" :options="typeOptions" value-key="value"
                                display-key="label" placeholder="Tipo" @update:model-value="applyFilters" />
                        </div>

                        <!-- Estado -->
                        <div class="w-44">
                            <BaseSelect v-model="filters.status" :options="statusOptions" value-key="value"
                                display-key="label" placeholder="Estado" @update:model-value="applyFilters" />
                        </div>

                        <!-- Domiciliario -->
                        <div class="w-48">
                            <DeliverymanFilter v-model="filters.deliveryManId" :orders="orders"
                                @update:model-value="applyFilters" />
                        </div>

                        <!-- Rango de fechas compacto -->
                        <div class="flex items-center gap-2">
                            <BaseInput v-model="dateFilters.fromDate" type="date" placeholder="Desde" class="w-36"
                                @change="fetchOrders" />
                            <span class="text-gray-400">-</span>
                            <BaseInput v-model="dateFilters.toDate" type="date" placeholder="Hasta" class="w-36"
                                @change="fetchOrders" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contador de resultados y acciones -->
            <div class="px-4 py-3 bg-gray-50 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                    <span v-if="!loading && filteredOrders.length > 0">
                        Mostrando <span class="font-medium">{{ filteredOrders.length }}</span>
                        de <span class="font-medium">{{ totalCount }}</span> pedidos
                    </span>
                    <span v-else-if="!loading" class="text-gray-400">
                        No hay pedidos
                    </span>
                    <span v-else class="text-gray-400">
                        Cargando...
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Botón limpiar filtros -->
                    <BaseButton v-if="hasActiveFilters" variant="ghost" size="sm" @click="clearFilters">
                        <XMarkIcon class="w-4 h-4 mr-1" />
                        Limpiar filtros
                    </BaseButton>

                    <!-- Botón refrescar -->
                    <BaseButton variant="secondary" size="sm" :loading="loading" @click="fetchOrders">
                        <ArrowPathIcon class="w-4 h-4" />
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Tabla -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <OrdersTable :orders="filteredOrders" :loading="loading" :sort-by="sortBy" :sort-order="sortOrder"
                :quick-banks="quickBanks"
                @edit-customer="handleEditCustomer" @edit-address="handleEditAddress"
                @change-status="handleChangeStatus" @assign-delivery="handleAssignDelivery" @edit-type="handleEditType"
                @verify-bank-payment="handleVerifyBankPayment" @quick-bank-transfer="handleQuickBankTransfer"
                @add-deposit="handleOpenDeposit"
                @sort="handleSort" />

            <!-- Paginación -->
            <div v-if="!loading && totalPages > 1" class="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                <div class="flex items-center justify-between">
                    <div class="flex-1 flex justify-between sm:hidden">
                        <BaseButton variant="secondary" size="sm" :disabled="currentPage === 1"
                            @click="changePage(currentPage - 1)">
                            Anterior
                        </BaseButton>
                        <BaseButton variant="secondary" size="sm" :disabled="currentPage === totalPages"
                            @click="changePage(currentPage + 1)">
                            Siguiente
                        </BaseButton>
                    </div>
                    <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p class="text-sm text-gray-700">
                                Mostrando
                                <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span>
                                a
                                <span class="font-medium">{{
                                    Math.min(currentPage * pageSize, totalCount)
                                }}</span>
                                de
                                <span class="font-medium">{{ totalCount }}</span>
                                resultados
                            </p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <BaseSelect v-model="pageSize" :options="pageSizeOptions" label="Por página" class="w-32"
                                @update:model-value="handlePageSizeChange" />
                            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button :disabled="currentPage === 1"
                                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    @click="changePage(currentPage - 1)">
                                    <ChevronLeftIcon class="h-5 w-5" />
                                </button>
                                <button v-for="page in visiblePages" :key="page" :class="[
                                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                                    page === currentPage
                                        ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                                ]" @click="changePage(page)">
                                    {{ page }}
                                </button>
                                <button :disabled="currentPage === totalPages"
                                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    @click="changePage(currentPage + 1)">
                                    <ChevronRightIcon class="h-5 w-5" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </template><!-- /tab orders -->

        <!-- ===== TAB: RESERVAS ===== -->
        <template v-if="activeTab === 'reservations'">

        <!-- Filtros reservas -->
        <div class="bg-white rounded-lg shadow mb-6">
            <div class="p-4 border-b border-gray-200">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex-1 min-w-[250px]">
                        <BaseInput v-model="resSearch" placeholder="Buscar por ID, cliente, notas..."
                            @input="resCurrentPage = 1">
                            <template #icon><MagnifyingGlassIcon class="w-4 h-4" /></template>
                        </BaseInput>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <!-- Estado reservas -->
                        <div class="w-48">
                            <BaseSelect v-model="resStatus" :options="resStatusOptions" value-key="value"
                                display-key="label" placeholder="Estado" @update:model-value="fetchReservations" />
                        </div>

                        <!-- Fecha del evento -->
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500 whitespace-nowrap">Fecha evento:</span>
                            <BaseInput v-model="resFrom" type="date" class="w-36" @change="fetchReservations" />
                            <span class="text-gray-400">-</span>
                            <BaseInput v-model="resTo" type="date" class="w-36" @change="fetchReservations" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="px-4 py-3 bg-gray-50 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                    <span v-if="!resLoading && resFilteredItems.length > 0">
                        Mostrando <span class="font-medium">{{ resFilteredItems.length }}</span>
                        de <span class="font-medium">{{ resTotalCount }}</span> reservas
                    </span>
                    <span v-else-if="!resLoading" class="text-gray-400">No hay reservas</span>
                    <span v-else class="text-gray-400">Cargando...</span>
                </div>

                <div class="flex items-center gap-2">
                    <BaseButton v-if="resSearch || resStatus || resFrom || resTo" variant="ghost" size="sm" @click="clearResFilters">
                        <XMarkIcon class="w-4 h-4 mr-1" />Limpiar filtros
                    </BaseButton>
                    <BaseButton variant="secondary" size="sm" :loading="resLoading" @click="fetchReservations">
                        <ArrowPathIcon class="w-4 h-4" />
                    </BaseButton>
                </div>
            </div>
        </div>

        <!-- Tabla reservas -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <ReservationsTable
                :reservations="resFilteredItems"
                :loading="resLoading"
                :sort-by="resSortBy"
                :sort-order="resSortOrder"
                @edit-customer="handleEditCustomer"
                @edit-address="handleEditAddress"
                @add-deposit="handleOpenDeposit"
                @cancel-reservation="handleCancelReservation"
                @sort="handleResSort" />

            <!-- Paginación reservas -->
            <div v-if="!resLoading && resTotalPages > 1" class="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <p class="text-sm text-gray-700">
                        Página <span class="font-medium">{{ resCurrentPage }}</span> de
                        <span class="font-medium">{{ resTotalPages }}</span>
                    </p>
                    <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button :disabled="resCurrentPage === 1"
                            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="resChangePage(resCurrentPage - 1)">
                            <ChevronLeftIcon class="h-5 w-5" />
                        </button>
                        <button v-for="p in resVisiblePages" :key="p" :class="[
                            'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                            p === resCurrentPage
                                ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                        ]" @click="resChangePage(p)">{{ p }}</button>
                        <button :disabled="resCurrentPage === resTotalPages"
                            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="resChangePage(resCurrentPage + 1)">
                            <ChevronRightIcon class="h-5 w-5" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>

        </template><!-- /tab reservations -->

        <!-- Modales -->
        <EditCustomerModal v-if="showEditCustomerModal && selectedOrder" :open="showEditCustomerModal"
            :order="selectedOrder" @close="handleCustomerModalClose" @updated="handleOrderUpdated" />

        <SelectAddressModal v-if="selectedOrder" :open="showSelectAddressModal" :order="selectedOrder"
            @close="showSelectAddressModal = false" @updated="handleOrderUpdated" />

        <AssignDeliveryModal v-if="selectedOrder" :open="showAssignDeliveryModal" :order="selectedOrder"
            :pending-status-change="pendingStatusChange || undefined" @updated="handleAssignDeliveryUpdated"
            @status-changed="clearPendingStatusChange" @close="handleAssignDeliveryModalClose" />

        <!-- Modal de cambio de tipo -->
        <EditOrderTypeModal v-if="showEditOrderTypeModal && selectedOrder" :open="showEditOrderTypeModal"
            :order="selectedOrder" @close="showEditOrderTypeModal = false" @updated="handleOrderTypeUpdated"
            @type-changed-pending="handleTypePendingChange" @open-customer-modal="handleOpenCustomerModalFromType" />

        <!-- Modal de abonos de reservas -->
        <ReservationDepositModal
            v-model="showDepositModal"
            :order="depositOrder"
            @deposited="handleDeposited"
        />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { OrderListItem, Order, OrderStatus, OrderBankPaymentDetail } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useOrderFilters, type OrderFilterState } from '@/composables/useOrderFilters'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { useToast } from '@/composables/useToast'
import { getOrderStatusDisplayName, getOrderTypeDisplayName } from '@/composables/useFormatting'
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi'
import { useBanksStore } from '@/store/banks'
import MainLayout from '@/components/layout/MainLayout.vue'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import DeliverymanFilter from '@/components/orders/DeliverymanFilter.vue'
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue'
import SelectAddressModal from '@/components/orders/SelectAddressModal.vue'
import AssignDeliveryModal from '@/components/orders/AssignDeliveryModal.vue'
import EditOrderTypeModal from '@/components/orders/EditOrderTypeModal.vue'
import ReservationDepositModal from '@/components/reservations/ReservationDepositModal.vue'
import ReservationsTable from '@/components/reservations/ReservationsTable.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    XMarkIcon,
    ClipboardDocumentListIcon,
    CalendarDaysIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const banksStore = useBanksStore()
const { applyAllFilters, sortOrders } = useOrderFilters()
const { getNextAllowedStatus, canChangeStatus } = useOrderPermissions()

// ===== TABS =====
type TabValue = 'orders' | 'reservations'
const activeTab = ref<TabValue>('orders')
const tabs = [
    { value: 'orders' as TabValue, label: 'Pedidos del día', icon: ClipboardDocumentListIcon },
    { value: 'reservations' as TabValue, label: 'Reservas', icon: CalendarDaysIcon },
]
const switchTab = (tab: TabValue) => {
    activeTab.value = tab
    if (tab === 'reservations' && reservations.value.length === 0) {
        fetchReservations()
    }
}
const { success, error } = useToast()

// Estado
const loading = ref(false)
const orders = ref<OrderListItem[]>([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const sortBy = ref<'id' | 'total' | 'createdAt'>('id')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Filtros
const filters = ref<OrderFilterState>({
    search: '',
    type: null,
    status: null,
    customer: '',
    deliveryman: '',
    deliveryManId: null, // ✅ NUEVO
})

const dateFilters = ref({
    fromDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }), // Fecha Colombia en formato YYYY-MM-DD
    toDate: '',
})

// Modales
const showEditCustomerModal = ref(false)
const showSelectAddressModal = ref(false)
const showAssignDeliveryModal = ref(false)
const showEditOrderTypeModal = ref(false)
const selectedOrder = ref<OrderListItem | null>(null)
const pendingStatusChange = ref<OrderStatus | null>(null)
const pendingOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(null)
const originalOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(null)

// Opciones de filtros
const typeOptions: Array<{ value: string | null; label: string }> = [
    { value: null, label: 'Todos los tipos' },
    { value: 'onsite', label: 'En el local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
]

const statusOptions: Array<{ value: string | null; label: string }> = [
    { value: null, label: 'Todos los estados' },
    { value: 'taken', label: 'Tomado' },
    { value: 'in_preparation', label: 'En preparación' },
    { value: 'ready', label: 'Listo' },
    { value: 'on_the_way', label: 'En camino' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'cancelled', label: 'Cancelado' },
]

const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
]

// Computed
const filteredOrders = computed(() => {
    let filtered = applyAllFilters(orders.value, filters.value)
    return sortOrders(filtered, sortBy.value, sortOrder.value)
})

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const visiblePages = computed(() => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages.value, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
        pages.push(i)
    }

    return pages
})

const hasActiveFilters = computed(() => {
    return !!(
        filters.value.search ||
        filters.value.type ||
        filters.value.status ||
        filters.value.customer ||
        filters.value.deliveryman ||
        filters.value.deliveryManId || // ✅ NUEVO
        dateFilters.value.fromDate ||
        dateFilters.value.toDate
    )
})

// Métodos
const fetchOrders = async () => {
    loading.value = true
    try {
        const body: Record<string, any> = {
            page: currentPage.value,
            pageSize: pageSize.value,
            sortBy: sortBy.value,
            sortOrder: sortOrder.value,
            excludeFutureReservations: true,
        }
        if (dateFilters.value.fromDate) body.fromDate = new Date(dateFilters.value.fromDate).toISOString()
        if (dateFilters.value.toDate) {
            const to = new Date(dateFilters.value.toDate)
            to.setHours(23, 59, 59, 999)
            body.toDate = to.toISOString()
        }

        const response = await orderApi.searchOrders(body)
        orders.value = response.items
        totalCount.value = response.totalCount
    } catch (err: any) {
        error('Error al cargar pedidos', err.message)
    } finally {
        loading.value = false
    }
}

const applyFilters = () => {
    currentPage.value = 1
}

const clearFilters = () => {
    filters.value = {
        search: '',
        type: null,
        status: null,
        customer: '',
        deliveryman: '',
        deliveryManId: null, // ✅ NUEVO
    }
    dateFilters.value = {
        fromDate: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
        toDate: '',
    }
    fetchOrders()
}

const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        fetchOrders()
    }
}

const handlePageSizeChange = () => {
    currentPage.value = 1
    fetchOrders()
}

const handleSort = (column: 'id' | 'total' | 'createdAt') => {
    if (sortBy.value === column) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortBy.value = column
        sortOrder.value = 'desc'
    }
    currentPage.value = 1
    fetchOrders()
}

// Handlers de eventos de tabla
const handleEditCustomer = (order: OrderListItem) => {
    selectedOrder.value = order
    showEditCustomerModal.value = true
}

const handleEditAddress = (order: OrderListItem) => {
    selectedOrder.value = order
    showSelectAddressModal.value = true
}

const handleChangeStatus = async (order: OrderListItem) => {
    const nextStatus = getNextAllowedStatus(order.status, order.type)

    if (!nextStatus) {
        error('No se puede cambiar el estado', 'Este pedido ya no puede avanzar más')
        return
    }

    if (!canChangeStatus(order, nextStatus)) {
        error('Sin permisos', 'No tienes permiso para cambiar el estado de este pedido')
        return
    }

    // REGLA: delivery en ready->on_the_way requiere domiciliario
    if (order.type === 'delivery' && nextStatus === 'on_the_way' && !order.deliveryManId) {
        selectedOrder.value = order
        pendingStatusChange.value = nextStatus
        showAssignDeliveryModal.value = true
        return
    }

    // Proceder con cambio de estado
    try {
        const updatedOrder = await orderApi.updateStatus(order.id, nextStatus)

        // ✅ ACTUALIZACIÓN OPTIMISTA - actualizar en la lista local
        const index = orders.value.findIndex(o => o.id === order.id)
        if (index !== -1) {
            orders.value[index] = {
                ...orders.value[index],
                status: updatedOrder.status,
                statusDisplayName: getOrderStatusDisplayName(updatedOrder.status),
                updatedAt: updatedOrder.updatedAt
            }
        }

        success('Estado actualizado', 5000, `Pedido cambiado a ${getOrderStatusDisplayName(nextStatus)}`)
    } catch (err: any) {
        error('Error al cambiar estado', err.message)
    }
}

const handleAssignDelivery = (order: OrderListItem) => {
    selectedOrder.value = order
    showAssignDeliveryModal.value = true
}

const handleAssignDeliveryUpdated = async (updatedOrder?: Order) => {
    await handleOrderUpdated(updatedOrder)
    // Recargar la lista para reflejar domiciliario y estado en la UI
    if (updatedOrder) {
        await fetchOrders()
    }
}

const handleEditType = (order: OrderListItem) => {
    selectedOrder.value = order
    showEditOrderTypeModal.value = true
}

// ✅ NUEVO: Handler para verificar pago bancario
const handleVerifyBankPayment = async (order: OrderListItem, payment: OrderBankPaymentDetail) => {
    try {
        if (payment.isVerified) {
            // Desverificar
            await bankPaymentApi.unverifyBankPayment(payment.id)
            success('Pago desverificado', 5000)
        } else {
            // Verificar
            await bankPaymentApi.verifyBankPayment(payment.id)
            success('Pago verificado', 5000)
        }

        // ✅ Actualización optimista
        const index = orders.value.findIndex(o => o.id === order.id)
        if (index !== -1) {
            const paymentIndex = orders.value[index].bankPayments.findIndex(p => p.id === payment.id)
            if (paymentIndex !== -1) {
                orders.value[index].bankPayments[paymentIndex] = {
                    ...orders.value[index].bankPayments[paymentIndex],
                    isVerified: !payment.isVerified,
                    verifiedAt: !payment.isVerified ? new Date().toISOString() : null
                }
            }
        }
    } catch (err: any) {
        error('Error al verificar pago', err.message)
    }
}

// Handler unificado para actualización de pedidos en la lista
const updateOrderInList = (updatedOrder: Order) => {
    const orderAny = updatedOrder as any
    const index = orders.value.findIndex(o => o.id === orderAny.id)
    if (index !== -1) {
        const current = orders.value[index]
        const merged = {
            ...current,
            ...orderAny,
            typeDisplayName: getOrderTypeDisplayName(orderAny.type ?? current.type),
            statusDisplayName: orderAny.status != null
                ? getOrderStatusDisplayName(String(orderAny.status))
                : current.statusDisplayName,
            deliveryManId: orderAny.deliveryManId ?? current.deliveryManId,
            deliveryManName: orderAny.deliveryManName ?? current.deliveryManName,
            status: orderAny.status ?? current.status,
            updatedAt: orderAny.updatedAt ?? current.updatedAt
        }
        // Reemplazar array completo para garantizar reactividad en Vue
        const updated = [...orders.value]
        updated[index] = merged
        orders.value = updated
    }
}

const handleOrderTypeUpdated = (updatedOrder?: Order) => {
    if (!updatedOrder) return

    updateOrderInList(updatedOrder)

    // Limpiar estado temporal
    pendingOrderType.value = null
    originalOrderType.value = null
}

const handleTypePendingChange = (newType: 'onsite' | 'delivery' | 'reservation') => {
    if (!selectedOrder.value) return

    // Guardar tipo original si es la primera vez
    if (!originalOrderType.value) {
        originalOrderType.value = selectedOrder.value.type
    }

    // Actualizar temporalmente el tipo en la UI
    pendingOrderType.value = newType
    const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id)
    if (index !== -1) {
        orders.value[index] = {
            ...orders.value[index],
            type: newType,
            typeDisplayName: getOrderTypeDisplayName(newType)
        }
        selectedOrder.value = orders.value[index]
    }
}

const handleOpenCustomerModalFromType = () => {
    showEditCustomerModal.value = true
}

const handleCustomerModalClose = () => {
    // Si había un cambio de tipo pendiente y se canceló el modal de cliente
    if (pendingOrderType.value && originalOrderType.value && selectedOrder.value) {
        // Revertir el tipo
        const index = orders.value.findIndex(o => o.id === selectedOrder.value!.id)
        if (index !== -1) {
            orders.value[index] = {
                ...orders.value[index],
                type: originalOrderType.value,
                typeDisplayName: getOrderTypeDisplayName(originalOrderType.value)
            }
            selectedOrder.value = orders.value[index]
        }
        pendingOrderType.value = null
        originalOrderType.value = null
    }
}

const handleOrderUpdated = async (updatedOrder?: Order) => {
    if (updatedOrder) {
        const orderAny = updatedOrder as any // Acceso a todos los campos del backend

        // ✅ ACTUALIZACIÓN OPTIMISTA - actualizar en la lista local
        const index = orders.value.findIndex(o => o.id === orderAny.id)
        if (index !== -1) {
            // Si había un cambio de tipo pendiente, guardarlo junto con los datos del cliente
            if (pendingOrderType.value) {
                try {
                    // ✅ Enviar tipo + datos del cliente en una sola petición
                    const finalUpdate = await orderApi.update(selectedOrder.value!.id, {
                        type: pendingOrderType.value,
                        customerId: orderAny.customerId,
                        addressId: orderAny.addressId,
                        guestName: orderAny.guestName,
                        deliveryFee: orderAny.deliveryFee
                    })

                    // Actualización optimista con la respuesta del backend
                    orders.value[index] = {
                        ...orders.value[index],
                        type: finalUpdate.type,
                        typeDisplayName: getOrderTypeDisplayName(finalUpdate.type),
                        customerId: finalUpdate.customerId || null,
                        customerName: finalUpdate.customerName || null,
                        customerPhone: finalUpdate.customerPhone || null,
                        addressId: finalUpdate.addressId || null,
                        addressDescription: finalUpdate.addressDescription || null,
                        guestName: finalUpdate.guestName || null,
                        deliveryFee: finalUpdate.deliveryFee || null,
                        // ✅ INCLUIR TOTALES DEL BACKEND
                        subtotal: finalUpdate.subtotal || 0,
                        discountTotal: finalUpdate.discountTotal || 0,
                        total: finalUpdate.total || 0,
                        updatedAt: finalUpdate.updatedAt
                    }

                    // Limpiar estado temporal
                    pendingOrderType.value = null
                    originalOrderType.value = null
                } catch (err: any) {
                    error('Error al actualizar pedido', err.message)
                }
            } else {
                // Actualización normal - usar handler unificado
                updateOrderInList(updatedOrder)
                // Actualizar selectedOrder con la referencia del pedido en la lista (evita referencias obsoletas)
                const updatedIndex = orders.value.findIndex(o => o.id === orderAny.id)
                if (updatedIndex !== -1) {
                    selectedOrder.value = orders.value[updatedIndex] as OrderListItem
                }
            }
        }

        // ✅ Cerrar modales después de actualizar exitosamente
        showEditCustomerModal.value = false
        showSelectAddressModal.value = false
        showAssignDeliveryModal.value = false
    }
    // Solo recargar si no se proporcionó el pedido actualizado
    if (!updatedOrder) {
        fetchOrders()
    }
}

const navigateToNewOrder = () => {
    router.push('/orders/new')
}

const clearPendingStatusChange = () => {
    pendingStatusChange.value = null
}

const handleQuickBankTransfer = async (order: OrderListItem, bankId: number) => {
    try {
        if ((order.bankPayments && order.bankPayments.length > 0) ||
            (order.appPayments && order.appPayments.length > 0)) {
            error('No se puede convertir', 'El pedido ya tiene pagos registrados')
            return
        }

        await bankPaymentApi.createBankPayment({
            orderId: order.id,
            bankId,
            amount: order.total,
        })

        success('Pago bancario creado', 4000, 'Se registró el pago en el banco seleccionado')
        await fetchOrders()
    } catch (err: any) {
        error('Error al crear pago', err.message || 'No se pudo crear el pago bancario')
    }
}

const handleAssignDeliveryModalClose = () => {
    clearPendingStatusChange()
    showAssignDeliveryModal.value = false
}

const quickBanks = computed(() => {
    const items = banksStore.list?.items || []
    return items
        .filter(b => b.active)
        .sort((a, b) => a.id - b.id)
        .slice(0, 2)
})

// ===== ABONOS DE RESERVAS =====
const showDepositModal = ref(false)
const depositOrder = ref<{
    id: number
    customerName?: string
    guestName?: string
    total: number
    branchId: number
} | null>(null)

const handleOpenDeposit = (order: OrderListItem) => {
    depositOrder.value = {
        id: order.id,
        customerName: order.customerName ?? undefined,
        guestName: order.guestName ?? undefined,
        total: order.total,
        branchId: order.branchId,
    }
    showDepositModal.value = true
}

const handleDeposited = () => {
    success('Abono registrado', 3000, 'El abono fue registrado correctamente')
}

// ===== RESERVACIONES TAB =====
const reservations = ref<OrderListItem[]>([])
const resLoading = ref(false)
const resTotalCount = ref(0)
const resCurrentPage = ref(1)
const resPageSize = ref(10)
const resSortBy = ref('reservedFor')
const resSortOrder = ref<'asc' | 'desc'>('asc')
const resSearch = ref('')
const resStatus = ref<string | null>(null)
const resFrom = ref('')
const resTo = ref('')

const resStatusOptions = [
    { value: null, label: 'Activas (sin canceladas/entregadas)' },
    { value: '__all__', label: 'Todas' },
    { value: 'reservation', label: 'Reserva pendiente' },
    { value: 'taken', label: 'Tomada' },
    { value: 'inPreparation', label: 'En preparación' },
    { value: 'ready', label: 'Lista' },
    { value: 'delivered', label: 'Entregada' },
    { value: 'cancelled', label: 'Cancelada' },
]

const resTotalPages = computed(() => Math.ceil(resTotalCount.value / resPageSize.value))
const resVisiblePages = computed(() => {
    const pages: number[] = []
    const start = Math.max(1, resCurrentPage.value - 2)
    const end = Math.min(resTotalPages.value, resCurrentPage.value + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
})

const resFilteredItems = computed(() => {
    if (!resSearch.value.trim()) return reservations.value
    const q = resSearch.value.toLowerCase()
    return reservations.value.filter(o =>
        String(o.id).includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.guestName || '').toLowerCase().includes(q) ||
        (o.notes || '').toLowerCase().includes(q)
    )
})

const toIsoUtc = (dateStr: string, endOfDay = false): string => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (endOfDay) d.setHours(23, 59, 59, 999)
    return d.toISOString()
}

const fetchReservations = async () => {
    resLoading.value = true
    try {
        let statusPayload: string | undefined = undefined

        if (resStatus.value === null) {
            statusPayload = undefined
        } else if (resStatus.value === '__all__') {
            statusPayload = undefined
        } else {
            statusPayload = resStatus.value
        }

        const body: Record<string, any> = {
            type: 'reservation',
            page: resCurrentPage.value,
            pageSize: resPageSize.value,
            sortBy: resSortBy.value === 'createdAt' ? 'ReservedFor' : resSortBy.value,
            sortOrder: resSortOrder.value,
        }

        if (statusPayload) body.status = statusPayload
        if (resFrom.value) body.reservedFromDate = toIsoUtc(resFrom.value)
        if (resTo.value) body.reservedToDate = toIsoUtc(resTo.value, true)

        const response = await orderApi.searchOrders(body)

        let items = response.items
        if (resStatus.value === null) {
            items = items.filter((o: OrderListItem) => o.status !== 'delivered' && o.status !== 'cancelled')
        }

        reservations.value = items
        resTotalCount.value = resStatus.value === null ? items.length : response.totalCount
    } catch (err: any) {
        error('Error al cargar reservas', err.message)
    } finally {
        resLoading.value = false
    }
}

const resChangePage = (page: number) => {
    resCurrentPage.value = page
    fetchReservations()
}

const handleResSort = (field: string) => {
    if (resSortBy.value === field) {
        resSortOrder.value = resSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
        resSortBy.value = field
        resSortOrder.value = 'asc'
    }
    fetchReservations()
}

const handleResQuickBankTransfer = async (order: OrderListItem, bankId: number) => {
    try {
        if ((order.bankPayments && order.bankPayments.length > 0) || (order.appPayments && order.appPayments.length > 0)) {
            error('No se puede convertir', 'El pedido ya tiene pagos registrados')
            return
        }
        await bankPaymentApi.createBankPayment({ orderId: order.id, bankId, amount: order.total })
        success('Pago bancario creado', 4000, 'Se registró el pago en el banco seleccionado')
        await fetchReservations()
    } catch (err: any) {
        error('Error al crear pago', err.message || 'No se pudo crear el pago bancario')
    }
}

const clearResFilters = () => {
    resSearch.value = ''
    resStatus.value = null
    resFrom.value = ''
    resTo.value = ''
    resCurrentPage.value = 1
    fetchReservations()
}

const handleCancelReservation = async (order: OrderListItem) => {
    if (!confirm(`¿Cancelar la reserva #${order.id}?`)) return
    try {
        await orderApi.cancel(order.id, 'Cancelada manualmente')
        success('Reserva cancelada', 3000)
        await fetchReservations()
    } catch (err: any) {
        error('Error al cancelar', err.message || 'No se pudo cancelar la reserva')
    }
}

// Lifecycle
onMounted(async () => {
    await Promise.all([
        fetchOrders(),
        banksStore.fetch({ page: 1, pageSize: 10, active: true }),
    ])
})
</script>
