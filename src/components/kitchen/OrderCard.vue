<template>
    <div :class="[
        'relative p-3 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer',
        colorClass,
        isSelected ? 'ring-4 ring-emerald-500 scale-105 shadow-xl' : 'hover:shadow-lg hover:scale-102',
    ]" @click="$emit('toggle-select', order.id)">
        <div v-if="isSelected" class="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-emerald-500 rounded-full p-1">
            <CheckIcon class="w-3 h-3 md:w-4 md:h-4 text-white" />
        </div>

        <div class="flex items-center justify-between mb-2 md:mb-3">
            <div class="flex items-center gap-1.5 md:gap-2">
                <span class="text-xl md:text-2xl font-bold text-gray-900">#{{ order.id }}</span>
                <BaseBadge :variant="getStatusVariant()" class="text-xs md:text-sm">
                    {{ order.statusDisplayName }}
                </BaseBadge>
            </div>
            <component :is="orderTypeIcon" class="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
        </div>

        <div class="mb-2 md:mb-3 text-xs md:text-sm">
            <div class="flex items-center gap-1.5 md:gap-2 text-gray-700">
                <ClockIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span class="font-medium">Tiempo: {{ formattedElapsedTime }}</span>
            </div>
            <div v-if="variant === 'kitchen'" class="text-xs text-gray-500 mt-1 hidden md:block">
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
        <div v-else-if="variant === 'delivery'" class="space-y-1.5 md:space-y-2">
            <!-- Dirección -->
            <div class="flex items-start gap-1.5 md:gap-2 text-xs md:text-sm">
                <MapPinIcon class="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                    <p class="font-medium text-gray-900 break-words">
                        {{ order.addressDescription || 'En el local' }}
                    </p>
                    <p v-if="order.neighborhoodName" class="text-xs text-gray-600 mt-0.5">
                        📍 {{ order.neighborhoodName }}
                    </p>
                </div>
            </div>

            <!-- Cliente o Guest -->
            <div v-if="order.guestName" class="flex items-start gap-1.5 md:gap-2 text-xs md:text-sm">
                <UserIcon class="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <span class="text-gray-700 break-words">{{ order.guestName }}</span>
            </div>

            <!-- Info adicional -->
            <div class="flex items-center justify-between text-xs text-gray-600">
                <span class="break-words mr-1">Sucursal: {{ order.branchName }}</span>
                <span class="hidden sm:inline">{{ order.typeDisplayName }}</span>
            </div>

            <!-- Items (solo si tenemos orderItems) -->
            <div v-if="totalItems > 0" class="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                <ShoppingBagIcon class="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                <span class="text-gray-700">{{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { OrderListItem, OrderDetailItem } from '@/types/order'
import { KitchenService } from '@/services/domain/KitchenService'
import { ClockIcon, HomeIcon, TruckIcon, CalendarIcon, CheckIcon, MapPinIcon, ShoppingBagIcon, UserIcon } from '@heroicons/vue/24/outline'
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
