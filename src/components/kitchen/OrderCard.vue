<template>
    <div :class="[
        'relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer',
        colorClass,
        isSelected ? 'ring-4 ring-emerald-500 scale-105 shadow-xl' : 'hover:shadow-lg hover:scale-102',
    ]" @click="$emit('toggle-select', order.id)">
        <div v-if="isSelected" class="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
            <CheckIcon class="w-4 h-4 text-white" />
        </div>

        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <span class="text-2xl font-bold text-gray-900">#{{ order.id }}</span>
                <BaseBadge :variant="getStatusVariant()">
                    {{ order.statusDisplayName }}
                </BaseBadge>
            </div>
            <component :is="orderTypeIcon" class="w-5 h-5 text-gray-400" />
        </div>

        <div class="mb-3 text-sm">
            <div class="flex items-center gap-2 text-gray-700">
                <ClockIcon class="w-4 h-4" />
                <span class="font-medium">Tiempo total: {{ formattedElapsedTime }}</span>
            </div>
            <div v-if="variant === 'kitchen'" class="text-xs text-gray-500 mt-1">
                En {{ order.statusDisplayName }}: {{ formattedElapsedInStatus }}
            </div>
        </div>

        <!-- Contenido según variant -->
        <div v-if="variant === 'kitchen' && orderItems" class="space-y-2">
            <div v-for="item in orderItems" :key="item.id" class="flex items-start gap-2 text-sm">
                <span class="font-bold text-emerald-600 min-w-[2rem]">{{ item.quantity }}x</span>
                <div class="flex-1">
                    <p class="font-medium text-gray-900">{{ item.productName }}</p>
                    <p v-if="item.notes" class="text-xs text-gray-600 italic mt-1">Nota: {{ item.notes }}</p>
                </div>
            </div>
        </div>

        <!-- Variant delivery: muestra dirección, barrio y cantidad de items -->
        <div v-else-if="variant === 'delivery'" class="space-y-2">
            <div class="flex items-start gap-2 text-sm">
                <MapPinIcon class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                    <p class="font-medium text-gray-900">{{ order.addressDescription }}</p>
                    <p v-if="order.neighborhoodName" class="text-xs text-gray-600 mt-1">
                        📍 {{ order.neighborhoodName }}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2 text-sm">
                <ShoppingBagIcon class="w-4 h-4 text-gray-500" />
                <span class="text-gray-700">{{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { OrderListItem, OrderDetailItem } from '@/types/order'
import { KitchenService } from '@/services/domain/KitchenService'
import { ClockIcon, HomeIcon, TruckIcon, CalendarIcon, CheckIcon, MapPinIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '@/components/ui/BaseBadge.vue'

interface Props {
    order: OrderListItem
    orderItems?: OrderDetailItem[]
    isSelected: boolean
    variant?: 'kitchen' | 'delivery'
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'kitchen'
})

defineEmits<{ 'toggle-select': [orderId: number] }>()

const elapsedTime = ref(0)
const elapsedInStatus = ref(0)
let intervalId: number | null = null

const updateTimes = () => {
    elapsedTime.value = KitchenService.getElapsedTime(props.order)
    elapsedInStatus.value = KitchenService.getElapsedTimeInCurrentStatus(props.order)
}

const formattedElapsedTime = computed(() => KitchenService.formatElapsedTime(elapsedTime.value))
const formattedElapsedInStatus = computed(() => KitchenService.formatElapsedTime(elapsedInStatus.value))
const colorClass = computed(() => KitchenService.getCardColorClass(props.order))

const orderTypeIcon = computed(() => {
    switch (props.order.type) {
        case 'onsite': return HomeIcon
        case 'delivery': return TruckIcon
        case 'reservation': return CalendarIcon
        default: return HomeIcon
    }
})

const totalItems = computed(() => {
    return props.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0
})

const getStatusVariant = () => {
    if (props.order.status === 'taken') return 'warning'
    if (props.order.status === 'in_preparation') return 'info'
    if (props.order.status === 'ready') return 'success'
    return 'info'
}

onMounted(() => {
    updateTimes()
    intervalId = window.setInterval(updateTimes, 1000)
})

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
})
</script>
