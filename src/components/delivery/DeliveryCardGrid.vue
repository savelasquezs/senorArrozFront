<template>
    <div class="space-y-6">
        <div v-if="orders.length > 0" class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center gap-4">
                <button @click="selectAll" class="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    Seleccionar todos
                </button>
                <button @click="clearSelection" class="text-sm text-gray-600 hover:text-gray-700 font-medium">
                    Limpiar selección
                </button>
                <span v-if="selectedOrders.size > 0" class="text-sm text-gray-600">
                    {{ selectedOrders.size }} seleccionado(s)
                </span>
            </div>

            <BaseButton v-if="canAssign" @click="handleAssign" variant="primary" size="sm">
                <span class="flex items-center gap-2">
                    <TruckIcon class="w-4 h-4" />
                    Asignarme ({{ selectedOrders.size }})
                </span>
            </BaseButton>
        </div>

        <div v-if="orders.length > 0">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span class="w-3 h-3 bg-green-400 rounded-full"></span>
                Listos para Entrega ({{ orders.length }})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <OrderCard v-for="order in orders" :key="order.id" :order="order"
                    :is-selected="selectedOrders.has(order.id)" variant="delivery" @toggle-select="toggleSelect" />
            </div>
        </div>

        <div v-else class="text-center py-12">
            <CheckCircleIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500 text-lg">No hay pedidos disponibles</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { OrderListItem } from '@/types/order'
import OrderCard from '@/components/kitchen/OrderCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { TruckIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ assign: [orderIds: number[]] }>()

const selectedOrders = ref(new Set<number>())

const toggleSelect = (orderId: number) => {
    if (selectedOrders.value.has(orderId)) {
        selectedOrders.value.delete(orderId)
    } else {
        selectedOrders.value.add(orderId)
    }
}

const selectAll = () => {
    props.orders.forEach(order => selectedOrders.value.add(order.id))
}

const clearSelection = () => {
    selectedOrders.value.clear()
}

const canAssign = computed(() => selectedOrders.value.size > 0 && selectedOrders.value.size <= 10)

const handleAssign = () => {
    emit('assign', Array.from(selectedOrders.value))
}

defineExpose({ clearSelection })
</script>
