<template>
    <div>
        <BaseDialog
            :model-value="showAddressDialog"
            title="Editar dirección"
            @update:model-value="onAddressDialogToggle"
        >
            <CustomerAddressForm
                v-if="order && showAddressDialog"
                :key="formKey"
                v-model="addressForm"
                :address-id="order.addressId || undefined"
                :can-edit-delivery-fee="false"
                @submit="onFormSubmit"
                @cancel="closeEntireFlow"
            />
        </BaseDialog>

        <BaseDialog
            :model-value="showCoordsDialog"
            title="Asignar coordenadas actuales"
            @update:model-value="onCoordsDialogToggle"
        >
            <div class="text-sm text-gray-700">
                ¿Deseas asignar las coordenadas actuales del dispositivo a esta dirección?
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="outline" @click="onCoordsDecline">No</BaseButton>
                    <BaseButton size="sm" variant="secondary" :loading="coordsSaving" @click="onCoordsAccept">
                        Sí
                    </BaseButton>
                </div>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerAddressForm from '@/components/customers/address/CustomerAddressForm.vue'
import { useGeolocation } from '@/composables/useGeolocation'
import { useCustomersStore } from '@/store/customers'
import { useToast } from '@/composables/useToast'
import type { CustomerAddressFormData, UpdateCustomerAddressDto } from '@/types/customer'
import type { OrderListItem } from '@/types/order'

export type DeliveryAddressUpdatedPayload = {
    orderId: number
    addressDescription?: string
    lat?: number
    lng?: number
}

interface Props {
    modelValue: boolean
    order: OrderListItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'address-updated': [payload: DeliveryAddressUpdatedPayload]
}>()

const { requestLocation } = useGeolocation()
const customersStore = useCustomersStore()
const { success, error: showError } = useToast()

const showAddressDialog = ref(false)
const showCoordsDialog = ref(false)
const formKey = ref(0)
const coordsSaving = ref(false)

const pendingAfterSave = ref<CustomerAddressFormData | null>(null)

const addressForm = ref<CustomerAddressFormData>(emptyForm())

function emptyForm(): CustomerAddressFormData {
    return {
        neighborhoodId: 0,
        address: '',
        additionalInfo: '',
        latitude: 0,
        longitude: 0,
        deliveryFee: 0,
        isPrimary: false,
    }
}

function syncFormFromOrder(order: OrderListItem) {
    addressForm.value = {
        neighborhoodId: order.neighborhoodId ?? 0,
        address: order.addressDescription || '',
        additionalInfo: order.addressAdditionalInfo || '',
        latitude: (order as unknown as { latitude?: number }).latitude ?? 0,
        longitude: (order as unknown as { longitude?: number }).longitude ?? 0,
        deliveryFee: order.deliveryFee || 0,
        isPrimary: false,
    }
}

watch(
    () => props.modelValue,
    (open) => {
        if (open && props.order) {
            syncFormFromOrder(props.order)
            formKey.value += 1
            showAddressDialog.value = true
            showCoordsDialog.value = false
            pendingAfterSave.value = null
        }
        if (!open) {
            showAddressDialog.value = false
            showCoordsDialog.value = false
            pendingAfterSave.value = null
        }
    }
)

function closeEntireFlow() {
    showAddressDialog.value = false
    showCoordsDialog.value = false
    pendingAfterSave.value = null
    emit('update:modelValue', false)
}

function onAddressDialogToggle(open: boolean) {
    if (!open && !showCoordsDialog.value) {
        closeEntireFlow()
    } else {
        showAddressDialog.value = open
    }
}

function onCoordsDialogToggle(open: boolean) {
    if (!open) {
        onCoordsDecline()
    }
}

function formToDto(data: CustomerAddressFormData): UpdateCustomerAddressDto {
    return {
        neighborhoodId: data.neighborhoodId,
        address: data.address,
        additionalInfo: data.additionalInfo,
        latitude: data.latitude,
        longitude: data.longitude,
        isPrimary: data.isPrimary,
        deliveryFee: data.deliveryFee,
    }
}

async function onFormSubmit(data: CustomerAddressFormData) {
    const order = props.order
    if (!order?.customerId || !order.addressId) {
        showError(
            'No se puede guardar',
            'Este pedido no tiene cliente o dirección registrada para actualizar.'
        )
        return
    }

    try {
        await customersStore.updateAddress(order.customerId, order.addressId, formToDto(data))
        success('Dirección actualizada', 2500, 'Los datos se guardaron correctamente.')
        pendingAfterSave.value = { ...data }
        showAddressDialog.value = false
        showCoordsDialog.value = true
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo actualizar la dirección.'
        showError('Error al guardar', msg)
    }
}

function emitAddressUpdated(lat?: number, lng?: number) {
    const order = props.order
    const pending = pendingAfterSave.value
    if (!order) return
    emit('address-updated', {
        orderId: order.id,
        addressDescription: pending?.address ?? order.addressDescription ?? undefined,
        lat,
        lng,
    })
}

function onCoordsDecline() {
    const pending = pendingAfterSave.value
    showCoordsDialog.value = false
    pendingAfterSave.value = null
    emitAddressUpdated(pending?.latitude, pending?.longitude)
    emit('update:modelValue', false)
}

async function onCoordsAccept() {
    const order = props.order
    const pending = pendingAfterSave.value
    if (!order?.customerId || !order.addressId || !pending) {
        showCoordsDialog.value = false
        pendingAfterSave.value = null
        emit('update:modelValue', false)
        return
    }

    coordsSaving.value = true
    try {
        const loc = await requestLocation()
        if (loc != null) {
            await customersStore.updateAddress(order.customerId, order.addressId, {
                latitude: loc.lat,
                longitude: loc.lng,
            })
            success('Coordenadas actualizadas', 2500, 'Ubicación del dispositivo guardada.')
            emitAddressUpdated(loc.lat, loc.lng)
        } else {
            emitAddressUpdated(pending.latitude, pending.longitude)
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudieron guardar las coordenadas.'
        showError('Coordenadas', msg)
        emitAddressUpdated(pending.latitude, pending.longitude)
    } finally {
        coordsSaving.value = false
        showCoordsDialog.value = false
        pendingAfterSave.value = null
        emit('update:modelValue', false)
    }
}
</script>
