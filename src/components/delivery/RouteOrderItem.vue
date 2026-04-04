<template>
    <div class="p-3 rounded-lg border-2 transition-colors bg-white hover:bg-gray-50">
        <div class="flex items-start gap-3">
            <span class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 select-none text-lg">≡</span>

            <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                    #{{ order.id }} · {{ order.addressDescription || 'Sin dirección' }}
                </div>
                <div v-if="order.addressAdditionalInfo" class="text-xs text-gray-600 truncate">
                    {{ order.addressAdditionalInfo }}
                </div>
                <div class="text-xs text-gray-500 truncate">{{ order.neighborhoodName || order.branchName }}</div>
                <div v-if="orderNotes"
                    class="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-1.5 whitespace-pre-wrap break-words">
                    <span class="font-semibold">Notas del pedido: </span>{{ orderNotes }}
                </div>
            </div>

            <div class="flex gap-1 flex-wrap justify-end">
                <BaseButton size="sm" variant="outline" class="px-2" @click="onToggleDetail(true)">Ver</BaseButton>
            </div>
        </div>

        <!-- Detalle (solo lectura, compacto para mobile) -->
        <BaseDialog :model-value="openDetail" title="Detalle del pedido" @update:model-value="onToggleDetail">
            <OrderDetailContent v-if="order" :flat-order="order" @delivered="openConfirmDelivered = true" />
            <template #footer>
                <div class="flex flex-wrap justify-end gap-2">
                    <BaseButton
                        size="sm"
                        variant="outline"
                        :loading="reprintLoading"
                        title="Reimprimir ticket de domicilio"
                        @click="onReprint"
                    >
                        <PrinterIcon class="w-4 h-4 mr-1" />
                        Imprimir
                    </BaseButton>
                    <BaseButton size="sm" variant="outline" @click="openAddress = true">
                        Editar dirección
                    </BaseButton>
                    <BaseButton size="sm" variant="secondary" @click="onToggleDetail(false)">
                        Cerrar
                    </BaseButton>
                </div>
            </template>
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

        <EditDeliveryAddressFlow v-model="openAddress" :order="order" @address-updated="emit('addressUpdated', $event)" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import EditDeliveryAddressFlow from '@/components/delivery/EditDeliveryAddressFlow.vue'

import { useOrdersDataStore } from '@/store/ordersData'
import { printJobsApi } from '@/services/MainAPI/printJobsApi'
import OrderDetailContent from '@/components/orders/OrderDetailContent.vue'
import type { OrderListItem } from '@/types/order'
import { useToast } from '@/composables/useToast'
import { PrinterIcon } from '@heroicons/vue/24/outline'

const { success, error: showError } = useToast()
interface Props { order: OrderListItem }
const props = defineProps<Props>()

const orderNotes = computed(() => (props.order.notes ?? '').trim())

const emit = defineEmits<{
    delivered: [orderId: number]
    addressUpdated: [payload: { orderId: number, addressDescription?: string, lat?: number, lng?: number }]
    openDetail: [orderId: number]
}>()

const openDetail = ref(false)
const openConfirmDelivered = ref(false)
const openAddress = ref(false)
const reprintLoading = ref(false)

const onReprint = async () => {
    const branchId = props.order.branchId
    if (!branchId) {
        showError('Sin sucursal', 'El pedido no tiene sucursal asociada.')
        return
    }
    reprintLoading.value = true
    try {
        const res = await printJobsApi.enqueueDeliveryJob(branchId, [props.order.id])
        if (!res.isSuccess) {
            showError('Reimpresión', res.message || 'No se pudo encolar el ticket.')
            return
        }
        success('Ticket en cola', 3500, 'El agente lo imprimirá en breve.')
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'No se pudo encolar la reimpresión.'
        showError('Reimpresión', msg)
    } finally {
        reprintLoading.value = false
    }
}

const ordersData = useOrdersDataStore()

const onToggleDetail = async (val: boolean) => {
    openDetail.value = val
    if (val) {
        try {
            await ordersData.fetchById(props.order.id)
        } catch { }
    }
}

const confirmDelivered = async () => {
    openConfirmDelivered.value = false
    openDetail.value = false
    await ordersData.updateStatus(props.order.id, 'delivered')

    success(`Pedido #${props.order.id} marcado como entregado`, 3000)

    emit('delivered', props.order.id)
}
</script>
