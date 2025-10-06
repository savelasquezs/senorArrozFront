<template>
    <div class="address-selector">
        <label class="block text-sm font-medium text-gray-700 mb-2">
            Dirección de Entrega
            <span class="text-red-500">*</span>
        </label>

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
                <!-- Selected Address -->
                <div v-if="selectedAddress" class="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <MapPinIcon class="w-6 h-6 text-green-600 mr-3" />
                            <div>
                                <div class="text-sm font-medium flex items-center">
                                    {{ selectedAddress.address }}
                                    <BaseBadge v-if="selectedAddress.isPrimary" type="success" size="sm" class="ml-2">
                                        Principal
                                    </BaseBadge>
                                </div>
                                <div class="text-xs text-green-600">
                                    {{ selectedAddress.neighborhoodName }}
                                </div>
                                <div class="text-xs text-green-600">
                                    Tel: {{ customer?.phone1 }}
                                </div>
                                <div class="text-xs text-green-600">
                                    Costo envío: {{ formatCurrency(selectedAddress.deliveryFee) }}
                                </div>
                            </div>
                        </div>
                        <BaseButton @click="clearAddress" variant="outline" size="sm"
                            class="text-red-600 hover:text-red-700">
                            <XMarkIcon class="w-3 h-3" />
                        </BaseButton>
                    </div>
                </div>

                <!-- Address Selection Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div v-for="address in customerAddresses" :key="address.id" @click="selectAddress(address)" :class="[
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

        <!-- Create Address Modal -->
        <BaseDialog v-model="showCreateModal" title="Agregar Nueva Dirección" size="lg">
            <CustomerAddressForm :model-value="addressFormData" :customer-id="customerId" @submit="createAddress"
                @cancel="closeCreateModal" :loading="isCreating" submit-button-text="Crear Dirección" />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'
import type { CustomerAddress, CreateCustomerAddressDto, CustomerAddressFormData } from '@/types/customer'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerAddressForm from '@/components/CustomerAddressForm.vue'

// Icons
import {
    MapPinIcon,
    PlusIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    customerId?: number
    selectedAddress?: number
}

const props = withDefaults(defineProps<Props>(), {
    customerId: undefined,
    selectedAddress: undefined
})

// Emits
const emit = defineEmits<{
    addressSelected: [addressId: number | undefined]
}>()

// Composables
const ordersStore = useOrdersStore()
const customersStore = useCustomersStore()
const { success, error: showError } = useToast()

// State
const customerAddresses = ref<CustomerAddress[]>([])
const isLoading = ref(false)
const showCreateModal = ref(false)
const isCreating = ref(false)

const addressFormData = ref<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: '',
    additionalInfo: '',
    latitude: undefined,
    longitude: undefined,
    isPrimary: true,
    deliveryFee: 0
})

// Computed
const customer = computed(() => {
    if (!props.customerId) return null
    return ordersStore.customers.find(c => c.id === props.customerId) || null
})

const selectedAddress = computed(() => {
    if (!props.selectedAddress || !customerAddresses.value) return null
    return customerAddresses.value.find(a => a.id === props.selectedAddress) || null
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
    } catch (error) {
        console.error('Error loading addresses:', error)
        customerAddresses.value = []
    } finally {
        isLoading.value = false
    }
}

const selectAddress = (address: CustomerAddress) => {
    emit('addressSelected', address.id)
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

        // Auto-select created address
        emit('addressSelected', address.id)

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

// Watch for customer changes
watch(() => props.customerId, (newCustomerId) => {
    if (newCustomerId) {
        loadCustomerAddresses()
    } else {
        customerAddresses.value = []
        emit('addressSelected', undefined)
    }
}, { immediate: true })
</script>

<style scoped>
/* Custom styles if needed */
</style>