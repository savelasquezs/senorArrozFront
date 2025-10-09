<template>
    <BaseDialog v-model="internalShow" size="xl">
        <div class="customer-detail-modal">
            <!-- Modal Header -->
            <div class="flex items-center justify-between mb-6" v-if="customer">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <UserIcon class="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-xl font-semibold text-gray-900">
                                {{ customer.name }}
                            </h2>
                            <BaseButton @click="handleEditCustomer" variant="outline" size="sm" class="flex-1">
                                <span class="flex items-center justify-center">
                                    <PencilIcon class="w-4 h-4 mr-2" />
                                    Editar
                                </span>
                            </BaseButton>
                        </div>
                        <PhoneNumberItem :phone-number="customer.phone1" />
                        <PhoneNumberItem :phone-number="customer.phone2" v-if="customer.phone2" />
                    </div>
                </div>
                <BaseButton @click="handleClose" variant="ghost" size="sm">
                    <XMarkIcon class="w-5 h-5" />
                </BaseButton>
            </div>

            <!-- Customer Content -->
            <div v-if="customer" class="space-y-6">


                <!-- Customer Information Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">


                    <!-- Order Statistics -->
                    <CustomerStatsCard :customer="customer" :show-actions="showActions" @view-orders="handleViewOrders"
                        @create-order="handleCreateOrder" />
                </div>

                <!-- Addresses Section -->
                <CustomerAddressesList :customer="customer" :show-actions="showActions" />
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Customer } from '@/types/customer'
import { useToast } from '@/composables/useToast'
import { useCustomersStore } from '@/store/customers'
import PhoneNumberItem from '@/components/ui/PhoneNumberItem.vue'

// Components
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

import BaseLoading from '@/components/ui/BaseLoading.vue'


import CustomerStatsCard from '@/components/customer/CustomerStatsCard.vue'
import CustomerAddressesList from '@/components/customer/CustomerAddressesList.vue'

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


const emit = defineEmits<{
    (e: 'close'): void
    (e: 'editCustomer', customer: Customer): void
}>()

// Composables
const { success } = useToast()
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

const handleEditCustomer = () => {

}

const handleToggleStatus = () => {
    // This would typically call an API to toggle customer status

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




</script>

<style scoped>
.customer-detail-modal {
    max-height: 80vh;
    overflow-y: auto;
}
</style>