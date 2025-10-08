<template>
    <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-900 flex items-center gap-2">
                <MapPinIcon class="w-4 h-4" />
                Direcciones Registradas ({{ customerAddresses.length }})
            </h4>
            <BaseButton @click="handleAddAddress" variant="primary" size="sm">
                <span class="flex items-center">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Agregar
                </span>
            </BaseButton>
        </div>

        <!-- Addresses List -->
        <div v-if="customerAddresses.length > 0" class="space-y-3">
            <CustomerAddressItem v-for="address in customerAddresses" :key="address.id" :address="address"
                :customer="customer" :show-actions="showActions" />
        </div>

        <!-- No Addresses -->
        <div v-else class="bg-gray-50 rounded-lg p-6 text-center">
            <MapPinIcon class="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-500 mb-3">Este cliente no tiene direcciones registradas</p>
            <BaseButton @click="handleAddAddress" variant="primary" size="sm">
                <span class="flex items-center">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Crear Primera Dirección
                </span>
            </BaseButton>
        </div>
    </div>

    <!-- Address Creation Modal -->
    <BaseDialog v-model="showCreateModal" size="lg">
        <div class="address-create-modal">
            <!-- Modal Header -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MapPinIcon class="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 class="text-xl font-semibold text-gray-900">
                            Nueva Dirección
                        </h2>
                        <p class="text-sm text-gray-500">
                            Agrega una nueva dirección para este cliente
                        </p>
                    </div>
                </div>
                <BaseButton @click="closeCreateModal" variant="ghost" size="sm">
                    <XMarkIcon class="w-5 h-5" />
                </BaseButton>
            </div>

            <!-- Address Form -->
            <CustomerAddressForm v-if="customer" :customer-id="customer.id" :model-value="addressFormData"
                :loading="createLoading" :branch-id="customer.branchId" @submit="handleAddressSubmit"
                @cancel="closeCreateModal" @update:model-value="updateAddressFormData" />
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import type { Customer, CustomerAddressFormData, CreateCustomerAddressDto } from '@/types/customer'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerAddressItem from '@/components/customer/CustomerAddressItem.vue'
import CustomerAddressForm from '@/components/customer/CustomerAddressForm.vue'

// Icons
import {
    MapPinIcon,
    PlusIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

interface Props {
    customer: Customer
    showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showActions: true
})

// State for create modal
const showCreateModal = ref(false)
const createLoading = ref(false)
const addressFormData = reactive<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: undefined,
    longitude: undefined,
    isPrimary: false,
    deliveryFee: 0
})

// Composables
const { success, error: showError } = useToast()
const customersStore = useCustomersStore()

// Computed
const customerAddresses = computed(() => {
    // Use addresses from store if available, otherwise fallback to customer.addresses
    return customersStore.addresses || props.customer.addresses || []
})

// Methods
const handleAddAddress = () => {
    resetAddressFormData()
    showCreateModal.value = true
}

const closeCreateModal = () => {
    showCreateModal.value = false
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

const updateAddressFormData = (data: CustomerAddressFormData) => {
    Object.assign(addressFormData, data)
}

const handleAddressSubmit = async (data: CustomerAddressFormData) => {
    createLoading.value = true

    try {
        const createData: CreateCustomerAddressDto = {
            neighborhoodId: data.neighborhoodId,
            address: data.address,
            additionalInfo: data.additionalInfo,
            latitude: data.latitude,
            longitude: data.longitude,
            isPrimary: data.isPrimary,
            deliveryFee: data.deliveryFee
        }

        await customersStore.createAddress(props.customer.id, createData)

        // Refresh addresses to update local store
        await customersStore.fetchAddresses(props.customer.id)

        success('Dirección creada', 2000, 'La nueva dirección ha sido creada correctamente')
        closeCreateModal()
    } catch (error: any) {
        showError('Error al crear dirección', error.message || 'No se pudo crear la dirección')
    } finally {
        createLoading.value = false
    }
}
</script>

<style scoped>
.address-create-modal {
    max-height: 90vh;
    overflow-y: auto;
}
</style>
