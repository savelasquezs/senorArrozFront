<template>
    <div class="customer-selector">
        <label class="block text-sm font-medium text-gray-700 mb-2">
            Cliente
            <span v-if="required" class="text-red-500">*</span>
        </label>

        <!-- Customer Search -->
        <div class="space-y-3">
            <!-- Search Input -->
            <BaseInput v-model="searchQuery" placeholder="Buscar por teléfono o nombre..." @input="handleSearch"
                size="sm">
                <template #prepend>
                    <MagnifyingGlassIcon class="w-4 h-4 text-gray-400" />
                </template>
            </BaseInput>

            <!-- Selected Customer -->
            <div v-if="selectedCustomer" class="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <UserCircleIcon class="w-8 h-8 text-green-600 mr-3" />
                        <div>
                            <div class="text-sm font-medium text-green-900">
                                {{ selectedCustomer.name }}
                            </div>
                            <div class="text-xs text-green-600">
                                {{ selectedCustomer.phone1 }}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <!-- View Customer Button -->
                        <BaseButton @click="viewCustomer" variant="outline" size="sm">
                            Ver
                        </BaseButton>

                        <!-- Clear Customer Button -->
                        <BaseButton @click="clearCustomer" variant="outline" size="sm"
                            class="text-red-600 hover:text-red-700">
                            <XMarkIcon class="w-3 h-3" />
                        </BaseButton>
                    </div>
                </div>

                <!-- Customer Addresses Preview -->
                <div v-if="selectedCustomerAddresses.length > 0" class="mt-2 pt-2 border-t border-green-200">
                    <div class="text-xs text-green-600 mb-1">{{ selectedCustomerAddresses.length }} direcciones
                        disponibles</div>
                </div>
            </div>

            <!-- Customer Creation Options -->
            <div v-else-if="searchResults.length === 0 && searchQuery.trim()">
                <div class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <UserPlusIcon class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p class="text-sm text-gray-500 mb-3">No se encontró cliente</p>
                    <BaseButton @click="showCreateCustomer" variant="primary" size="sm">
                        <PlusIcon class="w-4 h-4 mr-2" />
                        Crearf Cliente
                    </BaseButton>
                </div>
            </div>

            <!-- Search Results -->
            <div v-else-if="searchResults.length > 0" class="space-y-2 max-h-48 overflow-y-auto">
                <div v-for="customer in searchResults" :key="customer.id" @click="selectCustomer(customer)"
                    class="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors">
                    <div class="flex items-center">
                        <UserCircleIcon class="w-6 h-6 text-gray-400 mr-3" />
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-900">
                                {{ customer.name }}
                            </div>
                            <div class="text-xs text-gray-500">
                                {{ customer.phone1 }}
                            </div>
                        </div>
                        <ChevronRightIcon class="win-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Customer Modal -->
        <BaseDialog v-model="showCreateModal" title="Crear Nuevo Cliente" size="lg">
            <div v-if="!createdCustomer">
                <CustomerForm :model-value="createCustomerData" @submit="createCustomerWrapper"
                    @cancel="closeCreateModal" :loading="isCreating" submit-button-text="Crear Cliente" />
            </div>

            <div v-else class="text-center py-6">
                <CheckCircleIcon class="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">Cliente Creado</h3>
                <p class="text-gray-500 mb-4">{{ createdCustomer.name }} ha sido creado exitosamente</p>
                <div class="flex space-x-3 justify-center">
                    <BaseButton @click="selectCreatedCustomer" variant="primary">
                        Seleccionar Cliente
                    </BaseButton>
                    <BaseButton @click="closeCreateModal" variant="outline">
                        Continuar
                    </BaseButton>
                </div>
            </div>
        </BaseDialog>

        <!-- Error/Validation Message -->
        <div v-if="error && !selectedCustomer" class="mt-2 text-sm text-red-600">
            {{ error }}
        </div>

        <!-- Customer Detail Modal -->
        <CustomerDetailModal v-if="selectedCustomer" :show="showCustomerDetail" :customer="selectedCustomer"
            @close="closeCustomerDetail" @edit-customer="handleEditCustomer" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'
import type { Customer } from '@/types/customer'
import type { CreateCustomerDto } from '@/types/customer'

// Components
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerForm from '@/components/CustomerForm.vue'
import CustomerDetailModal from '@/components/orders/CustomerDetailModal.vue'

// Icons
import {
    MagnifyingGlassIcon,
    UserCircleIcon,
    UserPlusIcon,
    PlusIcon,
    XMarkIcon,
    ChevronRightIcon,
    CheckCircleIcon,
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    selectedCustomer?: number
    required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    selectedCustomer: undefined,
    required: false
})

