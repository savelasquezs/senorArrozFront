<template>
    <BaseDialog :model-value="show" @close="handleClose" size="xl">
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
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <InformationCircleIcon class="w-4 h-4" />
                            Información Básica
                        </h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-500">Nombre:</span>
                                <span class="text-sm font-medium text-gray-900">{{ customer.name }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-500">Teléfono Principal:</span>
                                <span class="text-sm font-medium text-gray-900">{{ customer.phone1 }}</span>
                            </div>
                            <div v-if="customer.phone2" class="flex justify-between">
                                <span class="text-sm text-gray-500">Teléfono Secundario:</span>
                                <span class="text-sm font-medium text-gray-900">{{ customer.phone2 }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-500">Estado:</span>
                                <BaseBadge :type="customer.active ? 'success' : 'danger'"
                                    :text="customer.active ? 'Activo' : 'Inactivo'" size="sm" />
                            </div>
                        </div>
                    </div>

                    <!-- Order Statistics -->
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <ChartBarIcon class="w-4 h-4" />
                            Estadísticas de Pedidos
                        </h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-500">Total Pedidos:</span>
                                <span class="text-sm font-medium text-gray-900">{{ customer.totalOrders || 0 }}</span>
                            </div>
                            <div v-if="customer.lastOrderDate" class="flex justify-between">
                                <span class="text-sm text-gray-500">Último Pedido:</span>
                                <span class="text-sm font-medium text-gray-900">{{ formatDate(customer.lastOrderDate)
                                }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-500">Sucursal:</span>
                                <span class="text-sm font-medium text-gray-900">{{ customer.branchName || 'N/A'
                                }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Addresses Section -->
                <div v-if="customer.addresses && customer.addresses.length > 0"
                    class="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <MapPinIcon class="w-4 h-4" />
                        Direcciones Registradas ({{ customer.addresses.length }})
                    </h4>
                    <div class="space-y-3">
                        <div v-for="address in customer.addresses" :key="address.id"
                            class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-sm font-medium text-gray-900">{{ address.address }}</span>
                                        <BaseBadge v-if="address.isPrimary" type="primary" text="Principal" size="sm" />
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        {{ address.neighborhood?.name || 'Barrio no especificado' }}
                                    </div>
                                    <div v-if="address.additionalInfo" class="text-xs text-gray-500 mt-1">
                                        {{ address.additionalInfo }}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-medium text-gray-900">
                                        {{ formatCurrency(address.deliveryFee) }}
                                    </div>
                                    <div class="text-xs text-gray-500">Domicilio</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Addresses -->
                <div v-else class="bg-gray-50 rounded-lg p-6 text-center">
                    <MapPinIcon class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p class="text-sm text-gray-500">Este cliente no tiene direcciones registradas</p>
                </div>
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
                <BaseButton @click="handleEditCustomer" variant="primary" v-if="customer">
                    <PencilIcon class="w-4 h-4 mr-2" />
                    Editar Cliente
                </BaseButton>
            </div>
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import type { Customer } from '@/types/customer'
import { useFormatting } from '@/composables/useFormatting'

// Components
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

// Icons
import {
    UserIcon,
    PhoneIcon,
    MapPinIcon,
    InformationCircleIcon,
    ChartBarIcon,
    XMarkIcon,
    PencilIcon,
    ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

interface Props {
    show: boolean
    customer?: Customer
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'editCustomer', customer: Customer): void
}>()

// Composables
const { formatCurrency, formatDate } = useFormatting()

// Methods
const handleClose = () => {
    emit('close')
}

const handleEditCustomer = () => {
    if (props.customer) {
        emit('editCustomer', props.customer)
    }
}
</script>

<style scoped>
.customer-detail-modal {
    max-height: 80vh;
    overflow-y: auto;
}
</style>
