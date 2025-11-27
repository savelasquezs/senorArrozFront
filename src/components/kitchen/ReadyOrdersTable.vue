<template>
    <div class="space-y-3 sm:space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-base sm:text-lg font-semibold text-gray-900">Pedidos Listos ({{ orders.length }})</h3>
        </div>

        <div v-if="orders.length > 0" class="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Pedido</th>
                        <th class="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Productos</th>
                        <th class="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tiempo</th>
                        <th class="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50">
                        <td class="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div class="flex items-center gap-1.5 sm:gap-2">
                                <span class="text-base sm:text-lg font-bold text-gray-900">#{{ order.id }}</span>
                                <BaseBadge variant="success" class="text-[10px] sm:text-xs">Listo</BaseBadge>
                            </div>
                        </td>
                        <td class="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                            <div class="space-y-0.5 sm:space-y-1">
                                <div v-for="item in getOrderItems(order.id)" :key="item.id"
                                    class="text-xs sm:text-sm text-gray-600">
                                    <span class="font-medium">{{ item.quantity }}x</span> {{ item.productName }}
                                </div>
                            </div>
                        </td>
                        <td class="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {{ formatElapsedTime(order) }}
                        </td>
                        <td class="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <BaseButton @click="$emit('reprint', order.id)" variant="outline" size="sm">
                                <span class="flex items-center gap-1 sm:gap-2">
                                    <PrinterIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span class="hidden sm:inline">Reimprimir</span>
                                    <span class="sm:hidden">Impr.</span>
                                </span>
                            </BaseButton>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else class="text-center py-8 sm:py-12">
            <ClockIcon class="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p class="text-sm sm:text-base text-gray-500">No hay pedidos listos</p>
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
