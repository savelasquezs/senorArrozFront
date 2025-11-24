<template>
    <div class="address-selector">
        <!-- Error Message -->
        <div v-if="errorMessage" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>

        <div class="space-y-3">
            <!-- Loading State -->
            <div v-if="isLoading" class="text-center py-4">
                <BaseLoading text="Cargando direcciones..." size="sm" />
            </div>

            <!-- No Customer Selected -->
            <div v-else-if="!customerId" class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPinIcon class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-500">Selecciona un cliente para ver sus direcciones</p>
            </div>

            <!-- No Addresses -->
            <div v-else-if="customerAddresses.length === 0"
                class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPinIcon class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-500 mb-3">Este cliente no tiene direcciones registradas</p>
                <BaseButton @click="showCreateAddress" variant="primary" size="sm">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Crear Dirección
                </BaseButton>
            </div>

            <!-- Address List -->
            <div v-else class="space-y-2">
                <!-- Selected Address (when one is selected) -->
                <div v-if="selectedAddress && !showAddressSelection"
                    class="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <MapPinIcon class="w-6 h-6 text-green-600 mr-3" />
                            <div>
                                <div class="text-sm font-medium flex items-center">
                                    {{ selectedAddress.address }}

                                </div>
                                <div v-if="selectedAddress.additionalInfo" class="text-xs text-green-600">
                                    {{ selectedAddress.additionalInfo }}
                                </div>
                                <div class="text-xs text-green-600">
                                    {{ selectedAddress.neighborhoodName }}
                                </div>
                                <div class="text-xs text-green-600">
                                    Costo envío: {{ formatCurrency(selectedAddress.deliveryFee) }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-center items-center gap-2">
                        <!-- Change Address Button -->
                        <BaseButton @click="showAddressSelection = true" variant="outline" size="sm"
                            class="text-blue-600 hover:text-blue-700" v-if="customerAddresses.length > 1">
                            <span class="flex items-center">
                                <ArrowsRightLeftIcon class="w-4 h-4 mr-1" />

                            </span>
                        </BaseButton>
                        <!-- Edit Address Button -->
                        <BaseButton @click="editAddress(selectedAddress)" variant="outline" size="sm"
                            class="text-orange-600 hover:text-orange-700">
                            <span class="flex items-center">
                                <PencilIcon class="w-4 h-4 mr-1" />

                            </span>
                        </BaseButton>
                        <!-- Clear Address Button -->
                        <BaseButton @click="clearAddress" variant="outline" size="sm"
                            class="text-red-600 hover:text-red-700">
                            <XMarkIcon class="w-4 h-4" />
                        </BaseButton>
                    </div>
                </div>

                <!-- Address Selection Grid (when showing selection) -->
                <div v-if="showAddressSelection || !selectedAddress" class="space-y-3">
                    <div v-if="showAddressSelection && selectedAddress" class="flex items-center justify-between mb-2">
                        <h4 class="text-sm font-medium text-gray-700">Selecciona una dirección:</h4>
                        <BaseButton @click="showAddressSelection = false" variant="ghost" size="sm">
                            Cancelar
                        </BaseButton>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div v-for="address in customerAddresses" :key="address.id" @click="selectAddress(address)"
                            :class="[
                                'p-3 border rounded-lg cursor-pointer transition-colors',
                                selectedAddress?.id === address.id
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                            ]">
                            <div class="flex items-start">
                                <MapPinIcon class="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-medium flex items-center">
                                        {{ address.address }}
                                        <BaseBadge v-if="address.isPrimary" type="success" size="sm"
                                            class="ml-2 flex-shrink-0">
                                            Principal
                                        </BaseBadge>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        {{ address.neighborhoodName }}
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        {{ formatCurrency(address.deliveryFee) }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Create New Address Button -->
                    <div class="pt-2 border-t border-gray-200">
                        <BaseButton @click="showCreateAddress" variant="outline" size="sm" class="w-full">
                            <PlusIcon class="w-4 h-4 mr-2" />
                            Nueva Dirección
                        </BaseButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Address Modal -->
        <BaseDialog v-model="showCreateModal" title="Agregar Nueva Dirección" size="lg">
            <CustomerAddressForm v-model="addressFormData" @submit="createAddress" @cancel="closeCreateModal" />
        </BaseDialog>

        <!-- Edit Address Modal -->
        <BaseDialog v-model="showEditModal" title="Editar Dirección" size="lg">
            <CustomerAddressForm v-if="editingAddress" v-model="editFormData" :addressId="editingAddress.id"
                @submit="updateAddress" @cancel="closeEditModal" />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useAuthStore } from '@/store/auth'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrdersDataStore } from '@/store/ordersData'
