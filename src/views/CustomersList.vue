<!-- src/views/CustomersList.vue -->
<template>
    <MainLayout page-title="Clientes">
        <!-- Loading State -->
        <BaseLoading v-if="store.isLoading" text="Cargando clientes..." />

        <!-- Content -->
        <div v-else class="space-y-6">
            <!-- Filters Card -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Filtros de búsqueda</h3>
                    <BaseButton @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                        Limpiar filtros
                    </BaseButton>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <BaseInput v-model="filters.name" label="Nombre" placeholder="Buscar por nombre"
                        :icon="MagnifyingGlassIcon" />
                    <BaseInput v-model="filters.phone" label="Teléfono" placeholder="Buscar por teléfono"
                        :icon="PhoneIcon" />
                    <BaseSelect v-model="filters.active" :options="statusOptions" label="Estado"
                        placeholder="Todos los estados" value-key="value" display-key="label" />
                    <BaseSelect v-if="auth.isSuperadmin" v-model="filters.branchId" :options="branchOptions"
                        label="Sucursal" placeholder="Todas las sucursales" value-key="value" display-key="label" />
                    <div class="flex items-end">
                        <BaseButton @click="load" variant="primary" size="md" :icon="MagnifyingGlassIcon" full-width>
                            Buscar
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard title="Total Clientes" :value="store.list?.totalCount || 0" icon="users" />
                <StatsCard title="Clientes Activos" :value="activeCustomers" icon="users" />
                <StatsCard title="Clientes Inactivos" :value="inactiveCustomers" icon="users" />
                <StatsCard title="Con Direcciones" :value="customersWithAddresses" icon="clipboard" />
            </div>

            <!-- Customers Table -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold text-gray-900">
                        Lista de Clientes
                        <span class="text-sm font-normal text-gray-500">
                            ({{ store.list?.items?.length || 0 }} de {{ store.list?.totalCount || 0 }})
                        </span>
                    </h3>

                    <BaseButton @click="openCreate" variant="primary" size="sm" :icon="PlusIcon">
                        Nuevo Cliente
                    </BaseButton>
                </div>

                <div class="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contacto
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sucursal
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Direcciones
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pedidos
                                </th>
                                <th
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th
                                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-if="(store.list?.items?.length || 0) === 0">
                                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                                    <UserGroupIcon class="mx-auto h-12 w-12 text-gray-400" />
                                    <p class="mt-2 text-lg font-medium">No hay clientes</p>
                                    <p class="text-sm">No se encontraron clientes con los filtros aplicados</p>
                                </td>
                            </tr>

                            <tr v-for="customer in store.list?.items || []" :key="customer.id" class="hover:bg-gray-50">
                                <!-- Customer Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0 h-10 w-10">
                                            <div
                                                class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <UserIcon class="h-5 w-5 text-blue-600" />
                                            </div>
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-medium text-gray-900">
                                                {{ customer.name }}
                                            </div>
                                            <div class="text-sm text-gray-500">
                                                ID: {{ customer.id }}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- Contact Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <PhoneIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ customer.phone1 }}
                                        </div>
                                        <div v-if="customer.phone2" class="flex items-center mt-1">
                                            <PhoneIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ customer.phone2 }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Branch Info -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <BuildingOffice2Icon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ customer.branchName || getBranchName(customer.branchId) }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Addresses Count -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <MapPinIcon class="h-4 w-4 text-gray-400 mr-1" />
                                            {{ customer.addresses?.length || 0 }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Orders Count -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        {{ customer.totalOrders || 0 }} pedido{{ (customer.totalOrders || 0) !== 1 ? 's'
                                            : '' }}
                                    </div>
                                    <div v-if="customer.lastOrderDate" class="text-xs text-gray-500">
                                        Último: {{ formatDate(customer.lastOrderDate) }}
                                    </div>
                                </td>

                                <!-- Status -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <BaseBadge :variant="customer.active ? 'success' : 'danger'">
                                        {{ customer.active ? 'Activo' : 'Inactivo' }}
                                    </BaseBadge>
                                </td>

                                <!-- Actions -->
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div class="flex justify-end space-x-2">
                                        <BaseButton @click="goDetail(customer.id)" variant="outline" size="sm"
                                            :icon="EyeIcon" title="Ver detalles">
                                            Ver
                                        </BaseButton>
                                        <BaseButton @click="openEdit(customer)" variant="outline" size="sm"
                                            :icon="PencilIcon" title="Editar cliente">
                                            Editar
                                        </BaseButton>

                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div v-if="store.list && store.list.totalPages > 1" class="flex items-center justify-between mt-6">
                    <div class="text-sm text-gray-700">
                        Mostrando {{ ((store.list.page - 1) * store.list.pageSize) + 1 }} a
                        {{ Math.min(store.list.page * store.list.pageSize, store.list.totalCount) }} de
                        {{ store.list.totalCount }} resultados
                    </div>
                    <div class="flex space-x-2">
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasPreviousPage"
                            @click="previousPage" :icon="ChevronLeftIcon">
                            Anterior
                        </BaseButton>
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasNextPage" @click="nextPage"
                            :right-icon="ChevronRightIcon">
                            Siguiente
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>
        </div>

        <!-- Create/Edit Customer Dialog -->
        <BaseDialog v-model="showForm" :title="editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'" :icon="PlusIcon"
            size="lg">
            <CustomerForm :customer="editingCustomer" :loading="formLoading" :can-select-branch="auth.isSuperadmin"
                @submit="handleFormSubmit" @cancel="showForm = false" />
        </BaseDialog>
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'

import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'

import {
    UserGroupIcon,
    UserIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    MapPinIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,

    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

import type { Customer, CustomerFilters, CustomerFormData } from '@/types/customer'

const store = useCustomersStore()
const branchesStore = useBranchesStore()
const auth = useAuthStore()
const router = useRouter()
const { success, error: showError } = useToast()

// Filters
const filters = ref({
    name: '',
    phone: '',
    active: undefined as boolean | undefined,
    branchId: undefined as number | undefined,
    page: 1,
    pageSize: 10
})

// Form dialog
const showForm = ref(false)
const editingCustomer = ref<Customer | null>(null)
const formLoading = ref(false)

// Status options
const statusOptions = [
    { value: undefined, label: 'Todos los estados' },
    { value: true, label: 'Activos' },
    { value: false, label: 'Inactivos' }
]

// Branch options
const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return [
        { value: undefined, label: 'Todas las sucursales' },
        ...branchesStore.list.items.map(branch => ({
            value: branch.id,
            label: branch.name
        }))
    ]
})