// Emits
const emit = defineEmits<{
    customerSelected: [customerId: number | undefined]
}>()

// Composables
const ordersStore = useOrdersStore()
const customersStore = useCustomersStore()
const { success, error: showError } = useToast()

// State
const searchQuery = ref('')
const searchResults = ref<Customer[]>([])
const showCreateModal = ref(false)
const showCustomerDetail = ref(false)
const isCreating = ref(false)
const createdCustomer = ref<Customer | null>(null)
const error = ref('')

const createCustomerData = ref<CreateCustomerDto>({
    name: '',
    phone1: '',
    phone2: '',
    branchId: 0,
    initialAddress: {
        neighborhoodId: 0,
        address: '',
        additionalInfo: '',
        latitude: 0,
        longitude: 0,
        isPrimary: true,
        deliveryFee: 0
    }
})

// Computed
const selectedCustomer = computed(() => {
    if (!props.selectedCustomer) return null
    return ordersStore.customers.find(c => c.id === props.selectedCustomer) || null
})

const selectedCustomerAddresses = computed(() => {
    // This would typically come from a customer detail API call
    // For now, returning empty array
    return []
})

// Methods
const handleSearch = () => {
    if (!searchQuery.value.trim()) {
        searchResults.value = []
        return
    }

    const query = searchQuery.value.toLowerCase()
    searchResults.value = ordersStore.customers.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone1?.toLowerCase().includes(query) ||
        customer.phone2?.toLowerCase().includes(query)
    )
}

const selectCustomer = (customer: Customer) => {
    emit('customerSelected', customer.id)
    searchQuery.value = ''
    searchResults.value = []
}

const clearCustomer = () => {
    emit('customerSelected', undefined)
    searchQuery.value = ''
    searchResults.value = []
}

const showCreateCustomer = () => {
    // Pre-populate form with search query if it looks like a name
    if (searchQuery.value.trim()) {
        createCustomerData.value.name = searchQuery.value.trim()
    }
    showCreateModal.value = true
}

const createCustomerWrapper = async (customerData: any) => {
    const createCustomerDto: CreateCustomerDto = {
        name: customerData.name,
        phone1: customerData.phone1,
        phone2: customerData.phone2,
        branchId: customerData.branchId,
        initialAddress: customerData.initialAddress || {
            neighborhoodId: 0,
            address: '',
            additionalInfo: '',
            latitude: 0,
            longitude: 0,
            isPrimary: true,
            deliveryFee: 0
        }
    }

    isCreating.value = true
    try {
        const customer = await customersStore.create(createCustomerDto)
        createdCustomer.value = customer

        // Refresh customers list
        await ordersStore.loadCustomers()

        success('Cliente creado', 3000, `${customer.name} ha sido creado correctamente`)
    } catch (error: any) {
        showError('Error al crear cliente', error.message || 'No se pudo crear el cliente')
    } finally {
        isCreating.value = false
    }
}

const selectCreatedCustomer = () => {
    if (createdCustomer.value) {
        emit('customerSelected', createdCustomer.value.id)
    }
    closeCreateModal()
}

const closeCreateModal = () => {
    showCreateModal.value = false
    createdCustomer.value = null
    createCustomerData.value = {
        name: '',
        phone1: '',
        phone2: '',
        branchId: 0,
        initialAddress: {
            neighborhoodId: 0,
            address: '',
            additionalInfo: '',
            latitude: 0,
            longitude: 0,
            isPrimary: true,
            deliveryFee: 0
        }
    }
}

const viewCustomer = () => {
    console.log('CustomerSelector - viewCustomer clicked')
    console.log('CustomerSelector - selectedCustomer:', selectedCustomer.value)

    if (selectedCustomer.value) {
        showCustomerDetail.value = true
        console.log('CustomerSelector - Modal opened with customer:', selectedCustomer.value)
    }
}

const closeCustomerDetail = () => {
    showCustomerDetail.value = false
}

const handleEditCustomer = (customer: Customer) => {
    // Close detail modal
    showCustomerDetail.value = false
    // Here you could open an edit modal or navigate to edit page
    console.log('Edit customer:', customer.id)
    // For now, just show a toast
    success('Funcionalidad de edición', 3000, 'La funcionalidad de edición estará disponible próximamente')
}

// Watch for search query changes
watch(searchQuery, () => {
    if (!searchQuery.value.trim()) {
        searchResults.value = []
    }
})

// Watch for prop changes
watch(() => props.selectedCustomer, (newValue) => {
    if (!newValue) {
        searchQuery.value = ''
        searchResults.value = []
    }
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
