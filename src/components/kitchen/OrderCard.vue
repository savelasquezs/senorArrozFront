<template>
    <div :class="[
        'relative p-1.5 sm:p-2 rounded-lg border-2 transition-all duration-200',
        selectable ? 'cursor-pointer' : 'cursor-default',
        colorClass,
        selectable && isSelected
            ? 'ring-2 ring-emerald-500 scale-[1.02] shadow-lg'
            : selectable
                ? 'hover:shadow-md hover:scale-[1.01]'
                : '',
    ]" @click="handleClick">
        <div v-if="selectable && isSelected"
            class="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-emerald-500 rounded-full p-0.5">
            <CheckIcon class="w-3 h-3 text-white" />
        </div>

        <div class="flex items-center justify-between mb-1 sm:mb-1.5">
            <div class="flex items-center gap-1 sm:gap-1.5">
                <span class="text-base sm:text-lg font-bold text-gray-900">#{{ order.id }}</span>
                <BaseBadge :variant="getStatusVariant()"
                    class="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5">
                    {{ order.statusDisplayName }}
                </BaseBadge>
            </div>
            <component :is="orderTypeIcon"
                class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
        </div>

        <div class="mb-1 sm:mb-1.5 text-[10px] sm:text-xs">
            <div class="flex items-center gap-1 text-gray-700">
                <ClockIcon class="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span class="font-medium">Tiempo: {{ formattedElapsedTime }}</span>
            </div>

            <div v-if="variant === 'kitchen' && formattedPrepareAtStart"
                class="text-[10px] text-indigo-700 mt-0.5 font-medium">
                Cocina desde: {{ formattedPrepareAtStart }}
            </div>

            <div v-if="variant === 'kitchen' && readyByTime"
                class="text-[10px] text-emerald-600 mt-0.5 font-medium">
                Listo para: {{ formattedReadyByTime }}
            </div>

            <div v-if="variant === 'kitchen' && kitchenPickupName"
                class="flex items-start gap-1 text-[10px] sm:text-xs text-gray-700 mt-0.5">
                <UserIcon class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                <span class="font-medium break-words min-w-0">Recoge: {{ kitchenPickupName }}</span>
            </div>
        </div>

        <div v-if="orderNotesDisplay"
            class="mb-1 sm:mb-1.5 rounded-md bg-amber-50 border border-amber-100 px-1.5 py-1 sm:px-2 sm:py-1.5">
            <p class="text-[10px] font-semibold text-amber-900">Notas del pedido</p>
            <p class="text-[10px] text-gray-800 mt-0.5 whitespace-pre-wrap break-words">{{ orderNotesDisplay }}</p>
        </div>

        <!-- Contenido según variant -->
        <div v-if="variant === 'kitchen' && orderItems" class="space-y-0.5 sm:space-y-1">
            <div v-for="item in orderItems" :key="item.id" class="flex items-start gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
                <span v-if="item.quantity > 1"
                    class="inline-flex items-center justify-center min-w-[1.5rem] h-6 sm:min-w-[1.75rem] sm:h-7 px-1 rounded-full bg-orange-500 text-white text-[10px] sm:text-[11px] font-bold flex-shrink-0 ring-1 ring-orange-200/80 shadow-sm">
                    {{ item.quantity }}x
                </span>
                <span v-else class="font-bold text-emerald-600 min-w-[1.25rem] sm:min-w-6 flex-shrink-0">{{ item.quantity }}x</span>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 break-words" :title="item.productName">
                        {{ formatKitchenProductDisplayName(item.productName) }}
                    </p>
                    <p v-if="item.notes" class="text-[10px] text-gray-600 italic mt-0.5 break-words">
                        Nota: {{ item.notes }}</p>
                </div>
            </div>
        </div>

        <!-- Variant delivery: muestra dirección, barrio y cantidad de items -->
        <div v-else-if="variant === 'delivery'" class="space-y-1 sm:space-y-1.5 md:space-y-2">
            <!-- Dirección -->
            <div class="flex items-start gap-1 sm:gap-1.5 md:gap-2 text-[11px] sm:text-xs md:text-sm">
                <MapPinIcon class="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 break-words">
                        {{ order.addressDescription || 'En el local' }}
                    </p>
                    <p v-if="order.addressAdditionalInfo"
                        class="text-[10px] sm:text-xs text-gray-600 mt-0.5 break-words">
                        {{ order.addressAdditionalInfo }}
                    </p>
                    <p v-if="order.neighborhoodName" class="text-[10px] sm:text-xs text-gray-600 mt-0.5 break-words">
                        📍 {{ order.neighborhoodName }}
                    </p>
                </div>
            </div>

            <!-- Cliente o Guest -->
            <div v-if="deliveryRecipientName"
                class="flex items-start gap-1 sm:gap-1.5 md:gap-2 text-[11px] sm:text-xs md:text-sm">
                <UserIcon class="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <span class="text-gray-700 break-words min-w-0">{{ deliveryRecipientName }}</span>
            </div>

            <!-- Info adicional -->
            <div class="flex items-center justify-between text-[10px] sm:text-xs text-gray-600 gap-2">
                <span class="break-words truncate">Sucursal: {{ order.branchName }}</span>
                <span class="hidden sm:inline flex-shrink-0">{{ order.typeDisplayName }}</span>
            </div>

            <!-- Items (solo si tenemos orderItems) -->
            <div v-if="totalItems > 0"
                class="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[11px] sm:text-xs md:text-sm">
                <ShoppingBagIcon class="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                <span class="text-gray-700">{{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { OrderListItem, OrderDetailItem } from '@/types/order'
