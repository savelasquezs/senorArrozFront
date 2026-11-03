<template>
    <div class="contents">
        <div class="h-full overflow-y-auto p-3 sm:p-4">
            <div v-if="loading" class="flex justify-center items-center py-12"><BaseLoading size="lg" /></div>
            <div v-else-if="detailError" role="alert" class="p-4 text-red-700">
                {{ detailError }} <button class="ml-3 underline" @click="fetchOrderDetail">Reintentar</button>
            </div>
            <OrderDetailContent v-else-if="order" :flat-order="order" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import OrderDetailContent from '@/components/orders/OrderDetailContent.vue'
import { useOrdersDataStore } from '@/store/ordersData'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import type { OrderDetailView } from '@/types/order'

const ordersDataStore = useOrdersDataStore()
const route = useRoute()
const order = ref<OrderDetailView | null>(null)
// Shared store loading can belong to another consumer; keep this view's state local.
const loading = ref(false)
const detailError = ref('')
let detailRequest = 0
let pendingDetail: AbortController | null = null

const fetchOrderDetail = async () => {
    const request = ++detailRequest
    pendingDetail?.abort()
    const controller = new AbortController()
    pendingDetail = controller
    order.value = null
    detailError.value = ''
    loading.value = true
    try {
        const orderId = Number(route.params.id)
        if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error('Identificador de pedido no válido.')
        await ordersDataStore.fetchById(orderId, undefined, controller.signal)
        if (request === detailRequest && !controller.signal.aborted) {
            const loaded = ordersDataStore.current
            if (loaded?.id === orderId) order.value = loaded
            else detailError.value = 'No se pudo cargar el pedido solicitado.'
        }
    } catch (err: unknown) {
        if (request === detailRequest && !controller.signal.aborted) {
            detailError.value = err instanceof Error ? err.message : 'No se pudo cargar el pedido.'
        }
    } finally {
        if (pendingDetail === controller) pendingDetail = null
        if (request === detailRequest && !controller.signal.aborted) loading.value = false
    }
}

watch(() => route.params.id, () => { void fetchOrderDetail() }, { immediate: true })
onBeforeUnmount(() => {
    detailRequest++
    pendingDetail?.abort()
    pendingDetail = null
})
</script>
