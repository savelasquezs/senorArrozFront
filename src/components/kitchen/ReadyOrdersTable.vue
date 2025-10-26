<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Pedidos Listos ({{ orders.length }})</h3>
        </div>

        <div v-if="orders.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-2">
                                <span class="text-lg font-bold text-gray-900">#{{ order.id }}</span>
                                <BaseBadge variant="success">Listo</BaseBadge>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="space-y-1">
                                <div v-for="item in getOrderItems(order.id)" :key="item.id"
                                    class="text-sm text-gray-600">
                                    <span class="font-medium">{{ item.quantity }}x</span> {{ item.productName }}
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ formatElapsedTime(order) }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <BaseButton @click="$emit('reprint', order.id)" variant="outline" size="sm">
                                <span class="flex items-center gap-2">
                                    <PrinterIcon class="w-4 h-4" />
                                    Reimprimir
                                </span>
                            </BaseButton>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else class="text-center py-12">
            <ClockIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500">No hay pedidos listos</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { OrderListItem, OrderDetailItem } from '@/types/order'
import { KitchenService } from '@/services/domain/KitchenService'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { PrinterIcon, ClockIcon } from '@heroicons/vue/24/outline'

interface Props {
    orders: OrderListItem[]
    orderItemsMap: Map<number, OrderDetailItem[]>
}

const props = defineProps<Props>()
defineEmits<{ reprint: [orderId: number] }>()

const getOrderItems = (orderId: number): OrderDetailItem[] => {
    return props.orderItemsMap.get(orderId) || []
}

const formatElapsedTime = (order: OrderListItem): string => {
    const elapsed = KitchenService.getElapsedTime(order)
    return KitchenService.formatElapsedTime(elapsed)
}
</script>
