<template>
    <div class="p-3 rounded-lg border-2 transition-colors bg-white hover:bg-gray-50">
        <div class="flex items-start gap-3">
            <span class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 select-none text-lg">≡</span>

            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                    #{{ order.id }} · {{ order.addressDescription || 'Sin dirección' }}
                </div>
                <div class="text-xs text-gray-500 truncate">{{ order.neighborhoodName || order.branchName }}</div>
            </div>

            <div class="flex gap-1">
                <BaseButton size="sm" variant="outline" class="px-2" @click="openDetail = true">Ver</BaseButton>
                <BaseButton size="sm" variant="success" class="px-2" @click="openConfirmDelivered = true">✓</BaseButton>
                <BaseButton size="sm" variant="outline" class="px-2" @click="openAddress = true">Dir</BaseButton>
            </div>
        </div>

        <!-- Detalle (solo lectura, compacto para mobile) -->
        <BaseDialog :model-value="openDetail" title="Detalle del pedido" @update:model-value="onToggleDetail">

            <OrderDetailContent v-if="order" :flat-order="order" />
        </BaseDialog>

        <!-- Confirmar entregado -->
        <BaseDialog :model-value="openConfirmDelivered" title="Marcar como entregado"
            @update:model-value="openConfirmDelivered = $event">
            <div class="text-sm text-gray-700">¿Confirmas que el pedido #{{ order.id }} fue entregado?</div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="outline" @click="openConfirmDelivered = false">Cancelar</BaseButton>
                    <BaseButton size="sm" variant="success" @click="confirmDelivered">Confirmar</BaseButton>
                </div>
            </template>
        </BaseDialog>

        <!-- Editar dirección -->
        <BaseDialog :model-value="openAddress" title="Editar dirección" @update:model-value="openAddress = $event">
            <CustomerAddressForm :model-value="addressForm" :customer-id="order.customerId || 0"
                :branch-id="order.branchId" @submit="handleAddressSaved" @cancel="openAddress = false" />
        </BaseDialog>

        <!-- Asignar coordenadas actuales -->
        <BaseDialog :model-value="openCoordsPrompt" title="Asignar coordenadas actuales"
            @update:model-value="openCoordsPrompt = $event">
            <div class="text-sm text-gray-700">¿Deseas asignar las coordenadas actuales del dispositivo a esta
                dirección?</div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="outline" @click="openCoordsPrompt = false">No</BaseButton>
                    <BaseButton size="sm" variant="secondary" @click="assignCurrentCoords">Sí</BaseButton>
                </div>
            </template>
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CustomerAddressForm from '@/components/customers/address/CustomerAddressForm.vue'
import { useGeolocation } from '@/composables/useGeolocation'

import { useOrdersDataStore } from '@/store/ordersData'
import type { CustomerAddressFormData } from '@/types/customer'
import OrderDetailContent from '@/components/orders/OrderDetailContent.vue'
import type { OrderListItem } from '@/types/order'

interface Props { order: OrderListItem }
const props = defineProps<Props>()
const emit = defineEmits<{
    delivered: [orderId: number]
    addressUpdated: [payload: { orderId: number, addressDescription?: string, lat?: number, lng?: number }]
    openDetail: [orderId: number]
}>()

const openDetail = ref(false)
const openConfirmDelivered = ref(false)
const openAddress = ref(false)
const openCoordsPrompt = ref(false)

const { requestLocation } = useGeolocation()

const ordersData = useOrdersDataStore()

const onToggleDetail = async (val: boolean) => {
    openDetail.value = val
    if (val) {
        try {
            await ordersData.fetchById(props.order.id)
        } catch { }
    }
}

const confirmDelivered = () => {
    openConfirmDelivered.value = false
    emit('delivered', props.order.id)
}

const pendingAddress = ref<{ description?: string } | null>(null)
const handleAddressSaved = (payload: CustomerAddressFormData) => {
    pendingAddress.value = { description: payload?.address }
    openAddress.value = false
    openCoordsPrompt.value = true
}

const assignCurrentCoords = async () => {
    openCoordsPrompt.value = false
    const loc = await requestLocation()
    emit('addressUpdated', {
        orderId: props.order.id,
        addressDescription: pendingAddress.value?.description || props.order.addressDescription || undefined,
        lat: loc?.lat,
        lng: loc?.lng,
    })
    pendingAddress.value = null
}


// Address form model
const addressForm = ref<CustomerAddressFormData>({
    neighborhoodId: 0,
    address: props.order.addressDescription || '',
    additionalInfo: '',
    latitude: 0,
    longitude: 0,
    deliveryFee: 0,
    isPrimary: false,
})
</script>
