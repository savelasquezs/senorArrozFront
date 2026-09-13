<template>
    <div class="address-selector">
        <div v-if="errorMessage" class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>

        <div class="space-y-3">
            <div v-if="isLoading" class="text-center py-4">
                <BaseLoading text="Cargando direcciones..." size="sm" />
            </div>

            <div v-else-if="!customerId" class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPinIcon class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-500">Selecciona un cliente para ver sus direcciones</p>
            </div>

            <div v-else-if="customerAddresses.length === 0"
                class="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPinIcon class="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p class="text-sm text-gray-500 mb-3">Este cliente no tiene direcciones registradas</p>
                <BaseButton @click="showCreateAddress" variant="primary" size="sm">
                    <PlusIcon class="w-4 h-4 mr-2" />
                    Crear Dirección
                </BaseButton>
            </div>

            <div v-else class="space-y-2">
                <div v-if="selectedAddress && !showAddressSelection"
                    class="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex min-w-0 items-center">
                            <MapPinIcon class="w-6 h-6 text-green-600 mr-3 shrink-0" />
                            <div class="min-w-0">
                                <div class="truncate text-sm font-medium">
                                    {{ selectedAddress.address }}<span v-if="selectedAddress.additionalInfo"> · {{ selectedAddress.additionalInfo }}</span>
                                </div>
                                <button
                                    type="button"
                                    class="mt-0.5 text-xs font-semibold"
                                    :class="branchDeliveryFee(selectedAddress) == null
                                        ? 'text-amber-700 hover:text-amber-800'
                                        : 'text-emerald-700 hover:text-emerald-800'"
                                    @click.stop="openDeliveryFee(selectedAddress)"
                                >
                                    {{ branchDeliveryFee(selectedAddress) == null
                                        ? 'Calcular domicilio'
                                        : `Domicilio ${formatCurrency(branchDeliveryFee(selectedAddress)!)}` }}
                                </button>
                                <p v-if="!hasMapCoordinates(selectedAddress)" class="text-xs text-red-600 mt-1">
                                    Sin ubicación en mapa
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-center items-center gap-2">
                        <BaseButton @click="showAddressSelection = true" variant="outline" size="sm"
                            class="text-blue-600 hover:text-blue-700" v-if="customerAddresses.length > 1">
                            <ArrowsRightLeftIcon class="w-4 h-4" />
                        </BaseButton>
                        <BaseButton @click="editAddress(selectedAddress)" variant="outline" size="sm"
                            class="text-orange-600 hover:text-orange-700">
                            <PencilIcon class="w-4 h-4" />
                        </BaseButton>
                        <BaseButton @click="clearAddress" variant="outline" size="sm"
                            class="text-red-600 hover:text-red-700">
                            <XMarkIcon class="w-4 h-4" />
                        </BaseButton>
                    </div>
                </div>

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
                                <MapPinIcon class="w-5 h-5 text-gray-400 mr-2 mt-0.5 shrink-0" />
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium">
                                        {{ address.address }}<span v-if="address.additionalInfo"> · {{ address.additionalInfo }}</span>
                                    </div>
                                    <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                        <span class="truncate">{{ address.neighborhoodName }}</span>
                                        <button
                                            v-if="branchDeliveryFee(address) == null"
                                            type="button"
                                            class="shrink-0 font-semibold text-amber-700 hover:text-amber-800"
                                            @click.stop="openDeliveryFee(address)"
                                        >
                                            Calcular domicilio
                                        </button>
                                        <span v-else class="shrink-0 font-semibold text-emerald-700">
                                            {{ formatCurrency(branchDeliveryFee(address)!) }}
                                        </span>
                                        <BaseBadge v-if="address.isPrimary" type="success" size="sm" class="shrink-0">
                                            Principal
                                        </BaseBadge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-gray-200">
                        <BaseButton @click="showCreateAddress" variant="outline" size="sm" class="w-full">
                            <span class="flex items-center"><PlusIcon class="w-4 h-4 mr-2" />Nueva Dirección</span>
                        </BaseButton>
                    </div>
                </div>
            </div>
        </div>

        <BaseDialog v-model="showCreateModal" title="Agregar Nueva Dirección" size="lg">
            <CustomerAddressForm v-model="addressFormData" :branch-id="effectiveBranchId || undefined"
                :can-edit-delivery-fee="true" @submit="createAddress" @cancel="closeCreateModal" />
        </BaseDialog>

        <BaseDialog v-model="showEditModal" title="Editar Dirección" size="lg">
            <CustomerAddressForm v-if="editingAddress" v-model="editFormData" :addressId="editingAddress.id"
                :branch-id="effectiveBranchId || undefined" :can-edit-delivery-fee="true" @submit="updateAddress"
                @cancel="closeEditModal" />
        </BaseDialog>

        <BaseDialog v-model="showDeliveryFeeModal" title="Domicilio" size="lg">
            <AddressDeliveryFeeDialog
                v-if="deliveryFeeAddress && effectiveBranchId"
                :address="deliveryFeeAddress"
                :branch-id="effectiveBranchId"
                @saved="handleDeliveryFeeSaved"
            />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrdersDataStore } from '@/store/ordersData'
