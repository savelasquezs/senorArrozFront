<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')" title="Confirmar cambio a Listo">
        <div class="space-y-4">
            <p class="text-gray-700">¿Estás seguro de marcar los siguientes pedidos como listos?</p>

            <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div v-for="order in orders" :key="order.id" class="mb-3 pb-3 border-b border-gray-200 last:border-0">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-lg text-gray-900">#{{ order.id }}</span>
                        <BaseBadge variant="info">{{ order.statusDisplayName }}</BaseBadge>
                    </div>
                    <div class="space-y-1">
                        <div v-for="item in getOrderItems(order.id)" :key="item.id" class="text-sm text-gray-600">
                            <span class="font-medium">{{ item.quantity }}x</span> {{ item.productName }}
                        </div>
                    </div>
                </div>
            </div>

            <p class="text-sm text-gray-500">Se imprimirá automáticamente la factura de cada pedido.</p>
        </div>

        <template #footer>
            <div class="flex gap-3 justify-end">
                <BaseButton @click="$emit('close')" variant="outline" :disabled="isLoading">
                    Cancelar
                </BaseButton>
                <BaseButton @click="confirmAndUpdate" variant="success" :loading="isLoading">
                    Confirmar y marcar como listos
                </BaseButton>
            </div>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OrderListItem, OrderDetailItem } from '@/types/order'
import { useOrdersDataStore } from '@/store/ordersData'
import { useToast } from '@/composables/useToast'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

interface Props {
    isOpen: boolean
    orders: OrderListItem[]
    orderItemsMap: Map<number, OrderDetailItem[]>
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [], updated: [] }>()

const ordersStore = useOrdersDataStore()
const { success, error } = useToast()
const isLoading = ref(false)

const getOrderItems = (orderId: number): OrderDetailItem[] => {
    return props.orderItemsMap.get(orderId) || []
}

const confirmAndUpdate = async () => {
    try {
        isLoading.value = true

        for (const order of props.orders) {
            await ordersStore.updateStatus(order.id, 'ready')
        }

        success(`${props.orders.length} pedido(s) marcado(s) como listos`, 5000)

        console.log('TODO: Imprimir facturas para pedidos:', props.orders.map(o => o.id))

        emit('updated')
        emit('close')
    } catch (err: any) {
        error('Error al cambiar estado', err.message)
    } finally {
        isLoading.value = false
    }
}
</script>
