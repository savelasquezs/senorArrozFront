<template>
    <BaseDialog v-model="internalShow" size="xl">
        <div class="customer-detail-modal">
            <!-- Modal Header -->
            <div class="flex items-center justify-between mb-6" v-if="currentCustomer">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <UserIcon class="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-xl font-semibold text-gray-900">
                                {{ currentCustomer.name }}
                            </h2>
                            <BaseButton @click="handleEditCustomer" variant="outline" size="sm" class="flex-1">
                                <span class="flex items-center justify-center">
                                    <PencilIcon class="w-4 h-4 mr-2" />
                                    Editar
                                </span>
                            </BaseButton>
                        </div>
                        <PhoneNumberItem :phone-number="currentCustomer.phone1" />
                        <PhoneNumberItem :phone-number="currentCustomer.phone2" v-if="currentCustomer.phone2" />
                    </div>
                </div>
                <BaseButton @click="handleClose" variant="ghost" size="sm">
                    <XMarkIcon class="w-5 h-5" />
                </BaseButton>
            </div>

            <!-- Customer Content -->
            <div v-if="currentCustomer" class="space-y-6">


                <!-- Customer Information Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">


                    <!-- Order Statistics -->
                    <CustomerStatsCard :customer="currentCustomer" :show-actions="showActions"
                        @view-orders="handleViewOrders" />
                </div>

                <!-- Addresses Section -->
                <CustomerAddressesList :customer="currentCustomer" :show-actions="showActions" />
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

    </BaseDialog>

    <!-- Customer Edit Modal -->
    <BaseDialog v-model="showEditModal" size="lg">
        <div class="customer-edit-modal">
            <!-- Modal Header -->
            <div class="flex items-center justify-between mb-6" v-if="currentCustomer">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <PencilIcon class="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h2 class="text-xl font-semibold text-gray-900">
                            Editar Cliente
                        </h2>
                        <p class="text-sm text-gray-500">
                            Modifica la información del cliente
                        </p>
                    </div>
                </div>
                <BaseButton @click="closeEditModal" variant="ghost" size="sm">
                    <XMarkIcon class="w-5 h-5" />
                </BaseButton>
            </div>

            <!-- Customer Form -->
            <CustomerForm v-if="currentCustomer" :customer="currentCustomer" :loading="editLoading"
                @submit="handleCustomerSubmit" @cancel="closeEditModal" />
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Customer } from '@/types/customer'
import { useToast } from '@/composables/useToast'
import { useCustomersStore } from '@/store/customers'
import PhoneNumberItem from '@/components/customers/PhoneNumberItem.vue'

// Components
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

import BaseLoading from '@/components/ui/BaseLoading.vue'


import CustomerStatsCard from '@/components/customers/CustomerStatsCard.vue'
import CustomerAddressesList from '@/components/customers/CustomerAddressesList.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'

// Icons
import {
    UserIcon,
    PencilIcon,
    XMarkIcon,
    ExclamationTriangleIcon
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

// State for edit modal
const showEditModal = ref(false)
const editLoading = ref(false)



const emit = defineEmits<{
    (e: 'close'): void
    (e: 'editCustomer', customer: Customer): void
    (e: 'customerUpdated', customer: Customer): void
}>()

// Composables
const { success, error: showError } = useToast()
const customersStore = useCustomersStore()

// Computed customer that uses store current when available, or falls back to prop
const currentCustomer = computed(() => {
    // If we have a customer in the store and it matches our prop customer ID, use the store version
    if (customersStore.current && props.customer && customersStore.current.id === props.customer.id) {
        return customersStore.current
    }
    // Otherwise use the prop customer
    return props.customer
})

// Debug logs
console.log('CustomerDetailModal - props received:', { show, customer, loading, showActions })

// Methods
const handleClose = () => {
    console.log('CustomerDetailModal - handleClose called')
    emit('close')
}

const loadCustomerAddresses = async () => {
    if (!currentCustomer.value) return

    try {
        await customersStore.fetchAddresses(currentCustomer.value.id)
        console.log('CustomerDetailModal - Addresses loaded for customer:', currentCustomer.value.id)
    } catch (error) {
        console.error('CustomerDetailModal - Error loading addresses:', error)
    }
}

const handleEditCustomer = () => {
    showEditModal.value = true
}

const closeEditModal = () => {
    showEditModal.value = false
}

const handleCustomerSubmit = async (formData: any) => {
    if (!currentCustomer.value) return

    editLoading.value = true

    try {
        const updateData = {
            name: formData.name,
            phone1: formData.phone1,
            phone2: formData.phone2 || undefined,
            active: formData.active
        }

        const updatedCustomer = await customersStore.update(currentCustomer.value.id, updateData)

        success('Cliente actualizado', 2000, 'La información del cliente ha sido actualizada correctamente')

        // Emit event to parent component
        emit('customerUpdated', updatedCustomer)

        closeEditModal()
    } catch (error: any) {
        showError('Error al actualizar cliente', error.message || 'No se pudo actualizar la información del cliente')
    } finally {
        editLoading.value = false
    }
}


const handleViewOrders = (customer: Customer) => {
    // This would typically navigate to orders view filtered by customer
    console.log('View orders for customer:', customer.id)
    success('Funcionalidad de pedidos', 2000, 'La vista de pedidos estará disponible próximamente')
}



// Watch for prop changes to sync internal state
watch(() => props.show, (newShow) => {
    internalShow.value = newShow
    if (newShow && currentCustomer.value) {
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




</script>

<style scoped>
.customer-detail-modal,
.customer-edit-modal {
    max-height: 80vh;
    overflow-y: auto;
}
</style>