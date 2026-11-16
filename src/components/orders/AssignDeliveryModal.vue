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
                placeholder="Seleccionar domiciliario..." :loading="loading" :disabled="!optionsLoaded || saving"
                value-key="value" display-key="label">
                <template #icon>
                    <TruckIcon class="w-4 h-4" />
                </template>
            </BaseSelect>

            <p v-if="optionsError" role="alert" class="text-sm text-red-700">
                {{ optionsError }}
                <button type="button" class="ml-2 underline" :disabled="loading || saving" @click="reloadOptions">Reintentar</button>
            </p>
            <p class="text-sm text-gray-500">
                Selecciona "Sin asignar" para quitar la asignación actual
            </p>
        </div>

        <template #footer>
            <BaseButton variant="secondary" @click="$emit('close')">
                Cancelar
            </BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="!optionsLoaded || loading || saving || selectedDeliveryManId === (order.deliveryManId ?? null)"
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
import { useAuthStore } from '@/store/auth'
import { useOrderAssignmentPendingStore } from '@/store/orderAssignmentPending'
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
const auth = useAuthStore()
const pendingAssignments = useOrderAssignmentPendingStore()
const sessionScope = computed(() => [auth.user?.id, auth.user?.role, auth.user?.branchId, auth.user?.accountType].join(':'))
const loading = ref(false), optionsLoaded = ref(false), optionsError = ref('')
const saving = computed(() => pendingAssignments.orderIds.has(props.order.id))
const deliverymen = ref<Array<{ id: number; name: string }>>([])
const selectedDeliveryManId = ref<number | null>(props.order.deliveryManId ?? null)
const deliverymanOptions = computed<Array<{ value: number | null; label: string }>>(() => [
    { value: null, label: 'Sin asignar' },
    ...deliverymen.value.map(user => ({ value: user.id, label: user.name })),
])

let optionsVersion = 0, contextVersion = 0
let optionsController: AbortController | null = null
let mounted = true
const cancelOptions = () => {
    optionsVersion++
    optionsController?.abort()
    optionsController = null
}
const fetchDeliverymen = async () => {
    const version = optionsVersion, owner = sessionScope.value
    const orderId = props.order.id, branchId = props.order.branchId
    const controller = new AbortController()
    optionsController = controller
    loading.value = true; optionsLoaded.value = false; optionsError.value = ''; deliverymen.value = []
    const current = () => mounted && props.open && !controller.signal.aborted && owner === sessionScope.value
        && version === optionsVersion && props.order.id === orderId && props.order.branchId === branchId
    try {
        const response = await orderManagementApi.options(orderId, controller.signal)
        if (!current()) return
        if (response.branchId != null && response.branchId !== branchId) throw new Error('La sucursal del pedido cambió. Actualiza el pedido.')
        deliverymen.value = response.deliverymen
        optionsLoaded.value = true
    } catch (err: any) {
        if (current()) {
            optionsError.value = err.message || 'No se pudo consultar la lista de domiciliarios.'
            error('Error al cargar domiciliarios', optionsError.value)
        }
    } finally {
        if (current()) loading.value = false
        if (optionsController === controller) optionsController = null
    }
}
function reloadOptions() {
    if (!mounted || !props.open || !auth.user || saving.value) return
    cancelOptions()
    void fetchDeliverymen()
}

const handleSave = async () => {
    if (!auth.user || saving.value || loading.value || !optionsLoaded.value || !props.open
        || selectedDeliveryManId.value === (props.order.deliveryManId ?? null)) return
    const deliveryManId = selectedDeliveryManId.value
    if (deliveryManId !== null && !deliverymen.value.some(user => user.id === deliveryManId)) return
    // Snapshot primitives before awaiting: later SignalR changes must not change the expected version.
    const order = { ...props.order }, context = contextVersion, owner = sessionScope.value
    const current = () => mounted && props.open && context === contextVersion && owner === sessionScope.value
        && props.order.id === order.id && props.order.branchId === order.branchId
    try {
        const updatedOrder = await pendingAssignments.run(order.id, () => deliveryManId === null
            ? orderApi.unassignDelivery(order.id, order)
            : orderApi.assignDelivery(order.id, deliveryManId, order))
        // A completed mutation remains on the server. Never cancel it or emit into another context.
        if (!updatedOrder || !current()) return
        const statusChangedByBackend = deliveryManId !== null && updatedOrder.status === 'on_the_way' && order.status === 'ready'
        if (deliveryManId === null) success('Domiciliario desasignado', 5000, 'El domiciliario ha sido removido del pedido')
        else if (statusChangedByBackend) success('Domiciliario asignado', 5000, 'Domiciliario asignado y pedido en camino')
        else success('Domiciliario asignado', 5000, 'El domiciliario ha sido asignado al pedido')
        emit('updated', updatedOrder)
        if (statusChangedByBackend) emit('statusChanged', 'on_the_way')
        emit('close')
    } catch (err: any) {
        if (current()) error('Error al asignar domiciliario', err.message || 'No se pudo actualizar el pedido')
    }
}

watch(
    () => [props.open, props.order.id, props.order.branchId, props.order.managementVersion,
        props.order.deliveryManId, props.order.status, sessionScope.value] as const,
    ([open]) => {
        contextVersion++
        cancelOptions()
        deliverymen.value = []; loading.value = false; optionsLoaded.value = false; optionsError.value = ''
        selectedDeliveryManId.value = props.order.deliveryManId ?? null
        if (open && auth.user) void fetchDeliverymen()
    },
    { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
    mounted = false; contextVersion++; cancelOptions()
})
</script>
