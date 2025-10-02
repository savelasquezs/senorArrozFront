<!-- src/views/CustomerDetail.vue -->
<template>
    <MainLayout>
        <div class="p-6">
            <!-- Loading State -->
            <BaseLoading v-if="store.isLoading" text="Cargando cliente..." />

            <!-- Access Denied -->
            <BaseAlert v-else-if="!canAccessCustomer" variant="danger" class="max-w-2xl">
                <ExclamationTriangleIcon class="w-5 h-5" />
                <div>
                    <h3 class="font-medium">Acceso Denegado</h3>
                    <p class="mt-1">No tienes permisos para ver este cliente.</p>
                </div>
            </BaseAlert>

            <!-- Customer Content -->
            <div v-else-if="customer" class="space-y-4">
                <!-- Customer Header -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-4 py-3 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <UserIcon class="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <h1 class="text-lg font-semibold text-gray-900">{{ customer.name }}</h1>
                                    <p class="text-xs text-gray-500">ID: {{ customer.id }}</p>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex space-x-1">
                                <BaseButton @click="openEditDialog" variant="secondary" size="sm" :icon="PencilIcon">
                                    Editar
                                </BaseButton>
                                <BaseButton
                                    v-if="authStore.user?.role === 'Superadmin' || authStore.user?.role === 'Admin'"
                                    @click="confirmDelete" variant="danger" size="sm" :icon="TrashIcon">
                                    Eliminar
                                </BaseButton>
                            </div>
                        </div>
                    </div>

                    <!-- Customer Info -->
                    <div class="px-4 py-3">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div class="flex items-center">
                                <PhoneIcon class="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Teléfono Principal</p>
                                    <p class="text-xs text-gray-600">{{ customer.phone1 }}</p>
                                </div>
                            </div>

                            <div v-if="customer.phone2" class="flex items-center">
                                <PhoneIcon class="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Teléfono Secundario</p>
                                    <p class="text-xs text-gray-600">{{ customer.phone2 }}</p>
                                </div>
                            </div>

                            <div class="flex items-center">
                                <BuildingOffice2Icon class="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                    <p class="text-xs font-medium text-gray-900">Sucursal</p>
                                    <p class="text-xs text-gray-600">{{ customer.branchName ||
                                        getBranchName(customer.branchId) }}</p>
                                </div>
                            </div>
                            <BaseCard>
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <CalendarIcon class="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div class="ml-2">
                                        <p class="text-xs font-medium text-gray-500">Fecha de Registro</p>
                                        <p class="text-xs font-semibold text-gray-900">{{ formatDate(customer.createdAt)
                                        }}</p>
                                    </div>
                                </div>
                            </BaseCard>

                            <BaseCard>
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <CalendarIcon class="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div class="ml-2">
                                        <p class="text-xs font-medium text-gray-500">Último Pedido</p>
                                        <p class="text-xs font-semibold text-gray-900">
                                            {{ customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Nunca' }}
                                        </p>
                                    </div>
                                </div>
                            </BaseCard>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <MapPinIcon class="w-5 h-5 text-green-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Direcciones</p>
                                <p class="text-lg font-semibold text-gray-900">{{ customer.addresses?.length || 0 }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <HomeIcon class="w-5 h-5 text-blue-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Principal</p>
                                <p class="text-xs font-semibold text-gray-900">
                                    {{ primaryAddress ? 'Sí' : 'No' }}
                                </p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <CalendarIcon class="w-5 h-5 text-purple-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Pedidos</p>
                                <p class="text-lg font-semibold text-gray-900">{{ customer.totalOrders || 0 }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <CheckCircleIcon class="w-5 h-5 text-orange-600" />
                            </div>
                            <div class="ml-2">
                                <p class="text-xs font-medium text-gray-500">Estado</p>
                                <BaseBadge :variant="customer.active ? 'success' : 'danger'" size="sm">
                                    {{ customer.active ? 'Activo' : 'Inactivo' }}
                                </BaseBadge>
                            </div>
                        </div>
                    </BaseCard>
                </div>

                <!-- Additional Info Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">

                </div>

                <!-- Addresses Section -->
                <BaseCard>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-semibold text-gray-900">
                                Direcciones
                                <span class="text-xs font-normal text-gray-500">
                                    ({{ customer.addresses?.length || 0 }})
                                </span>
                            </h3>
                            <BaseButton @click="openAddressDialog" variant="primary" size="sm" :icon="PlusIcon">
                                Nueva Dirección
                            </BaseButton>
                        </div>

                        <div v-if="!customer.addresses || customer.addresses.length === 0" class="text-center py-6">
                            <MapPinIcon class="mx-auto h-8 w-8 text-gray-400" />
                            <p class="mt-2 text-sm font-medium text-gray-900">No hay direcciones</p>
                            <p class="text-xs text-gray-500">Este cliente no tiene direcciones registradas</p>
                        </div>

                        <div v-else class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Dirección
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Barrio
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Coordenadas
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tarifa
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Principal
                                        </th>
                                        <th
                                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-for="address in customer.addresses" :key="address.id"
                                        class="hover:bg-gray-50">
                                        <td class="px-6 py-4">
                                            <div class="text-sm font-medium text-gray-900">{{ address.address }}</div>
                                            <div v-if="address.additionalInfo" class="text-sm text-gray-500">
                                                {{ address.additionalInfo }}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ address.neighborhoodName || getNeighborhoodName(address.neighborhoodId)
                                            }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ address?.latitude?.toFixed(6) }}, {{ address?.longitude?.toFixed(6) }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            ${{ address.deliveryFee?.toLocaleString() || '0' }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <BaseBadge v-if="address.isPrimary" variant="success">
                                                Principal
                                            </BaseBadge>
                                            <span v-else class="text-sm text-gray-400">-</span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div class="flex justify-end space-x-2">
                                                <BaseButton @click="openEditAddressDialog(address)" variant="outline"
                                                    size="sm" :icon="PencilIcon" title="Editar dirección">
                                                    Editar
                                                </BaseButton>
                                                <BaseButton @click="deleteAddress(address)" variant="outline" size="sm"
                                                    :icon="TrashIcon" title="Eliminar dirección"
                                                    class="text-red-600 hover:text-red-700">
                                                    Eliminar
                                                </BaseButton>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </BaseCard>
            </div>

            <!-- Edit Customer Dialog -->
            <BaseDialog v-model="showEditDialog" title="Editar Cliente" :icon="PencilIcon" size="lg">
                <CustomerForm :customer="customer" :loading="store.isLoading"
                    :can-select-branch="authStore.user?.role === 'Superadmin'" @submit="handleEditSubmit"
                    @cancel="showEditDialog = false" />
            </BaseDialog>

            <!-- Create/Edit Address Dialog -->
            <BaseDialog v-model="showAddressDialog" :title="editingAddress ? 'Editar Dirección' : 'Nueva Dirección'"
                :icon="MapPinIcon" size="lg">
                <CustomerAddressForm :address="editingAddress" :customer-id="customerId" :loading="store.isLoading"
                    :branch-id="customer?.branchId" v-model="addressFormData" @submit="handleAddressSubmit"
                    @cancel="showAddressDialog = false" />
            </BaseDialog>

            <!-- Delete Confirmation Dialog -->
            <BaseDialog v-model="showDeleteDialog" title="Confirmar Eliminación" :icon="ExclamationTriangleIcon"
                icon-variant="danger" size="md">
                <div class="text-center">
                    <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-600" />
                    <div class="mt-3">
                        <h3 class="text-lg font-medium text-gray-900">Eliminar Cliente</h3>
                        <div class="mt-2">
                            <p class="text-sm text-gray-500">
                                ¿Estás seguro de que deseas eliminar al cliente
                                <strong>{{ customer?.name }}</strong>?
                            </p>
                            <p class="text-sm text-red-600 mt-2">
                                Esta acción no se puede deshacer y eliminará todos los datos asociados.
                            </p>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <BaseButton @click="showDeleteDialog = false" variant="secondary">
                        Cancelar
                    </BaseButton>
                    <BaseButton @click="handleDelete" variant="danger" :loading="store.isLoading">
                        Eliminar Cliente
                    </BaseButton>
                </template>
            </BaseDialog>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomersStore } from '@/store/customers'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import CustomerForm from '@/components/CustomerForm.vue'
import CustomerAddressForm from '@/components/CustomerAddressForm.vue'
import {
    UserIcon,
    PencilIcon,
    TrashIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    MapPinIcon,
    HomeIcon,
    CalendarIcon,
    CheckCircleIcon,
    PlusIcon,
    ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import type { CustomerAddress, CustomerFormData, CustomerAddressFormData } from '@/types/customer'

const route = useRoute()
const router = useRouter()
const store = useCustomersStore()
const branchesStore = useBranchesStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

// Reactive state
const showEditDialog = ref(false)
const showAddressDialog = ref(false)
const showDeleteDialog = ref(false)
const editingAddress = ref<CustomerAddress | null>(null)
const addressFormData = ref<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: 0,
    longitude: 0,
    isPrimary: true,
    deliveryFee: 0
})

const customerId = computed(() => Number(route.params.id))
const customer = computed(() => store.current)

const canAccessCustomer = computed(() => {
    if (!customer.value) return false

    const userRole = authStore.user?.role
    const userBranchId = authStore.user?.branchId

    // Superadmin can access all customers
    if (userRole === 'Superadmin') return true

    // Admin and Cashier can only access customers from their own branch
    if (userRole === 'Admin' || userRole === 'Cashier') return userBranchId === customer.value.branchId

    return false
})

const primaryAddress = computed(() => {
    return customer.value?.addresses?.find(addr => addr.isPrimary)
})

const getBranchName = (branchId: number) => {
    const branch = branchesStore.list?.items?.find(b => b.id === branchId)
    return branch?.name || 'Sucursal no encontrada'
}

const getNeighborhoodName = (neighborhoodId: number) => {
    const neighborhood = store.availableNeighborhoods.find(n => n.id === neighborhoodId)
    return neighborhood?.name || 'Barrio no encontrado'
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

// Actions
const openEditDialog = () => {
    showEditDialog.value = true
}

const openAddressDialog = () => {
    editingAddress.value = null
    // Reset form data for new address
    addressFormData.value = {
        neighborhoodId: 0,
        address: '',
        additionalInfo: '',
        latitude: 0,
        longitude: 0,
        isPrimary: true,
        deliveryFee: 0
    }
    showAddressDialog.value = true
}

const openEditAddressDialog = (address: CustomerAddress) => {
    editingAddress.value = address
    // Populate form data for editing
    addressFormData.value = {
        neighborhoodId: address.neighborhoodId,
        address: address.address,
        additionalInfo: address.additionalInfo || '',
        latitude: address.latitude || 0,
        longitude: address.longitude || 0,
        isPrimary: address.isPrimary,
        deliveryFee: address.deliveryFee
    }
    showAddressDialog.value = true
}

const confirmDelete = () => {
    showDeleteDialog.value = true
}

const handleEditSubmit = async (formData: CustomerFormData) => {
    try {
        await store.update(customerId.value, {
            name: formData.name,
            phone1: formData.phone1,
            phone2: formData.phone2
        })
        showEditDialog.value = false
        success('Cliente actualizado', 5000, 'El cliente se ha actualizado correctamente')
    } catch (error: any) {
        console.error('Error updating customer:', error)
        showError('Error al actualizar', error.message || 'No se pudo actualizar el cliente')
    }
}

const handleAddressSubmit = async (formData: CustomerAddressFormData) => {
    try {
        if (editingAddress.value) {
            // Update existing address
            await store.updateAddress(customerId.value, editingAddress.value.id, formData)
            // Update the address in the customer's addresses array
            if (customer.value?.addresses) {
                const index = customer.value.addresses.findIndex(addr => addr.id === editingAddress.value!.id)
                if (index !== -1) {
                    customer.value.addresses[index] = {
                        ...customer.value.addresses[index],
                        ...formData
                    }
                }
            }
            success('Dirección actualizada', 5000, 'La dirección se ha actualizado correctamente')
        } else {
            // Create new address
            const newAddress = await store.createAddress(customerId.value, formData)
            // Add to customer's addresses array
            if (customer.value?.addresses) {
                customer.value.addresses.push(newAddress)
            } else if (customer.value) {
                customer.value.addresses = [newAddress]
            }
            success('Dirección creada', 5000, 'La dirección se ha creado correctamente')
        }
        showAddressDialog.value = false
        editingAddress.value = null
    } catch (error: any) {
        console.error('Error handling address:', error)
        showError('Error al guardar', error.message || 'No se pudo guardar la dirección')
    }
}

const deleteAddress = async (address: CustomerAddress) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar esta dirección?`)) {
        return
    }

    try {
        await store.removeAddress(customerId.value, address.id)
        // Remove from customer's addresses array
        if (customer.value?.addresses) {
            customer.value.addresses = customer.value.addresses.filter(addr => addr.id !== address.id)
        }
        success('Dirección eliminada', 5000, 'La dirección se ha eliminado correctamente')
    } catch (error: any) {
        console.error('Error deleting address:', error)
        showError('Error al eliminar', error.message || 'No se pudo eliminar la dirección')
    }
}

const handleDelete = async () => {
    try {
        await store.remove(customerId.value)
        showDeleteDialog.value = false
        success('Cliente eliminado', 5000, 'El cliente se ha eliminado correctamente')
        router.push('/customers')
    } catch (error: any) {
        console.error('Error deleting customer:', error)
        showError('Error al eliminar', error.message || 'No se pudo eliminar el cliente')
    }
}

// Lifecycle
onMounted(async () => {
    try {
        // Check if user has access before making API calls


        // Fetch customer details first to check access
        await store.fetchById(customerId.value)

        if (!canAccessCustomer.value) {
            return
        }



    } catch (error: any) {
        console.error('Error loading customer data:', error)
        showError("Error al cargar datos", error.message || "Error al cargar el cliente")
    }
})
</script>
