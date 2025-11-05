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
import { computed } from 'vue'

import OrderDetailContent from '@/components/orders/OrderDetailContent.vue'

import { useOrdersDataStore } from '@/store/ordersData'



import MainLayout from '@/components/layout/MainLayout.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'




// Store
const ordersDataStore = useOrdersDataStore()

// Estado local (solo lo que no está en el store)

// Estado del store (reactivo)
const order = computed(() => ordersDataStore.current)
const loading = computed(() => ordersDataStore.isLoading)






// Métodos





// Helpers para actualización optimista




// Lifecycle

</script>
