<template>
    <MainLayout no-card>
        <div class="h-full overflow-y-auto p-3 sm:p-4">
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <BaseLoading size="lg" />
        </div>



        <div v-if="detailError" role="alert" class="p-4 text-red-700">
            {{ detailError }}
            <button class="ml-3 underline" @click="fetchOrderDetail">Reintentar</button>
        </div>
        <!-- Order detail -->
        <OrderDetailContent v-else-if="order" :flat-order="order" />
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRoute } from 'vue-router'

import OrderDetailContent from '@/components/orders/OrderDetailContent.vue'

import { useOrdersDataStore } from '@/store/ordersData'



import MainLayout from '@/components/layout/MainLayout.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

import type { OrderDetailView } from '@/types/order'



// Store
const ordersDataStore = useOrdersDataStore()
const route = useRoute()

// Estado local (solo lo que no está en el store)

// Estado del store (reactivo)
const order = ref<OrderDetailView | null>(null)
const loading = computed(() => ordersDataStore.isLoading)

const detailError = ref('')
let detailRequest = 0
const fetchOrderDetail = async () => {
    const request = ++detailRequest
    order.value = null
    detailError.value = ''
    try {
        const orderId = parseInt(route.params.id as string)
        await ordersDataStore.fetchById(orderId)
        if (request === detailRequest) order.value = ordersDataStore.current
        // editableGuestName.value = order.value?.guestName || ''
        // editableNotes.value = order.value?.notes || ''
    } catch (err: any) {
        if (request === detailRequest) detailError.value = err.message || 'No se pudo cargar el pedido.'
    }
}
watch(() => route.params.id, () => { void fetchOrderDetail() }, { immediate: true })





// Métodos





// Helpers para actualización optimista




// Lifecycle

</script>
