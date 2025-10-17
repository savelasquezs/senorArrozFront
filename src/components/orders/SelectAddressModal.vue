<template>
    <BaseDialog :model-value="open" :title="`Seleccionar Dirección - ${order.customerName || 'Cliente'}`"
        @update:model-value="(val) => !val && $emit('close')">
        <div class="space-y-4">
            <!-- Info del pedido -->
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-sm text-gray-600">
                    Pedido <span class="font-medium text-gray-900">#{{ order.id }}</span>
                </div>
                <div v-if="order.addressDescription" class="mt-2 text-sm">
                    <span class="text-gray-600">Dirección actual:</span>
                    <p class="text-gray-900 font-medium">{{ order.addressDescription }}</p>
                </div>
            </div>

            <!-- Lista de direcciones -->
            <div v-if="loading" class="flex justify-center py-8">
                <BaseLoading size="md" />
            </div>

            <div v-else-if="!order.customerId" class="text-center py-8 text-gray-500">
                Este pedido no tiene un cliente asignado
            </div>

            <div v-else-if="addresses.length === 0" class="text-center py-8 text-gray-500">
                El cliente no tiene direcciones registradas
            </div>

            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
                <label v-for="address in addresses" :key="address.id"
                    class="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    :class="{
                        'border-emerald-500 bg-emerald-50': selectedAddressId === address.id,
                        'border-gray-200': selectedAddressId !== address.id,
                    }">
                    <input v-model="selectedAddressId" type="radio" :value="address.id"
                        class="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                    <div class="ml-3 flex-1">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-gray-900">
                                {{ address.address }}
                            </p>
                            <span v-if="address.isPrimary"
                                class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                Principal
                            </span>
                        </div>
                        <p v-if="address.additionalInfo" class="mt-1 text-sm text-gray-500">
                            {{ address.additionalInfo }}
                        </p>
                        <div class="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{{ address.neighborhoodName }}</span>
                            <span>Domicilio: {{ formatCurrency(address.deliveryFee) }}</span>
                        </div>
                    </div>
                </label>
            </div>
        </div>

        <template #actions>
            <BaseButton variant="secondary" @click="$emit('close')">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving"
                :disabled="!selectedAddressId || selectedAddressId === order.addressId" @click="handleSave">
                Confirmar
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { OrderListItem } from '@/types/order'
import type { CustomerAddress } from '@/types/customer'
import { orderApi } from '@/services/MainAPI/orderApi'
import { customerApi } from '@/services/MainAPI/customerApi'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

interface Props {
    open: boolean
    order: OrderListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: []
}>()

const { formatCurrency } = useFormatting()
const { success, error } = useToast()

// Estado
const loading = ref(false)
const saving = ref(false)
const addresses = ref<CustomerAddress[]>([])
const selectedAddressId = ref<number | null>(props.order.addressId)

// Métodos
const fetchAddresses = async () => {
    if (!props.order.customerId) return

    loading.value = true
    try {
        const response = await customerApi.getCustomerAddresses(props.order.customerId)
        addresses.value = response.data

        // Si no hay dirección seleccionada, seleccionar la principal por defecto
        if (!selectedAddressId.value && addresses.value.length > 0) {
            const primaryAddress = addresses.value.find((a) => a.isPrimary)
            if (primaryAddress) {
                selectedAddressId.value = primaryAddress.id
            }
        }
    } catch (err: any) {
        error('Error al cargar direcciones', err.message)
    } finally {
        loading.value = false
    }
}

const handleSave = async () => {
    if (!selectedAddressId.value) return

    const selectedAddress = addresses.value.find((a) => a.id === selectedAddressId.value)
    if (!selectedAddress) return

    saving.value = true
    try {
        await orderApi.update(props.order.id, {
            addressId: selectedAddressId.value,
            deliveryFee: selectedAddress.deliveryFee,
        })

        success('Dirección actualizada', 5000, 'La dirección del pedido ha sido actualizada')
        emit('updated')
        emit('close')
    } catch (err: any) {
        error('Error al actualizar dirección', err.message)
    } finally {
        saving.value = false
    }
}

// Watchers
watch(
    () => props.open,
    (newVal) => {
        if (newVal) {
            selectedAddressId.value = props.order.addressId
            fetchAddresses()
        }
    }
)

// Lifecycle
onMounted(() => {
    if (props.open) {
        fetchAddresses()
    }
})
</script>