import { useBranchContextStore } from '@/store/branchContext'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import type { CustomerAddress, CreateCustomerAddressDto, CustomerAddressFormData, UpdateCustomerAddressDto } from '@/types/customer'
import type { AddressBranchService } from '@/services/MainAPI/addressBranchApi'

import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerAddressForm from '@/components/customers/address/CustomerAddressForm.vue'
import AddressDeliveryFeeDialog from '@/components/customers/address/AddressDeliveryFeeDialog.vue'

import {
    MapPinIcon,
    PlusIcon,
    XMarkIcon,
    PencilIcon,
    ArrowsRightLeftIcon
} from '@heroicons/vue/24/outline'

interface Props {
    customerId?: number
    selectedAddress?: number
    branchId?: number
    mode?: 'draft' | 'persisted'
}

const props = withDefaults(defineProps<Props>(), {
    customerId: undefined,
    selectedAddress: undefined,
    branchId: undefined,
    mode: 'draft'
})

const emit = defineEmits<{
    addressSelected: [address: CustomerAddress | undefined]
}>()

const customersStore = useCustomersStore()
const draftStore = useOrdersDraftsStore()
const dataStore = useOrdersDataStore()
const branchContext = useBranchContextStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

const customerAddresses = ref<CustomerAddress[]>([])
const isLoading = ref(false)
const showCreateModal = ref(false)
const isCreating = ref(false)
const showEditModal = ref(false)
const isEditing = ref(false)
const showAddressSelection = ref(false)
const editingAddress = ref<CustomerAddress | null>(null)
const showDeliveryFeeModal = ref(false)
const deliveryFeeAddress = ref<CustomerAddress | null>(null)

const effectiveBranchId = computed<number | null>(() => {
    const orderBranchId = props.mode === 'draft'
        ? draftStore.currentOrder?.branchId
        : dataStore.current?.branchId
    return orderBranchId
        ?? branchContext.selectedBranchId
        ?? authStore.branchId
        ?? props.branchId
        ?? null
})

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

const errorMessage = computed(() => {
    const orderType = props.mode === 'draft'
        ? draftStore?.currentOrder?.type
        : dataStore?.current?.type

    if (orderType === 'delivery' && !selectedAddress.value) {
        return 'Debe seleccionar una dirección para pedidos a domicilio'
    }

    return null
})

const formatCurrency = (amount: number): string => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
}).format(amount)

const branchDeliveryFee = (address: CustomerAddress): number | null => {
    const branchId = effectiveBranchId.value
    if (!branchId) return null
    return address.branchServices?.find(service => service.branchId === branchId)?.deliveryFee ?? null
}