import { useToast } from '@/composables/useToast'
import type { CustomerAddress, CreateCustomerAddressDto, CustomerAddressFormData, UpdateCustomerAddressDto } from '@/types/customer'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerAddressForm from '@/components/customers/address/CustomerAddressForm.vue'

// Icons
import {
    MapPinIcon,
    PlusIcon,
    XMarkIcon,
    PencilIcon,
    ArrowsRightLeftIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    customerId?: number
    selectedAddress?: number
    mode?: 'draft' | 'persisted'
}

const props = withDefaults(defineProps<Props>(), {
    customerId: undefined,
    selectedAddress: undefined,
    mode: 'draft'
})

// Emits
const emit = defineEmits<{
    addressSelected: [address: CustomerAddress | undefined]
}>()

// Composables
const customersStore = useCustomersStore()
const authStore = useAuthStore()
const draftStore = useOrdersDraftsStore()
const dataStore = useOrdersDataStore()
const { success, error: showError } = useToast()

// State
const customerAddresses = ref<CustomerAddress[]>([])
const isLoading = ref(false)
const showCreateModal = ref(false)
const isCreating = ref(false)
const showEditModal = ref(false)
const isEditing = ref(false)
const showAddressSelection = ref(false)
const editingAddress = ref<CustomerAddress | null>(null)

const addressFormData = ref<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: undefined,
    longitude: undefined,
    isPrimary: true,
    deliveryFee: 0
})

const editFormData = ref<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: undefined,
    longitude: undefined,
    isPrimary: false,
    deliveryFee: 0
})


const selectedAddress = computed(() => {
    if (!props.selectedAddress || !customerAddresses.value) return null
    return customerAddresses.value.find(a => a.id === props.selectedAddress) || null
})

// Validación uniforme para ambos modos
const canSave = computed(() => {
    // Si no hay customerId, no se puede guardar
    if (!props.customerId) return false

    // Obtener el tipo de pedido según el modo
    const orderType = props.mode === 'draft'
        ? draftStore?.currentOrder?.type
        : dataStore?.current?.type

    // Si es delivery o reservation, debe tener dirección
    if ((orderType === 'delivery' || orderType === 'reservation') && !selectedAddress.value) {
        return false
    }

    return true
})

// Mostrar error si intenta guardar sin dirección
const errorMessage = computed(() => {
    const orderType = props.mode === 'draft'
        ? draftStore?.currentOrder?.type
        : dataStore?.current?.type

    if ((orderType === 'delivery' || orderType === 'reservation') && !selectedAddress.value) {
        return 'Debe seleccionar una dirección para pedidos a domicilio o reservas'
    }

    return null
})

// Computed para obtener branchId del cliente
const branchId = computed(() => {


    return authStore.branchId
})

// Methods
const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