import { KitchenService } from '@/services/domain/KitchenService'
import { formatKitchenProductDisplayName } from '@/composables/useKitchenProductDisplayName'
import { defaultBusinessCalendar } from '@/utils/datetime'
import { orderListRecipientDisplayName } from '@/utils/orderRecipientDisplay'
import { ClockIcon, HomeIcon, TruckIcon, CalendarIcon, CheckIcon, MapPinIcon, ShoppingBagIcon, UserIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '@/components/ui/BaseBadge.vue'

interface Props {
    order: OrderListItem
    orderItems?: OrderDetailItem[]
    isSelected: boolean
    variant?: 'kitchen' | 'delivery'
    selectable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'kitchen',
    selectable: true
})

const emit = defineEmits<{ 'toggle-select': [orderId: number] }>()

const elapsedTime = ref(0)

let intervalId: number | null = null

const updateTimes = () => {
    elapsedTime.value = KitchenService.getElapsedTime(props.order)
}

const formattedElapsedTime = computed(() => KitchenService.formatElapsedTime(elapsedTime.value))
const colorClass = computed(() => KitchenService.getCardColorClass(props.order))

const readyByTime = computed(() => KitchenService.getReadyByTime(props.order))
const formattedReadyByTime = computed(() =>
    readyByTime.value ? KitchenService.formatReadyByTime(readyByTime.value) : ''
)

const formattedPrepareAtStart = computed(() => {
    if (props.variant !== 'kitchen' || props.order.type !== 'reservation' || !props.order.prepareAt) return ''
    const d = new Date(props.order.prepareAt as string)
    if (Number.isNaN(d.getTime())) return ''
    return defaultBusinessCalendar.formatWeekdayShortTime(d)
})

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

/** Nombre para mostrar en cocina en pedidos "en el local" (prioriza quien recibe / recoge). */
const kitchenPickupName = computed(() => {
    if (props.variant !== 'kitchen' || props.order.type !== 'onsite') return ''
    return orderListRecipientDisplayName(props.order)
})

const orderNotesDisplay = computed(() => (props.order.notes ?? '').trim())

const deliveryRecipientName = computed(() => orderListRecipientDisplayName(props.order))

const getStatusVariant = () => {
    if (props.order.status === 'taken') return 'warning'
    if (props.order.status === 'in_preparation') return 'info'
    if (props.order.status === 'ready') return 'success'
    return 'info'
}

const handleClick = () => {
    if (!props.selectable) return
    emit('toggle-select', props.order.id)
}

onMounted(() => {
    updateTimes()
    intervalId = window.setInterval(updateTimes, 1000)
})

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
})
</script>
