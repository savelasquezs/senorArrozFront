<template>
    <MainLayout>
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <BaseLoading size="lg" />
        </div>



        <!-- Order detail -->
        <OrderDetailContent v-else-if="order" :flat-order="order" />
    </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

const fetchOrderDetail = async () => {
    try {
        const orderId = parseInt(route.params.id as string)
        await ordersDataStore.fetchById(orderId)
        order.value = ordersDataStore.current
        // editableGuestName.value = order.value?.guestName || ''
        // editableNotes.value = order.value?.notes || ''
    } catch (err: any) {
        console.error('Error loading order:', err)
    }
}
onMounted(async () => {
    await Promise.all([
        fetchOrderDetail(),
        // loadPaymentData()
    ])

    // Cargar cliente completo si hay customerId (después de que fetchOrderDetail termine)
    if (order.value?.customerId) {
        // await loadCustomer(order.value.customerId)
    }
})





// Métodos





// Helpers para actualización optimista




// Lifecycle

</script>
