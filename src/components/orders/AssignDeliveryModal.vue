<template>
    <BaseDialog :model-value="open" :title="`Asignar Domiciliario - Pedido #${order.id}`"
        @update:model-value="(val) => !val && $emit('close')">
        <div class="space-y-10">
            <!-- Info del pedido -->
            <div class="bg-gray-50 rounded-lg p-4">

                <div v-if="order.deliveryManName" class=" text-sm">
                    <span class="text-gray-600">Domiciliario actual:</span>
                    <p class="text-gray-900 font-medium">{{ order.deliveryManName }}</p>
                </div>
            </div>

            <!-- Selector de domiciliario -->
            <BaseSelect v-model="selectedDeliveryManId" :options="deliverymanOptions" label="Domiciliario"
                placeholder="Seleccionar domiciliario..." :loading="loading" value-key="value" display-key="label">
                <template #icon>
                    <TruckIcon class="w-4 h-4" />
                </template>
            </BaseSelect>

            <p class="text-sm text-gray-500">
                Selecciona "Sin asignar" para quitar la asignación actual
            </p>
        </div>

        <template #footer>
            <BaseButton variant="secondary" @click="$emit('close')">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="loading || saving || selectedDeliveryManId === order.deliveryManId"
                @click="handleSave">
                {{ selectedDeliveryManId === null ? 'Desasignar' : 'Asignar' }}
            </BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { OrderListItem, Order, OrderStatus } from '@/types/order'
import { orderManagementApi } from '@/services/MainAPI/orderManagementApi'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { TruckIcon } from '@heroicons/vue/24/outline'

interface Props {
    open: boolean
    order: OrderListItem
    pendingStatusChange?: OrderStatus
}

const props = defineProps<Props>()

const emit = defineEmits<{
    close: []
    updated: [order?: Order]
    statusChanged: [status: OrderStatus]
}>()

const { success, error } = useToast()

// Estado
const loading = ref(false)
const saving = ref(false)
const deliverymen = ref<Array<{ id: number; name: string }>>([])
const selectedDeliveryManId = ref<number | null>(props.order.deliveryManId)

// Computed
const deliverymanOptions = computed<Array<{ value: number | null; label: string }>>(() => {
    const options: Array<{ value: number | null; label: string }> = [
        { value: null, label: 'Sin asignar' }
    ]

    deliverymen.value.forEach((user) => {
        options.push({
            value: user.id,
            label: user.name,
        })
    })

    return options
})

// Métodos
// Each open/order/sucursal context owns one options request. Late reads from
// an earlier dialog must never overwrite the current driver's choices.
let optionsVersion = 0
let contextVersion = 0
let saveVersion = 0
let optionsController: AbortController | null = null
let mounted = true

const cancelOptions = () => {
    optionsVersion++
    optionsController?.abort()
    optionsController = null
}

const fetchDeliverymen = async () => {
    const version = optionsVersion
    const orderId = props.order.id
    const branchId = props.order.branchId
    const controller = new AbortController()
    optionsController = controller
    loading.value = true
    deliverymen.value = []
    const current = () => mounted && props.open && !controller.signal.aborted
        && version === optionsVersion && props.order.id === orderId && props.order.branchId === branchId
    try {
        const response = await orderManagementApi.options(orderId, controller.signal)
        if (current()) deliverymen.value = response.deliverymen
    } catch (err: any) {
        // Closing, switching orders or aborting HTTP is not a user-visible failure.
        if (current()) error('Error al cargar domiciliarios', err.message || 'No se pudo consultar la lista')
    } finally {
        if (current()) loading.value = false
        if (optionsController === controller) optionsController = null
    }
}

const handleSave = async () => {
    if (saving.value || loading.value || !props.open || selectedDeliveryManId.value === props.order.deliveryManId) return
    const order = props.order
    const deliveryManId = selectedDeliveryManId.value
    const context = contextVersion
    const version = ++saveVersion
    const current = () => mounted && props.open && context === contextVersion && version === saveVersion
        && props.order.id === order.id && props.order.branchId === order.branchId
    saving.value = true
    try {
        let updatedOrder: Order
        if (deliveryManId === null) {
            updatedOrder = await orderApi.unassignDelivery(order.id, order)
        } else {
            // Ready → OnTheWay is performed by the backend; never send a second status mutation.
            updatedOrder = await orderApi.assignDelivery(order.id, deliveryManId, order)
        }
        // The mutation may have completed on the server after navigation; SignalR
        // will reconcile it. Do not emit a response into another order's modal.
        if (!current()) return
        const statusChangedByBackend = deliveryManId !== null && updatedOrder.status === 'on_the_way' && order.status === 'ready'
        if (deliveryManId === null) {
            success('Domiciliario desasignado', 5000, 'El domiciliario ha sido removido del pedido')
        } else if (statusChangedByBackend) {
            success('Domiciliario asignado', 5000, 'Domiciliario asignado y pedido en camino')
        } else {
            success('Domiciliario asignado', 5000, 'El domiciliario ha sido asignado al pedido')
        }
        emit('updated', updatedOrder)
        if (statusChangedByBackend) emit('statusChanged', 'on_the_way')
        emit('close')
    } catch (err: any) {
        if (current()) error('Error al asignar domiciliario', err.message || 'No se pudo actualizar el pedido')
    } finally {
        if (version === saveVersion) saving.value = false
    }
}

// A modal can be reused for another order without unmounting. One immediate
// watcher also avoids duplicate onMounted + watcher fetches.
watch(
    () => [props.open, props.order.id, props.order.branchId] as const,
    ([open]) => {
        contextVersion++
        saveVersion++
        saving.value = false
        cancelOptions()
        deliverymen.value = []
        loading.value = false
        selectedDeliveryManId.value = props.order.deliveryManId ?? null
        if (open) void fetchDeliverymen()
    },
    { immediate: true },
)

onBeforeUnmount(() => {
    mounted = false
    contextVersion++
    saveVersion++
    cancelOptions()
})
</script>