function hasMapCoordinates(addr: CustomerAddress): boolean {
    const lat = Number(addr.latitude)
    const lng = Number(addr.longitude)
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
}

const loadCustomerAddresses = async (options?: { skipAutoSelect?: boolean }) => {
    if (!props.customerId) {
        customerAddresses.value = []
        return
    }

    isLoading.value = true
    try {
        await customersStore.fetchAddresses(props.customerId)
        customerAddresses.value = customersStore.addresses || []

        const selected = props.selectedAddress
            ? customerAddresses.value.find(address => address.id === props.selectedAddress)
            : null
        if (selected && branchDeliveryFee(selected) == null) {
            emit('addressSelected', undefined)
        }

        if (!options?.skipAutoSelect && props.mode === 'draft' && customerAddresses.value.length > 0 && !props.selectedAddress) {
            const usable = customerAddresses.value.filter(address => branchDeliveryFee(address) != null)
            const primaryAddress = usable.find(addr => addr.isPrimary)
            const addressToSelect = primaryAddress || usable[0]
            if (addressToSelect) emit('addressSelected', addressToSelect)
        }
    } catch (error) {
        console.error('Error loading addresses:', error)
        customerAddresses.value = []
    } finally {
        isLoading.value = false
    }
}

const selectAddress = (address: CustomerAddress) => {
    if (branchDeliveryFee(address) == null) {
        openDeliveryFee(address)
        return
    }
    emit('addressSelected', address)
    showAddressSelection.value = false
}

const clearAddress = () => {
    emit('addressSelected', undefined)
}

const openDeliveryFee = (address: CustomerAddress) => {
    if (!effectiveBranchId.value) {
        showError('Sucursal requerida', 'Selecciona una sucursal antes de calcular el domicilio')
        return
    }
    if (!hasMapCoordinates(address)) {
        showError('Ubicación requerida', 'Edita la dirección y confirma su ubicación en el mapa')
        editAddress(address)
        return
    }
    deliveryFeeAddress.value = address
    showDeliveryFeeModal.value = true
}

const handleDeliveryFeeSaved = async (_service: AddressBranchService) => {
    const addressId = deliveryFeeAddress.value?.id
    showDeliveryFeeModal.value = false
    deliveryFeeAddress.value = null
    await loadCustomerAddresses({ skipAutoSelect: true })

    const updatedAddress = customerAddresses.value.find(address => address.id === addressId)
    if (updatedAddress) {
        emit('addressSelected', updatedAddress)
        showAddressSelection.value = false
    }
    success('Domicilio actualizado', 2000)
}

const showCreateAddress = () => {
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
        await loadCustomerAddresses({ skipAutoSelect: true })

        const createdAddress = customerAddresses.value.find(item => item.id === address.id) ?? address
        emit('addressSelected', createdAddress)
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
    editFormData.value = {
        neighborhoodId: address.neighborhoodId,
        address: address.address,
        additionalInfo: address.additionalInfo || '',
        latitude: address.latitude,
        longitude: address.longitude,
        isPrimary: address.isPrimary,
        deliveryFee: branchDeliveryFee(address) ?? address.deliveryFee ?? 0
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
        await loadCustomerAddresses({ skipAutoSelect: true })

        if (selectedAddress.value?.id === editingAddress.value.id) {
            const updatedAddress = customerAddresses.value.find(a => a.id === editingAddress.value!.id)
            if (updatedAddress) emit('addressSelected', updatedAddress)
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

watch(() => [props.customerId, effectiveBranchId.value], ([newCustomerId]) => {
    if (newCustomerId) {
        loadCustomerAddresses()
    } else {
        customerAddresses.value = []
        emit('addressSelected', undefined)
    }
    showAddressSelection.value = false
}, { immediate: true })
</script>

<style scoped>
/* Intencionalmente mínimo: usa el sistema visual existente. */
</style>
