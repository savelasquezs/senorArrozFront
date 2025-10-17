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

        <!-- Filtros -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Búsqueda general -->
                <div class="lg:col-span-2">
                    <BaseInput v-model="filters.search" placeholder="Buscar por ID, cliente, teléfono..."
                        @input="applyFilters">
                        <template #icon>
                            <MagnifyingGlassIcon class="w-4 h-4" />
                        </template>
                    </BaseInput>
                </div>

                <!-- Filtro de tipo -->
                <BaseSelect v-model="filters.type" :options="typeOptions" placeholder="Todos los tipos"
                    label="Tipo de pedido" @update:model-value="applyFilters" />

                <!-- Filtro de estado -->
                <BaseSelect v-model="filters.status" :options="statusOptions" placeholder="Todos los estados"
                    label="Estado" @update:model-value="applyFilters" />

                <!-- Rango de fechas -->
                <div class="lg:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Rango de fechas
                    </label>
                    <div class="grid grid-cols-2 gap-2">
                        <BaseInput v-model="dateFilters.fromDate" type="date" placeholder="Desde"
                            @change="fetchOrders" />
                        <BaseInput v-model="dateFilters.toDate" type="date" placeholder="Hasta" @change="fetchOrders" />
                    </div>
                </div>

                <!-- Botón refrescar -->
                <div class="flex items-end">
                    <BaseButton variant="secondary" class="w-full" :loading="loading" @click="fetchOrders">
                        <ArrowPathIcon class="w-4 h-4 mr-2" />
                        Refrescar
                    </BaseButton>
                </div>
            </div>

            <!-- Contador de resultados -->
            <div v-if="!loading && filteredOrders.length > 0" class="mt-4 text-sm text-gray-600">
                Mostrando {{ filteredOrders.length }} de {{ totalCount }} pedidos
                <button v-if="hasActiveFilters" class="ml-2 text-emerald-600 hover:text-emerald-700 underline"
                    @click="clearFilters">
                    Limpiar filtros
                </button>
            </div>
        </div>

        <!-- Tabla -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <OrdersTable :orders="filteredOrders" :loading="loading" :sort-by="sortBy" :sort-order="sortOrder"
                @edit-customer="handleEditCustomer" @edit-address="handleEditAddress"
                @change-status="handleChangeStatus" @assign-delivery="handleAssignDelivery" @sort="handleSort" />

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

        <!-- Modales -->
        <EditCustomerModal v-if="selectedOrder" :open="showEditCustomerModal" :order="selectedOrder"
            @close="showEditCustomerModal = false" @updated="handleOrderUpdated" />

        <SelectAddressModal v-if="selectedOrder" :open="showSelectAddressModal" :order="selectedOrder"
            @close="showSelectAddressModal = false" @updated="handleOrderUpdated" />

        <AssignDeliveryModal v-if="selectedOrder" :open="showAssignDeliveryModal" :order="selectedOrder"
            @close="showAssignDeliveryModal = false" @updated="handleOrderUpdated" />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { OrderListItem } from '@/types/order'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useOrderFilters, type OrderFilterState } from '@/composables/useOrderFilters'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { useToast } from '@/composables/useToast'
import MainLayout from '@/components/layout/MainLayout.vue'
import OrdersTable from '@/components/orders/OrdersTable.vue'
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue'
import SelectAddressModal from '@/components/orders/SelectAddressModal.vue'
import AssignDeliveryModal from '@/components/orders/AssignDeliveryModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { applyAllFilters, sortOrders } = useOrderFilters()
const { getNextAllowedStatus, canChangeStatus } = useOrderPermissions()
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
})

const dateFilters = ref({
    fromDate: new Date().toISOString().split('T')[0], // Hoy por defecto
    toDate: '',
})

// Modales
const showEditCustomerModal = ref(false)
const showSelectAddressModal = ref(false)
const showAssignDeliveryModal = ref(false)
const selectedOrder = ref<OrderListItem | null>(null)

// Opciones de filtros
const typeOptions = [
    { value: null, label: 'Todos los tipos' },
    { value: 'onsite', label: 'En el local' },
    { value: 'delivery', label: 'Domicilio' },
    { value: 'reservation', label: 'Reserva' },
]

const statusOptions = [
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
    return (
        filters.value.search ||
        filters.value.type ||
        filters.value.status ||
        filters.value.customer ||
        filters.value.deliveryman
    )
})

// Métodos
const fetchOrders = async () => {
    loading.value = true
    try {
        const response = await orderApi.fetchList({
            fromDate: dateFilters.value.fromDate,
            toDate: dateFilters.value.toDate || undefined,
            page: currentPage.value,
            pageSize: pageSize.value,
        })

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
    }
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
    const nextStatus = getNextAllowedStatus(order.status)

    if (!nextStatus) {
        error('No se puede cambiar el estado', 'Este pedido ya no puede avanzar más')
        return
    }

    if (!canChangeStatus(order, nextStatus)) {
        error('Sin permisos', 'No tienes permiso para cambiar el estado de este pedido')
        return
    }

    try {
        await orderApi.updateStatus(order.id, nextStatus)
        success('Estado actualizado', 5000, `Pedido cambiado a ${nextStatus}`)
        await fetchOrders()
    } catch (err: any) {
        error('Error al cambiar estado', err.message)
    }
}

const handleAssignDelivery = (order: OrderListItem) => {
    selectedOrder.value = order
    showAssignDeliveryModal.value = true
}

const handleOrderUpdated = () => {
    fetchOrders()
}

const navigateToNewOrder = () => {
    router.push('/orders/new')
}

// Lifecycle
onMounted(() => {
    fetchOrders()
})
</script>
