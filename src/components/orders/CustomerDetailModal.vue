<template>
    <BaseDialog v-model="internalShow" size="xl">
        <div class="customer-detail-modal">
            <!-- Modal Header -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <UserIcon class="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 class="text-xl font-semibold text-gray-900">
                            Detalle del Cliente
                        </h2>
                        <p class="text-sm text-gray-500">
                            Información completa del cliente seleccionado
                        </p>
                    </div>
                </div>
                <BaseButton @click="handleClose" variant="ghost" size="sm">
                    <XMarkIcon class="w-5 h-5" />
                </BaseButton>
            </div>

            <!-- Customer Content -->
            <div v-if="customer" class="space-y-6">
                <!-- Customer Header -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <UserIcon class="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">{{ customer.name }}</h3>
                                <div class="flex items-center gap-4 mt-1">
                                    <div class="flex items-center gap-1">
                                        <PhoneIcon class="w-4 h-4 text-gray-500" />
                                        <span class="text-sm text-gray-600">{{ customer.phone1 }}</span>
                                    </div>
                                    <div v-if="customer.phone2" class="flex items-center gap-1">
                                        <PhoneIcon class="w-4 h-4 text-gray-500" />
                                        <span class="text-sm text-gray-600">{{ customer.phone2 }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <BaseBadge :type="customer.active ? 'success' : 'danger'"
                            :text="customer.active ? 'Activo' : 'Inactivo'" size="sm" />
                    </div>
                </div>

                <!-- Customer Information Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Basic Information -->
                    <CustomerInfoCard :customer="customer" :show-actions="showActions" @edit="handleEditCustomer"
                        @toggle-status="handleToggleStatus" />

                    <!-- Order Statistics -->
                    <CustomerStatsCard :customer="customer" :show-actions="showActions" @view-orders="handleViewOrders"
                        @create-order="handleCreateOrder" />
                </div>

                <!-- Addresses Section -->
                <CustomerAddressesList :customer="customer" :show-actions="showActions" @add-address="handleAddAddress"
                    @edit-address="handleEditAddress" @set-primary="handleSetPrimary"
                    @delete-address="handleDeleteAddress" />
            </div>

            <!-- Loading State -->
            <div v-else-if="loading" class="text-center py-8">
                <BaseLoading text="Cargando información del cliente..." size="md" />
            </div>

            <!-- Error State -->
            <div v-else class="text-center py-8">
                <ExclamationTriangleIcon class="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p class="text-sm text-gray-500">No se pudo cargar la información del cliente</p>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <BaseButton @click="handleClose" variant="outline">
                    Cerrar
                </BaseButton>
            </div>
        </div>

        <!-- Address Form Modal -->
        <BaseDialog v-model="showAddressForm" size="lg">
            <div class="address-form-modal">
                <!-- Modal Header -->
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <MapPinIcon class="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 class="text-xl font-semibold text-gray-900">
                                {{ editingAddress ? 'Editar Dirección' : 'Nueva Dirección' }}
                            </h2>
                            <p class="text-sm text-gray-500">
                                {{ editingAddress ? 'Modifica dirección' : 'Agrega dirección' }}
                            </p>
                        </div>
                    </div>
                    <BaseButton @click="closeAddressForm" variant="ghost" size="sm">
                        <XMarkIcon class="w-5 h-5" />
                    </BaseButton>
                </div>

                <!-- Address Form -->
                <CustomerAddressForm v-if="customer" :customer-id="customer.id" :address="editingAddress"
                    :model-value="addressFormData" :loading="addressFormLoading" :branch-id="customer.branchId"
                    @submit="handleAddressSubmit" @cancel="closeAddressForm"
                    @update:model-value="updateAddressFormData" />
            </div>
        </BaseDialog>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import type { Customer, CustomerAddress, CustomerAddressFormData, CreateCustomerAddressDto, UpdateCustomerAddressDto } from '@/types/customer'
import { useToast } from '@/composables/useToast'
import { useCustomersStore } from '@/store/customers'

// Components
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

// Customer Components
import CustomerInfoCard from '@/components/customer/CustomerInfoCard.vue'
import CustomerStatsCard from '@/components/customer/CustomerStatsCard.vue'
import CustomerAddressesList from '@/components/customer/CustomerAddressesList.vue'
import CustomerAddressForm from '@/components/customer/CustomerAddressForm.vue'

// Icons
import {
    UserIcon,
    PhoneIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    MapPinIcon
} from '@heroicons/vue/24/outline'

interface Props {
    show: boolean
    customer?: Customer
    loading?: boolean
    showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    showActions: true
})

// Use props to avoid warning
const { show, customer, loading, showActions } = props

// Internal reactive state for modal visibility
const internalShow = ref(show)

// Watch for prop changes to sync internal state
watch(() => props.show, (newShow) => {
    internalShow.value = newShow
    if (newShow && customer) {
        // Load customer addresses when modal opens
        loadCustomerAddresses()
    }
}, { immediate: true })

// Watch for internal state changes to emit to parent
watch(internalShow, (newValue) => {
    if (!newValue) {
        handleClose()
    }
})

// State for address form modal
const showAddressForm = ref(false)
const editingAddress = ref<CustomerAddress | undefined>(undefined)
const addressFormLoading = ref(false)
const addressFormData = reactive<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: undefined,
    longitude: undefined,
    isPrimary: false,
    deliveryFee: 0
})

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'editCustomer', customer: Customer): void
}>()