const loadCustomerAddresses = async () => {
    if (!props.customerId) {
        customerAddresses.value = []
        return
    }

    isLoading.value = true
    try {
        await customersStore.fetchAddresses(props.customerId)
        customerAddresses.value = customersStore.addresses || []

        // Auto-seleccionar solo en modo draft
        if (props.mode === 'draft' && customerAddresses.value.length > 0 && !props.selectedAddress) {
            // Buscar dirección principal o tomar la primera
            const primaryAddress = customerAddresses.value.find(addr => addr.isPrimary)
            const addressToSelect = primaryAddress || customerAddresses.value[0]
            emit('addressSelected', addressToSelect)
        }
    } catch (error) {
        console.error('Error loading addresses:', error)
        customerAddresses.value = []
    } finally {
        isLoading.value = false
    }
}

const selectAddress = (address: CustomerAddress) => {
    emit('addressSelected', address)
    showAddressSelection.value = false // Close selection after choosing
    console.log('Address selected:', address)

}

const clearAddress = () => {
    emit('addressSelected', undefined)
}

const showCreateAddress = () => {
    // Reset form data
    addressFormData.value = {
        neighborhoodId: 0,
        address: '',
        additionalInfo: '',
        latitude: undefined,
        longitude: undefined,
        isPrimary: true,
        deliveryFee: 0
    }
    showCreateModal.value = true
}

const createAddress = async (addressData: CreateCustomerAddressDto) => {
    if (!props.customerId) return

    isCreating.value = true
    try {
        const address = await customersStore.createAddress(props.customerId, addressData)

        // Refresh addresses list
        await loadCustomerAddresses()

        // Auto-select created address - emit el objeto completo
        emit('addressSelected', address)

        success('Dirección creada', 3000, 'La dirección ha sido creada correctamente')
    } catch (error: any) {
        showError('Error al crear dirección', error.message || 'No se pudo crear la dirección')
    } finally {
        isCreating.value = false
        showCreateModal.value = false
    }
}

const closeCreateModal = () => {
    showCreateModal.value = false
}

const editAddress = (address: CustomerAddress) => {
    editingAddress.value = address
    // Populate edit form with current address data
    editFormData.value = {
        neighborhoodId: address.neighborhoodId,
        address: address.address,
        additionalInfo: address.additionalInfo || '',
        latitude: address.latitude,
        longitude: address.longitude,
        isPrimary: address.isPrimary,
        deliveryFee: address.deliveryFee || 0
    }
    showEditModal.value = true
}

const updateAddress = async (addressData: CustomerAddressFormData) => {
    if (!props.customerId || !editingAddress.value) return

    isEditing.value = true
    try {
        const updateData: UpdateCustomerAddressDto = {
            neighborhoodId: addressData.neighborhoodId,
            address: addressData.address,
            additionalInfo: addressData.additionalInfo,
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            isPrimary: addressData.isPrimary,
            deliveryFee: addressData.deliveryFee
        }

        await customersStore.updateAddress(props.customerId, editingAddress.value.id, updateData)

        // Refresh addresses list
        await loadCustomerAddresses()

        // Update selected address if it was the one being edited
        if (selectedAddress.value?.id === editingAddress.value.id) {
            // The address is still selected, but now updated
            const updatedAddress = customerAddresses.value.find(a => a.id === editingAddress.value!.id)
            if (updatedAddress) {
                emit('addressSelected', updatedAddress)
            }
        }

        success('Dirección actualizada', 3000, 'La dirección ha sido actualizada correctamente')
    } catch (error: any) {
        showError('Error al actualizar dirección', error.message || 'No se pudo actualizar la dirección')
    } finally {
        isEditing.value = false
        showEditModal.value = false
        editingAddress.value = null
    }
}

const closeEditModal = () => {
    showEditModal.value = false
    editingAddress.value = null
}

// Watch for customer changes
watch(() => props.customerId, (newCustomerId) => {
    if (newCustomerId) {
        loadCustomerAddresses()
    } else {
        customerAddresses.value = []
        emit('addressSelected', undefined)
    }
    // Reset selection state when customer changes
    showAddressSelection.value = false
}, { immediate: true })
</script>

<style scoped>
/* Custom styles if needed */
</style>