// Computed stats
const activeCustomers = computed(() => {
    return store.list?.items?.filter(c => c.active).length || 0
})

const inactiveCustomers = computed(() => {
    return store.list?.items?.filter(c => !c.active).length || 0
})

const customersWithAddresses = computed(() => {
    return store.list?.items?.filter(c => c.addresses && c.addresses.length > 0).length || 0
})

// Methods
const getBranchName = (branchId: number) => {
    // Para superadmin: buscar en la lista de sucursales
    if (auth.isSuperadmin) {
        const branch = branchesStore.list?.items?.find(b => b.id === branchId)
        return branch?.name || 'Sucursal no encontrada'
    }

    // Para usuarios no superadmin: usar la sucursal actual
    if (branchesStore.current && branchesStore.current.id === branchId) {
        return branchesStore.current.name
    }

    return 'Sucursal no encontrada'
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`
    if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`

    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

const load = async () => {
    try {
        const filtersToSend: CustomerFilters = {
            name: filters.value.name || undefined,
            phone: filters.value.phone || undefined,
            active: filters.value.active,
            branchId: auth.isSuperadmin ? filters.value.branchId : (auth.branchId || undefined),
            page: filters.value.page || 1,
            pageSize: filters.value.pageSize || 10
        }

        await store.fetch(filtersToSend)
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los clientes')
    }
}

const clearFilters = async () => {
    filters.value = {
        name: '',
        phone: '',
        active: undefined,
        branchId: auth.isSuperadmin ? undefined : (auth.branchId || undefined),
        page: 1,
        pageSize: 10
    }
    await load()
}

const goDetail = (id: number) => router.push({ name: 'CustomerDetail', params: { id } })

const openCreate = () => {
    editingCustomer.value = null
    showForm.value = true
}

const openEdit = (customer: Customer) => {
    editingCustomer.value = customer
    showForm.value = true
}

const handleFormSubmit = async (data: CustomerFormData) => {
    try {
        formLoading.value = true

        if (editingCustomer.value) {
            await store.update(editingCustomer.value.id, {
                name: data.name,
                phone1: data.phone1,
                phone2: data.phone2,
                active: data.active
            })
            success('Cliente actualizado', 3000, `El cliente "${data.name}" se ha actualizado correctamente`)
        } else {
            // Para crear, necesitamos asegurarnos de que initialAddress existe
            if (!data.initialAddress) {
                showError('Error de validación', 'Se requiere una dirección inicial para crear el cliente')
                return
            }

            await store.create({
                name: data.name,
                phone1: data.phone1,
                phone2: data.phone2,
                branchId: data.branchId,
                initialAddress: {
                    neighborhoodId: data.initialAddress.neighborhoodId,
                    address: data.initialAddress.address,
                    additionalInfo: data.initialAddress.additionalInfo,
                    latitude: data.initialAddress.latitude ?? 0,
                    longitude: data.initialAddress.longitude ?? 0,
                    isPrimary: data.initialAddress.isPrimary ?? true,
                    deliveryFee: data.initialAddress.deliveryFee
                }
            })
            success('Cliente creado', 3000, `El cliente "${data.name}" se ha creado correctamente`)
        }

        showForm.value = false
        await load()
    } catch (e) {
        showError('Error al guardar', store.error || 'No se pudo guardar el cliente')
    } finally {
        formLoading.value = false
    }
}

const deleteCustomer = async (customer: Customer) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al cliente "${customer.name}"?`)) {
        return
    }

    try {
        await store.remove(customer.id)
        success('Cliente eliminado', 3000, `El cliente "${customer.name}" se ha eliminado correctamente`)
        await load()
    } catch (e) {
        showError('Error al eliminar', store.error || 'No se pudo eliminar el cliente')
    }
}

const previousPage = async () => {
    if (store.list?.hasPreviousPage) {
        filters.value.page = (filters.value.page || 1) - 1
        await load()
    }
}

const nextPage = async () => {
    if (store.list?.hasNextPage) {
        filters.value.page = (filters.value.page || 1) + 1
        await load()
    }
}

onMounted(async () => {
    try {

        // Initialize branch filter based on user role
        if (!auth.isSuperadmin && auth.branchId) {
            filters.value.branchId = auth.branchId
        }

        // Llamar directamente a getCustomers
        await load()
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los datos iniciales')
    }
})
</script>