// Composables
const { success, error: showError } = useToast()
const customersStore = useCustomersStore()

// Debug logs
console.log('CustomerDetailModal - props received:', { show, customer, loading, showActions })

// Methods
const handleClose = () => {
    console.log('CustomerDetailModal - handleClose called')
    emit('close')
}

const loadCustomerAddresses = async () => {
    if (!customer) return

    try {
        await customersStore.fetchAddresses(customer.id)
        console.log('CustomerDetailModal - Addresses loaded for customer:', customer.id)
    } catch (error) {
        console.error('CustomerDetailModal - Error loading addresses:', error)
    }
}

const handleEditCustomer = (customer: Customer) => {
    emit('editCustomer', customer)
}

const handleToggleStatus = (customer: Customer) => {
    // This would typically call an API to toggle customer status
    console.log('Toggle customer status:', customer.id)
    success('Estado actualizado', 2000, `Cliente ${customer.active ? 'desactivado' : 'activado'} correctamente`)
}

const handleViewOrders = (customer: Customer) => {
    // This would typically navigate to orders view filtered by customer
    console.log('View orders for customer:', customer.id)
    success('Funcionalidad de pedidos', 2000, 'La vista de pedidos estará disponible próximamente')
}

const handleCreateOrder = (customer: Customer) => {
    // This would typically create a new order for this customer
    console.log('Create order for customer:', customer.id)
    success('Nuevo pedido', 2000, 'Pedido creado para el cliente seleccionado')
}

const handleAddAddress = (customer: Customer) => {
    editingAddress.value = undefined
    resetAddressFormData()
    showAddressForm.value = true
    console.log('Add address for customer:', customer.id)
}

const handleEditAddress = (address: CustomerAddress) => {
    editingAddress.value = address
    populateAddressFormData(address)
    showAddressForm.value = true
    console.log('Edit address:', address.id)
}

const handleSetPrimary = async (address: CustomerAddress) => {
    if (!customer) return

    try {
        console.log("algo")
        await customersStore.setPrimaryAddress(customer.id, address.id)
        success('Dirección principal', 2000, 'Dirección establecida como principal')
    } catch (error: any) {
        showError('Error al establecer dirección principal', error.message || 'No se pudo establecer la dirección como principal')
    }
}

const handleDeleteAddress = (address: CustomerAddress) => {
    // This would typically call an API to delete address
    console.log('Delete address:', address.id)
    success('Dirección eliminada', 2000, 'Dirección eliminada correctamente')
}

// Address form methods
const closeAddressForm = () => {
    showAddressForm.value = false
    editingAddress.value = undefined
    resetAddressFormData()
}

const resetAddressFormData = () => {
    Object.assign(addressFormData, {
        neighborhoodId: 0,
        address: '',
        additionalInfo: '',
        latitude: undefined,
        longitude: undefined,
        isPrimary: false,
        deliveryFee: 0
    })
}

const populateAddressFormData = (address: CustomerAddress) => {
    Object.assign(addressFormData, {
        neighborhoodId: address.neighborhoodId,
        address: address.address,
        additionalInfo: address.additionalInfo || '',
        latitude: address.latitude,
        longitude: address.longitude,
        isPrimary: address.isPrimary,
        deliveryFee: address.deliveryFee || 0
    })
}

const updateAddressFormData = (data: CustomerAddressFormData) => {
    Object.assign(addressFormData, data)
}

const handleAddressSubmit = async (data: CustomerAddressFormData) => {
    if (!customer) return

    addressFormLoading.value = true

    try {
        if (editingAddress.value) {
            // Update existing address
            const updateData: UpdateCustomerAddressDto = {
                neighborhoodId: data.neighborhoodId,
                address: data.address,
                additionalInfo: data.additionalInfo,
                latitude: data.latitude,
                longitude: data.longitude,
                isPrimary: data.isPrimary,
                deliveryFee: data.deliveryFee
            }

            await customersStore.updateAddress(customer.id, editingAddress.value.id, updateData)

            // Refresh addresses to update local store
            await customersStore.fetchAddresses(customer.id)

            success('Dirección actualizada', 2000, 'La dirección ha sido actualizada correctamente')
        } else {
            // Create new address
            const createData: CreateCustomerAddressDto = {
                neighborhoodId: data.neighborhoodId,
                address: data.address,
                additionalInfo: data.additionalInfo,
                latitude: data.latitude,
                longitude: data.longitude,
                isPrimary: data.isPrimary,
                deliveryFee: data.deliveryFee
            }

            await customersStore.createAddress(customer.id, createData)

            // Refresh addresses to update local store
            await customersStore.fetchAddresses(customer.id)

            success('Dirección creada', 2000, 'La nueva dirección ha sido creada correctamente')
        }

        closeAddressForm()
    } catch (error: any) {
        showError('Error al guardar dirección', error.message || 'No se pudo guardar la dirección')
    } finally {
        addressFormLoading.value = false
    }
}
</script>

<style scoped>
.customer-detail-modal {
    max-height: 80vh;
    overflow-y: auto;
}

.address-form-modal {
    max-height: 90vh;
    overflow-y: auto;
}
</style>