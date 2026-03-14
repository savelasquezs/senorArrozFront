<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="`Pedidos - ${deliverymanName}`" size="6xl">
        <div class="border rounded-lg overflow-hidden max-h-[70vh] overflow-y-auto">
            <OrdersTable :orders="orders" :loading="loading" />
        </div>
        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">Cerrar</BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OrderListItem } from '@/types/order'
import { deliverymanApi } from '@/services/MainAPI/deliverymanApi'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import OrdersTable from '@/components/orders/OrdersTable.vue'

interface Props {
    isOpen: boolean
    deliverymanId: number | null
    deliverymanName: string
    selectedDate: string
}

const props = defineProps<Props>()
defineEmits<{ 'close': [] }>()

const orders = ref<OrderListItem[]>([])
const loading = ref(false)

watch(() => [props.isOpen, props.deliverymanId], async ([open, id]) => {
    if (!open || id == null || typeof id !== 'number') {
        orders.value = []
        return
    }
    loading.value = true
    try {
        const res = await deliverymanApi.getOrders(id, {
            date: props.selectedDate,
            pageSize: 100
        })
        orders.value = res.items
    } finally {
        loading.value = false
    }
}, { immediate: true })
</script>
